import { notFound } from "next/navigation"
import { createServerSupabaseClient } from "./supabase-server"
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
  isMulti?: boolean
}

// 使用 LRU 缓存来限制内存使用
class LRUCache<K, V> {
  private capacity: number
  private cache: Map<K, V>

  constructor(capacity: number) {
    this.capacity = capacity
    this.cache = new Map()
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined

    // 获取值
    const value = this.cache.get(key)

    // 刷新位置（删除并重新添加到最后）
    this.cache.delete(key)
    this.cache.set(key, value!)

    return value
  }

  put(key: K, value: V): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    // 如果达到容量上限，删除最早的条目
    else if (this.cache.size >= this.capacity) {
      this.cache.delete(this.cache.keys().next().value)
    }

    // 添加新条目
    this.cache.set(key, value)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}

// 替换简单的 Map 缓存为 LRU 缓存
const projectCache = new LRUCache<string, any>(50) // 最多缓存50个项目
const taskCache = new LRUCache<string, Task[]>(50) // 最多缓存50个项目的任务

// 添加缓存过期机制
const cacheExpiry = new Map<string, number>()
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存过期时间

// 检查缓存是否过期
function isCacheExpired(key: string): boolean {
  const expiryTime = cacheExpiry.get(key)
  if (!expiryTime) return true
  return Date.now() > expiryTime
}

// 设置缓存过期时间
function setCacheExpiry(key: string): void {
  cacheExpiry.set(key, Date.now() + CACHE_TTL)
}

// 清除过期缓存
function clearExpiredCache(): void {
  const now = Date.now()
  for (const [key, expiry] of cacheExpiry.entries()) {
    if (now > expiry) {
      cacheExpiry.delete(key)
      const [type, id] = key.split(":")
      if (type === "project") projectCache.delete(id)
      if (type === "tasks") taskCache.delete(id)
    }
  }
}

// 定期清理过期缓存
if (typeof window !== "undefined") {
  const cleanupInterval = setInterval(clearExpiredCache, 60000) // 每分钟清理一次
}

// 重新添加 getProjects 函数
export async function getProjects() {
  const supabase = createServerSupabaseClient()
  const cacheKey = "projects:all"

  // 检查缓存是否有效
  if (!isCacheExpired(cacheKey)) {
    const cachedProjects = projectCache.get("all")
    if (cachedProjects) {
      return cachedProjects
    }
  }

  const { data, error } = await supabase
    .from("projects_with_task_counts")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching projects:", error)
    throw new Error(`Failed to fetch projects: ${error.message}`)
  }

  const projects = data.map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    taskCount: project.task_count,
    created_at: project.created_at,
    updated_at: project.updated_at,
  }))

  // 存入缓存
  projectCache.put("all", projects)
  setCacheExpiry(cacheKey)

  return projects
}

