import { notFound } from "next/navigation"
import { createServerSupabaseClient } from "./supabase"
import { mockDb } from "./mock-data"
import { cache } from "react"

export type Project = {
  id: string
  title: string
  description: string
  status: "planning" | "active" | "completed"
  taskCount: number
  created_at?: string
  updated_at?: string
}

export type Task = {
  id: string
  projectId: string
  title: string
  description: string
  status: "todo" | "in-progress" | "review" | "done"
  priority: "low" | "medium" | "high"
  assignee?: {
    name: string
    initials: string
  }
  dueDate?: string
  comments: number
  tags?: string[]
  customFields?: Record<string, any>
  created_at?: string
  updated_at?: string
  order?: number // Ensure order is included in the type
}

export type CustomField = {
  id: string
  projectId: string
  name: string
  type: "text" | "number" | "date" | "select" | "checkbox" | "url"
  options?: string[]
  isRequired: boolean
}

// Add memory cache for projects and tasks at the top of the file
const projectCache = new Map<string, any>()
const taskCache = new Map<string, Task[]>()

// Check if we should use the mock database instead of real database
// This is useful for environments where the database might not be accessible
const USE_MOCK_DB = process.env.NODE_ENV === "development" && process.env.USE_MOCK_DB === "true"

/**
 * Helper function that safely attempts to connect to Supabase,
 * but falls back to mock data if connection fails
 */
async function safeDbOperation<T>(operation: () => Promise<T>, mockOperation: () => Promise<T>): Promise<T> {
  // If mock DB mode is enabled, use the mock implementation directly
  if (USE_MOCK_DB) {
    return mockOperation()
  }

  try {
    return await operation()
  } catch (error) {
    console.error("Database operation failed, using mock data:", error)
    return mockOperation()
  }
}