// 优化 getProject 函数
export const getProject = cache(async (id: string) => {
  const supabase = createServerSupabaseClient()
  const cacheKey = `project:${id}`

  // 检查缓存是否有效
  if (!isCacheExpired(cacheKey)) {
    const cachedProject = projectCache.get(id)
    if (cachedProject) {
      return cachedProject
    }
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

  // 存入缓存
  projectCache.put(id, project)
  setCacheExpiry(cacheKey)

  return project
})

// 优化 getProjectTasks 函数
export const getProjectTasks = cache(async (projectId: string) => {
  const supabase = createServerSupabaseClient()
  const cacheKey = `tasks:${projectId}`

  // 检查缓存是否有效
  if (!isCacheExpired(cacheKey)) {
    const cachedTasks = taskCache.get(projectId)
    if (cachedTasks) {
      return cachedTasks
    }
  }

  // 使用分页查询优化大型数据集
  const PAGE_SIZE = 100
  let allTasks: any[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("order", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error) {
      console.error(`Error fetching tasks for project ${projectId}:`, error)
      throw new Error(`Failed to fetch tasks: ${error.message}`)
    }

    if (!data || data.length === 0) {
      hasMore = false
    } else {
      allTasks = [...allTasks, ...data]
      page++

      // 如果返回的数据少于页面大小，说明已经到达末尾
      if (data.length < PAGE_SIZE) {
        hasMore = false
      }
    }
  }

  // 如果没有任务，返回空数组
  if (allTasks.length === 0) {
    const emptyTasks: Task[] = []
    taskCache.put(projectId, emptyTasks)
    setCacheExpiry(cacheKey)
    return emptyTasks
  }

  // 获取任务ID列表
  const taskIds = allTasks.map((task) => task.id)

  // 使用批处理查询优化标签和自定义字段获取
  const taskTags: Record<string, string[]> = {}
  const taskCustomFields: Record<string, Record<string, any>> = {}

  // 使用批处理查询，每次处理最多50个任务
  const BATCH_SIZE = 50
  for (let i = 0; i < taskIds.length; i += BATCH_SIZE) {
    const batchIds = taskIds.slice(i, i + BATCH_SIZE)

    // 并行获取标签和自定义字段
    await Promise.all([
      // 获取标签
      (async () => {
        const { data: tagsData } = await supabase
          .from("task_tags")
          .select("task_id, tags(name)")
          .in("task_id", batchIds)

        if (tagsData) {
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
        }
      })(),

      // 获取自定义字段
      (async () => {
        const { data: customFieldsData } = await supabase
          .from("task_custom_field_values")
          .select("task_id, field_id, value")
          .in("task_id", batchIds)

        if (customFieldsData) {
          customFieldsData.forEach((item) => {
            const taskId = item.task_id
            const fieldId = item.field_id
            const value = item.value

            if (!taskCustomFields[taskId]) {
              taskCustomFields[taskId] = {}
            }
            taskCustomFields[taskId][fieldId] = value
          })
        }
      })(),
    ])
  }

  // 格式化任务数据
  const formattedTasks = allTasks.map((task) => ({
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

  // 存入缓存
  taskCache.put(projectId, formattedTasks)
  setCacheExpiry(cacheKey)

  return formattedTasks
})

// 获取单个任务
export async function getTask(id: string) {
  const supabase = createServerSupabaseClient()

  // 获取任务
  const { data: task, error: taskError } = await supabase.from("tasks").select("*").eq("id", id).single()

  if (taskError) {
    console.error(`Error fetching task ${id}:`, taskError)
    notFound()
  }

  // 获取标签
  const { data: tagsData } = await supabase.from("task_tags").select("tags(name)").eq("task_id", id)

  const tags = (tagsData?.map((item) => item.tags?.name).filter(Boolean) as string[]) || []

  // 获取自定义字段值
  const { data: customFieldsData } = await supabase
    .from("task_custom_field_values")
    .select("field_id, value")
    .eq("task_id", id)

  const customFields: Record<string, any> = {}
  customFieldsData?.forEach((item) => {
    customFields[item.field_id] = item.value
  })

  // 格式化任务
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
}

// 添加任务
export async function addTask(task: Omit<Task, "id" | "comments">) {
  const supabase = createServerSupabaseClient()

  // 获取项目中最高的顺序值，以便将新任务放在末尾
  const { data: maxOrderData } = await supabase
    .from("tasks")
    .select("order")
    .eq("project_id", task.projectId)
    .order("order", { ascending: false })
    .limit(1)

  const nextOrder =
    maxOrderData && maxOrderData.length > 0 && maxOrderData[0].order !== null ? maxOrderData[0].order + 1 : 0

  // 首先插入任务
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
      order: nextOrder,
    })
    .select()
    .single()

  if (taskError) {
    console.error("Error creating task:", taskError)
    throw new Error(`Failed to create task: ${taskError.message}`)
  }

  // 如果有标签，处理它们
  if (task.tags && task.tags.length > 0) {
    // 首先确保所有标签都存在
    for (const tagName of task.tags) {
      // 尝试插入标签，如果已存在则忽略
      await supabase.from("tags").upsert({ name: tagName }, { onConflict: "name" })
    }

    // 获取标签ID
    const { data: tagData } = await supabase.from("tags").select("id, name").in("name", task.tags)

    if (tagData && tagData.length > 0) {
      // 创建任务-标签关联
      const taskTagInserts = tagData.map((tag) => ({
        task_id: taskData.id,
        tag_id: tag.id,
      }))

      await supabase.from("task_tags").insert(taskTagInserts)
    }
  }

  // 如果有自定义字段，处理它们
  if (task.customFields && Object.keys(task.customFields).length > 0) {
    const customFieldInserts = Object.entries(task.customFields).map(([fieldId, value]) => ({
      task_id: taskData.id,
      field_id: fieldId,
      value,
    }))

    await supabase.from("task_custom_field_values").insert(customFieldInserts)
  }

  // 清除项目任务缓存
  taskCache.delete(task.projectId)
  cacheExpiry.delete(`tasks:${task.projectId}`)

  // 返回前端期望格式的任务
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
    order: taskData.order,
  }
}

// 更新任务
export async function updateTask(id: string, taskData: Partial<Task>) {
  const supabase = createServerSupabaseClient()

  // 只包含实际提供的字段
  const updateFields: Record<string, any> = {}

  if (taskData.title !== undefined) updateFields.title = taskData.title
  if (taskData.description !== undefined) updateFields.description = taskData.description
  if (taskData.status !== undefined) updateFields.status = taskData.status
  if (taskData.priority !== undefined) updateFields.priority = taskData.priority
  if (taskData.dueDate !== undefined) updateFields.due_date = taskData.dueDate
  if (taskData.comments !== undefined) updateFields.comments = taskData.comments
  if (taskData.order !== undefined) updateFields.order = taskData.order

  // 处理 assignee
  if (taskData.assignee !== undefined) {
    updateFields.assignee_name = taskData.assignee?.name
    updateFields.assignee_initials = taskData.assignee?.initials
  }

  // 只有在有字段要更新时才执行更新
  let updatedTask
  if (Object.keys(updateFields).length > 0) {
    // 更新任务
    const { data, error } = await supabase.from("tasks").update(updateFields).eq("id", id).select().single()

    if (error) {
      console.error(`Error updating task ${id}:`, error)
      throw new Error(`Failed to update task: ${error.message}`)
    }

    updatedTask = data
  } else {
    // 如果没有基本字段要更新，获取当前任务
    const { data, error } = await supabase.from("tasks").select("*").eq("id", id).single()

    if (error) {
      console.error(`Error fetching task ${id}:`, error)
      throw new Error(`Failed to fetch task: ${error.message}`)
    }

    updatedTask = data
  }

  // 并行处理标签和自定义字段更新
  await Promise.all([
    // 处理标签更新
    (async () => {
      if (taskData.tags !== undefined) {
        // 首先删除现有标签关联
        await supabase.from("task_tags").delete().eq("task_id", id)

        // 然后添加新的（如果有的话）
        if (taskData.tags && taskData.tags.length > 0) {
          // 确保所有标签都存在
          const tagPromises = taskData.tags.map((tagName) =>
            supabase.from("tags").upsert({ name: tagName }, { onConflict: "name" }),
          )
          await Promise.all(tagPromises)

          // 获取标签ID
          const { data: tagData } = await supabase.from("tags").select("id, name").in("name", taskData.tags)

          if (tagData && tagData.length > 0) {
            // 创建任务-标签关联
            const taskTagInserts = tagData.map((tag) => ({
              task_id: id,
              tag_id: tag.id,
            }))

            await supabase.from("task_tags").insert(taskTagInserts)
          }
        }
      }
    })(),

    // 处理自定义字段更新
    (async () => {
      if (taskData.customFields !== undefined) {
        // 首先删除现有自定义字段值
        await supabase.from("task_custom_field_values").delete().eq("task_id", id)

        // 然后添加新的（如果有的话）
        if (taskData.customFields && Object.keys(taskData.customFields).length > 0) {
          const customFieldInserts = Object.entries(taskData.customFields).map(([fieldId, value]) => ({
            task_id: id,
            field_id: fieldId,
            value,
          }))

          await supabase.from("task_custom_field_values").insert(customFieldInserts)
        }
      }
    })(),
  ])

  // 清除项目任务缓存
  if (updatedTask.project_id) {
    taskCache.delete(updatedTask.project_id)
    cacheExpiry.delete(`tasks:${updatedTask.project_id}`)
  }

  // 获取更新后的任务及其所有相关数据
  return getTask(id)
}

// 删除任务
export async function deleteTask(id: string) {
  const supabase = createServerSupabaseClient()

  // 首先获取项目ID以便稍后清除缓存
  const { data: task } = await supabase.from("tasks").select("project_id").eq("id", id).single()
  const projectId = task?.project_id

  const { error } = await supabase.from("tasks").delete().eq("id", id)

  if (error) {
    console.error(`Error deleting task ${id}:`, error)
    throw new Error(`Failed to delete task: ${error.message}`)
  }

  // 清除项目任务缓存
  if (projectId) {
    taskCache.delete(projectId)
    cacheExpiry.delete(`tasks:${projectId}`)
  }

  return { success: true }
}

// 获取项目自定义字段
export async function getProjectCustomFields(projectId: string) {
  const supabase = createServerSupabaseClient()
  const cacheKey = `customFields:${projectId}`

  // 检查缓存是否有效
  if (!isCacheExpired(cacheKey)) {
    const cachedFields = projectCache.get(`fields:${projectId}`)
    if (cachedFields) {
      return cachedFields
    }
  }

  const { data, error } = await supabase.from("custom_fields").select("*").eq("project_id", projectId)

  if (error) {
    console.error(`Error fetching custom fields for project ${projectId}:`, error)
    throw new Error(`Failed to fetch custom fields: ${error.message}`)
  }

  const customFields = data.map((field) => ({
    id: field.id,
    projectId: field.project_id,
    name: field.name,
    type: field.type,
    options: field.options,
    isRequired: field.is_required,
    isMulti: field.is_multi,
  }))

  // 存入缓存
  projectCache.put(`fields:${projectId}`, customFields)
  setCacheExpiry(cacheKey)

  return customFields
}

// 添加自定义字段
export async function addCustomField(field: Omit<CustomField, "id">) {
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

  // 清除项目自定义字段缓存
  projectCache.delete(`fields:${field.projectId}`)
  cacheExpiry.delete(`customFields:${field.projectId}`)

  return {
    id: data.id,
    projectId: data.project_id,
    name: data.name,
    type: data.type,
    options: data.options,
    isRequired: data.is_required,
  }
}

// 删除自定义字段
export async function deleteCustomField(id: string) {
  const supabase = createServerSupabaseClient()

  // 首先获取项目ID以便稍后清除缓存
  const { data: field } = await supabase.from("custom_fields").select("project_id").eq("id", id).single()
  const projectId = field?.project_id

  const { error } = await supabase.from("custom_fields").delete().eq("id", id)

  if (error) {
    console.error(`Error deleting custom field ${id}:`, error)
    throw new Error(`Failed to delete custom field: ${error.message}`)
  }

  // 清除项目自定义字段缓存
  if (projectId) {
    projectCache.delete(`fields:${projectId}`)
    cacheExpiry.delete(`customFields:${projectId}`)
  }

  return { success: true }
}

// 添加项目
export async function addProject(project: Omit<Project, "id" | "taskCount">) {
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

  // 清除项目缓存
  projectCache.delete("all")
  cacheExpiry.delete("projects:all")

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    status: data.status,
    taskCount: 0,
  }
}