// Helper function to add a new project
export async function addProject(project: Omit<Project, "id" | "taskCount">) {
  return safeDbOperation(
    async () => {
      const supabase = createServerSupabaseClient()

      const { data, error } = await supabase
        .from("projects")
        .insert({
          title: project.title,
          description: project.description,
          status: project.status,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating project:", error)
        throw new Error(`Failed to create project: ${error.message}`)
      }

      return {
        ...data,
        taskCount: 0,
      }
    },
    () => mockDb.addProject(project),
  )
}

// Helper function to add a new task with order
export async function addTask(task: Omit<Task, "id" | "comments">) {
  return safeDbOperation(
    async () => {
      const supabase = createServerSupabaseClient()

      // Get the highest order value for the project to place new task at the end
      const { data: maxOrderData } = await supabase
        .from("tasks")
        .select("order")
        .eq("project_id", task.projectId)
        .order("order", { ascending: false })
        .limit(1)

      const nextOrder =
        maxOrderData && maxOrderData.length > 0 && maxOrderData[0].order !== null ? maxOrderData[0].order + 1 : 0

      // First, insert the task with the order
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .insert({
          project_id: task.projectId,
          title: task.title,
          description: task.description || "",
          status: task.status || "todo",
          priority: task.priority || "medium",
          assignee_name: task.assignee?.name,
          assignee_initials: task.assignee?.initials,
          due_date: task.dueDate,
          order: nextOrder, // Set the order for the new task
        })
        .select()
        .single()

      if (taskError) {
        console.error("Error creating task:", taskError)
        throw new Error(`Failed to create task: ${taskError.message}`)
      }

      // If there are tags, handle them
      if (task.tags && task.tags.length > 0) {
        // First, ensure all tags exist in the tags table
        for (const tagName of task.tags) {
          // Try to insert the tag, ignore if it already exists
          await supabase.from("tags").upsert({ name: tagName }, { onConflict: "name" })
        }

        // Get the tag IDs
        const { data: tagData } = await supabase.from("tags").select("id, name").in("name", task.tags)

        if (tagData && tagData.length > 0) {
          // Create task-tag associations
          const taskTagInserts = tagData.map((tag) => ({
            task_id: taskData.id,
            tag_id: tag.id,
          }))

          await supabase.from("task_tags").insert(taskTagInserts)
        }
      }

      // If there are custom fields, handle them
      if (task.customFields && Object.keys(task.customFields).length > 0) {
        const customFieldInserts = Object.entries(task.customFields).map(([fieldId, value]) => ({
          task_id: taskData.id,
          field_id: fieldId,
          value,
        }))

        await supabase.from("task_custom_field_values").insert(customFieldInserts)
      }

      // Clear the task cache for this project
      taskCache.delete(task.projectId)

      // Return the task with the format expected by the frontend
      return {
        id: taskData.id,
        projectId: taskData.project_id,
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        assignee: taskData.assignee_name
          ? {
              name: taskData.assignee_name,
              initials: taskData.assignee_initials,
            }
          : undefined,
        dueDate: taskData.due_date,
        comments: 0,
        tags: task.tags,
        customFields: task.customFields,
        created_at: taskData.created_at,
        updated_at: taskData.updated_at,
        order: taskData.order, // Include order in the returned task
      }
    },
    () => mockDb.addTask(task),
  )
}

// Function to get all projects
export async function getProjects() {
  const supabase = createServerSupabaseClient()

  try {
    console.log("正在从 Supabase 获取项目列表...")

    // 尝试从 projects_with_task_counts 视图获取数据
    const { data, error } = await supabase
      .from("projects_with_task_counts")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("从 projects_with_task_counts 视图获取项目时出错:", error)

      // 如果视图不存在，尝试直接从 projects 表获取
      console.log("尝试从 projects 表直接获取数据...")
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })

      if (projectsError) {
        console.error("从 projects 表获取项目时出错:", projectsError)
        throw new Error(`获取项目失败: ${projectsError.message}`)
      }

      // 手动计算每个项目的任务数量
      const projectsWithCounts = await Promise.all(
        projectsData.map(async (project) => {
          const { count } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("project_id", project.id)

          return {
            ...project,
            taskCount: count || 0,
          }
        }),
      )

      return projectsWithCounts
    }

    // 如果成功从视图获取数据，格式化返回结果
    return data.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      taskCount: project.task_count || 0,
      created_at: project.created_at,
      updated_at: project.updated_at,
    }))
  } catch (error) {
    console.error("获取项目列表时出错:", error)

    // 如果所有尝试都失败，返回空数组而不是抛出错误
    console.log("返回空项目列表作为后备方案")
    return []
  }
}

// Cache the getProject function to avoid duplicate requests
export const getProject = cache(async (id: string) => {
  return safeDbOperation(
    async () => {
      const supabase = createServerSupabaseClient()

      // Check if we have the project in memory cache first
      const cachedProject = projectCache.get(id)
      if (cachedProject) {
        return cachedProject
      }

      const { data, error } = await supabase.from("projects_with_task_counts").select("*").eq("id", id).single()

      if (error) {
        console.error(`Error fetching project ${id}:`, error)
        notFound()
      }

      const project = {
        id: data.id,
        title: data.title,
        description: data.description,
        status: data.status,
        taskCount: data.task_count,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }

      // Store in memory cache
      projectCache.set(id, project)

      return project
    },
    () => mockDb.getProject(id),
  )
})