// 获取项目任务数量
export async function getProjectTaskCount(projectId: string) {
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
}

// 重新排序任务
export async function reorderTasks(taskIds: string[], newOrders: number[]) {
  const supabase = createServerSupabaseClient()

  // 获取项目ID以便缓存失效
  let projectId = null
  if (taskIds.length > 0) {
    const { data } = await supabase.from("tasks").select("project_id").eq("id", taskIds[0]).single()
    if (data) {
      projectId = data.project_id
    }
  }

  // 使用批处理更新任务顺序
  const BATCH_SIZE = 50
  for (let i = 0; i < taskIds.length; i += BATCH_SIZE) {
    const batchIds = taskIds.slice(i, i + BATCH_SIZE)
    const batchOrders = newOrders.slice(i, i + BATCH_SIZE)

    const promises = batchIds.map((taskId, index) => {
      return supabase.from("tasks").update({ order: batchOrders[index] }).eq("id", taskId)
    })

    await Promise.all(promises)
  }

  // 清除受影响项目的任务缓存
  if (projectId) {
    taskCache.delete(projectId)
    cacheExpiry.delete(`tasks:${projectId}`)
  }

  return { success: true }
}

// 更新项目
export async function updateProject(id: string, projectData: Partial<Project>) {
  const supabase = createServerSupabaseClient()

  // 只包含实际提供的字段
  const updateFields: Record<string, any> = {}

  if (projectData.title !== undefined) updateFields.title = projectData.title
  if (projectData.description !== undefined) updateFields.description = projectData.description
  if (projectData.status !== undefined) updateFields.status = projectData.status

  // 添加更新时间戳
  updateFields.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from("projects").update(updateFields).eq("id", id).select().single()

  if (error) {
    console.error(`Error updating project ${id}:`, error)
    throw new Error(`Failed to update project: ${error.message}`)
  }

  // 清除项目缓存
  projectCache.delete(id)
  cacheExpiry.delete(`project:${id}`)

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    status: data.status,
    taskCount: await getProjectTaskCount(id),
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

// 删除项目及其所有任务
export async function deleteProject(id: string) {
  const supabase = createServerSupabaseClient()

  // 删除项目（级联删除应该处理相关任务）
  const { error } = await supabase.from("projects").delete().eq("id", id)

  if (error) {
    console.error(`Error deleting project ${id}:`, error)
    throw new Error(`Failed to delete project: ${error.message}`)
  }

  // 清除缓存
  projectCache.delete(id)
  projectCache.delete("all")
  taskCache.delete(id)
  cacheExpiry.delete(`project:${id}`)
  cacheExpiry.delete("projects:all")
  cacheExpiry.delete(`tasks:${id}`)

  return { success: true }
}