// Get tasks for a project with efficient caching
export const getProjectTasks = cache(async (projectId: string) => {
  return safeDbOperation(
    async () => {
      const supabase = createServerSupabaseClient()

      // Check memory cache
      const cachedTasks = taskCache.get(projectId)
      if (cachedTasks) {
        return cachedTasks
      }

      // In parallel, fetch tasks, tags, and custom field values
      const [tasksResponse, tagsResponse, customFieldsResponse] = await Promise.all([
        // Get basic task info
        supabase
          .from("tasks")
          .select("*")
          .eq("project_id", projectId)
          .order("order", { ascending: true }),

        // Get all task tags
        supabase
          .from("task_tags")
          .select("task_id, tags(id, name)")
          .eq("task_id.project_id", projectId),

        // Get all custom field values
        supabase
          .from("task_custom_field_values")
          .select("task_id, field_id, value")
          .eq("task_id.project_id", projectId),
      ])

      const tasksData = tasksResponse.data || []
      const tagsData = tagsResponse.data || []
      const customFieldsData = customFieldsResponse.data || []

      // If no tasks, return empty array
      if (tasksData.length === 0) {
        const emptyTasks: Task[] = []
        taskCache.set(projectId, emptyTasks)
        return emptyTasks
      }

      // Pre-process tags and custom fields data
      const taskTags: Record<string, string[]> = {}
      const taskCustomFields: Record<string, Record<string, any>> = {}

      // Process tags data
      tagsData.forEach((item) => {
        const taskId = item.task_id
        const tagName = item.tags?.name

        if (tagName) {
          if (!taskTags[taskId]) {
            taskTags[taskId] = []
          }
          taskTags[taskId].push(tagName)
        }
      })

      // Process custom fields data
      customFieldsData.forEach((item) => {
        const taskId = item.task_id
        const fieldId = item.field_id
        const value = item.value

        if (!taskCustomFields[taskId]) {
          taskCustomFields[taskId] = {}
        }
        taskCustomFields[taskId][fieldId] = value
      })

      // Format tasks data
      const formattedTasks = tasksData.map((task) => ({
        id: task.id,
        projectId: task.project_id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee_name
          ? {
              name: task.assignee_name,
              initials: task.assignee_initials,
            }
          : undefined,
        dueDate: task.due_date,
        comments: task.comments || 0,
        tags: taskTags[task.id] || [],
        customFields: taskCustomFields[task.id] || {},
        created_at: task.created_at,
        updated_at: task.updated_at,
        order: task.order,
      }))

      // Store in memory cache
      taskCache.set(projectId, formattedTasks)

      return formattedTasks
    },
    () => mockDb.getProjectTasks(projectId),
  )
})

// Get a specific task
export async function getTask(id: string) {
  return safeDbOperation(
    async () => {
      const supabase = createServerSupabaseClient()

      // Get the task
      const { data: task, error: taskError } = await supabase.from("tasks").select("*").eq("id", id).single()

      if (taskError) {
        console.error(`Error fetching task ${id}:`, taskError)
        notFound()
      }

      // Get the tags for this task
      const { data: tagsData } = await supabase.from("task_tags").select("tags(name)").eq("task_id", id)

      const tags = (tagsData?.map((item) => item.tags?.name).filter(Boolean) as string[]) || []

      // Get custom field values
      const { data: customFieldsData } = await supabase
        .from("task_custom_field_values")
        .select("field_id, value")
        .eq("task_id", id)

      const customFields: Record<string, any> = {}
      customFieldsData?.forEach((item) => {
        customFields[item.field_id] = item.value
      })

      // Format the task for the frontend
      return {
        id: task.id,
        projectId: task.project_id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee_name
          ? {
              name: task.assignee_name,
              initials: task.assignee_initials,
            }
          : undefined,
        dueDate: task.due_date,
        comments: task.comments || 0,
        tags,
        customFields,
        created_at: task.created_at,
        updated_at: task.updated_at,
        order: task.order,
      }
    },
    () => mockDb.getTask(id),
  )
}

// Update a task with optimized performance
export async function updateTask(id: string, taskData: Partial<Task>) {
  return safeDbOperation(
    async () => {
      const supabase = createServerSupabaseClient()

      // Only include fields that are actually provided in the update
      const updateFields: Record<string, any> = {}

      if (taskData.title !== undefined) updateFields.title = taskData.title
      if (taskData.description !== undefined) updateFields.description = taskData.description
      if (taskData.status !== undefined) updateFields.status = taskData.status
      if (taskData.priority !== undefined) updateFields.priority = taskData.priority
      if (taskData.dueDate !== undefined) updateFields.due_date = taskData.dueDate
      if (taskData.comments !== undefined) updateFields.comments = taskData.comments
      if (taskData.order !== undefined) updateFields.order = taskData.order

      // Handle assignee specially
      if (taskData.assignee !== undefined) {
        updateFields.assignee_name = taskData.assignee?.name
        updateFields.assignee_initials = taskData.assignee?.initials
      }

      // Only perform the update if there are fields to update
      let updatedTask
      if (Object.keys(updateFields).length > 0) {
        // Update the task
        const { data, error } = await supabase.from("tasks").update(updateFields).eq("id", id).select().single()

        if (error) {
          console.error(`Error updating task ${id}:`, error)
          throw new Error(`Failed to update task: ${error.message}`)
        }

        updatedTask = data
      } else {
        // If no basic fields to update, fetch the current task
        const { data, error } = await supabase.from("tasks").select("*").eq("id", id).single()

        if (error) {
          console.error(`Error fetching task ${id}:`, error)
          throw new Error(`Failed to fetch task: ${error.message}`)
        }

        updatedTask = data
      }

      // Handle tags update in parallel if needed
      let tagsPromise = Promise.resolve()
      if (taskData.tags !== undefined) {
        tagsPromise = (async () => {
          // First, delete existing tag associations
          await supabase.from("task_tags").delete().eq("task_id", id)

          // Then, add new ones if there are any
          if (taskData.tags && taskData.tags.length > 0) {
            // Ensure all tags exist
            const tagPromises = taskData.tags.map((tagName) =>
              supabase.from("tags").upsert({ name: tagName }, { onConflict: "name" }),
            )
            await Promise.all(tagPromises)

            // Get the tag IDs
            const { data: tagData } = await supabase.from("tags").select("id, name").in("name", taskData.tags)

            if (tagData && tagData.length > 0) {
              // Create task-tag associations
              const taskTagInserts = tagData.map((tag) => ({
                task_id: id,
                tag_id: tag.id,
              }))

              await supabase.from("task_tags").insert(taskTagInserts)
            }
          }
        })()
      }

      // Handle custom fields update in parallel if needed
      let customFieldsPromise = Promise.resolve()
      if (taskData.customFields !== undefined) {
        customFieldsPromise = (async () => {
          // First, delete existing custom field values
          await supabase.from("task_custom_field_values").delete().eq("task_id", id)

          // Then, add new ones if there are any
          if (taskData.customFields && Object.keys(taskData.customFields).length > 0) {
            const customFieldInserts = Object.entries(taskData.customFields).map(([fieldId, value]) => ({
              task_id: id,
              field_id: fieldId,
              value,
            }))

            await supabase.from("task_custom_field_values").insert(customFieldInserts)
          }
        })()
      }

      // Wait for all parallel operations to complete
      await Promise.all([tagsPromise, customFieldsPromise])

      // Clear the task cache for this project
      if (updatedTask.project_id) {
        taskCache.delete(updatedTask.project_id)
      }

      // Get the updated task with all its related data
      return getTask(id)
    },
    () => mockDb.updateTask(id, taskData),
  )
}

// Delete a task
export async function deleteTask(id: string) {
  return safeDbOperation(
    async () => {
      const supabase = createServerSupabaseClient()

      // First get the project ID to clear cache later
      const { data: task } = await supabase.from("tasks").select("project_id").eq("id", id).single()
      const projectId = task?.project_id

      const { error } = await supabase.from("tasks").delete().eq("id", id)

      if (error) {
        console.error(`Error deleting task ${id}:`, error)
        throw new Error(`Failed to delete task: ${error.message}`)
      }

      // Clear the task cache for this project
      if (projectId) {
        taskCache.delete(projectId)
      }

      return { success: true }
    },
    () => mockDb.deleteTask(id),
  )
}

// Get custom fields for a project
export async function getProjectCustomFields(projectId: string) {
  return safeDbOperation(
    async () => {
      const supabase = createServerSupabaseClient()

      const { data, error } = await supabase.from("custom_fields").select("*").eq("project_id", projectId)

      if (error) {
        console.error(`Error fetching custom fields for project ${projectId}:`, error)
        throw new Error(`Failed to fetch custom fields: ${error.message}`)
      }

      return data.map((field) => ({
        id: field.id,
        projectId: field.project_id,
        name: field.name,
        type: field.type,
        options: field.options,
        isRequired: field.is_required,
        isMulti: field.is_multi,
      }))
    },
    () => mockDb.getProjectCustomFields(projectId),
  )
}

// Add a custom field to a project
export async function addCustomField(field: Omit<CustomField, "id">) {
  return safeDbOperation(
    async () => {
      const supabase = createServerSupabaseClient()

      const { data, error } = await supabase
        .from("custom_fields")
        .insert({
          project_id: field.projectId,
          name: field.name,
          type: field.type,
          options: field.options,
          is_required: field.isRequired,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating custom field:", error)
        throw new Error(`Failed to create custom field: ${error.message}`)
      }

      return {
        id: data.id,
        projectId: data.project_id,
        name: data.name,
        type: data.type,
        options: data.options,
        isRequired: data.is_required,
      }
    },
    () => mockDb.addCustomField(field),
  )
}

// Delete a custom field
export async function deleteCustomField(id: string) {
  return safeDbOperation(
    async () => {
      const supabase = createServerSupabaseClient()

      const { error } = await supabase.from("custom_fields").delete().eq("id", id)

      if (error) {
        console.error(`Error deleting custom field ${id}:`, error)
        throw new Error(`Failed to delete custom field: ${error.message}`)
      }

      return { success: true }
    },
    () => mockDb.deleteCustomField(id),
  )
}

// Get the task count for a specific project
export async function getProjectTaskCount(projectId: string) {
  return safeDbOperation(
    async () => {
      const supabase = createServerSupabaseClient()

      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)

      if (error) {
        console.error(`Error getting task count for project ${projectId}:`, error)
        throw new Error(`Failed to get task count: ${error.message}`)
      }

      return count || 0
    },
    async () => {
      const tasks = await mockDb.getProjectTasks(projectId)
      return tasks.length
    },
  )
}

// Improved function to handle task reordering
export async function reorderTasks(taskIds: string[], newOrders: number[]) {
  return safeDbOperation(
    async () => {
      const supabase = createServerSupabaseClient()

      // Get the project ID for cache invalidation
      let projectId = null
      if (taskIds.length > 0) {
        const { data } = await supabase.from("tasks").select("project_id").eq("id", taskIds[0]).single()
        if (data) {
          projectId = data.project_id
        }
      }

      // Update each task's order in a transaction
      const promises = taskIds.map((taskId, index) => {
        return supabase.from("tasks").update({ order: newOrders[index] }).eq("id", taskId)
      })

      await Promise.all(promises)

      // Clear task cache for the affected project
      if (projectId) {
        taskCache.delete(projectId)
      }

      return { success: true }
    },
    () => mockDb.reorderTasks(taskIds, newOrders),
  )
}

// Update a project
export async function updateProject(id: string, projectData: Partial<Project>) {
  return safeDbOperation(
    async () => {
      const supabase = createServerSupabaseClient()

      // Only include fields that are actually provided in the update
      const updateFields: Record<string, any> = {}

      if (projectData.title !== undefined) updateFields.title = projectData.title
      if (projectData.description !== undefined) updateFields.description = projectData.description
      if (projectData.status !== undefined) updateFields.status = projectData.status

      // Add updated_at timestamp
      updateFields.updated_at = new Date().toISOString()

      const { data, error } = await supabase.from("projects").update(updateFields).eq("id", id).select().single()

      if (error) {
        console.error(`Error updating project ${id}:`, error)
        throw new Error(`Failed to update project: ${error.message}`)
      }

      // Clear project cache
      projectCache.delete(id)

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        status: data.status,
        taskCount: await getProjectTaskCount(id),
        created_at: data.created_at,
        updated_at: data.updated_at,
      }
    },
    () => mockDb.updateProject(id, projectData),
  )
}

// Delete a project and all its tasks
export async function deleteProject(id: string) {
  return safeDbOperation(
    async () => {
      const supabase = createServerSupabaseClient()

      // Delete the project (cascade delete should handle related tasks)
      const { error } = await supabase.from("projects").delete().eq("id", id)

      if (error) {
        console.error(`Error deleting project ${id}:`, error)
        throw new Error(`Failed to delete project: ${error.message}`)
      }

      // Clear caches
      projectCache.delete(id)
      taskCache.delete(id)

      return { success: true }
    },
    () => mockDb.deleteProject(id),
  )
}
