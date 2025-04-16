import { NextResponse } from "next/server"
import { getTask, updateTask, deleteTask } from "@/lib/data"
import { createServerSupabaseClient } from "@/lib/supabase"

// Add caching for task data
const taskCache = new Map<string, any>()

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    // Check cache first
    if (taskCache.has(id)) {
      return NextResponse.json(taskCache.get(id))
    }

    const task = await getTask(id)

    // Store in cache
    taskCache.set(id, task)

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error fetching task:", error)
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 })
  }
}

// Find the PUT function and optimize it
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()

    console.log(`API: Updating task ${id}`)

    // Validate required fields to avoid unnecessary database operations
    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Optimize by only updating essential fields first
    const essentialFields = {
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      due_date: body.dueDate,
      assignee_name: body.assignee?.name,
      assignee_initials: body.assignee?.initials,
      updated_at: new Date().toISOString(),
    }

    // Update the task with essential fields
    const { data, error } = await supabase.from("tasks").update(essentialFields).eq("id", id).select().single()

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`)
    }

    // Process tags and custom fields in the background
    // We don't need to await these operations for the initial response
    const backgroundOperations = []

    // Handle tags if provided
    if (body.tags !== undefined) {
      backgroundOperations.push(
        (async () => {
          // Delete existing tag associations
          await supabase.from("task_tags").delete().eq("task_id", id)

          // Add new ones if there are any
          if (body.tags && body.tags.length > 0) {
            // Ensure all tags exist
            await Promise.all(
              body.tags.map((tagName) => supabase.from("tags").upsert({ name: tagName }, { onConflict: "name" })),
            )

            // Get the tag IDs
            const { data: tagData } = await supabase.from("tags").select("id, name").in("name", body.tags)

            if (tagData && tagData.length > 0) {
              // Create task-tag associations
              const taskTagInserts = tagData.map((tag) => ({
                task_id: id,
                tag_id: tag.id,
              }))

              await supabase.from("task_tags").insert(taskTagInserts)
            }
          }
        })(),
      )
    }

    // Handle custom fields if provided
    if (body.customFields !== undefined) {
      backgroundOperations.push(
        (async () => {
          // Delete existing custom field values
          await supabase.from("task_custom_field_values").delete().eq("task_id", id)

          // Add new ones if there are any
          if (body.customFields && Object.keys(body.customFields).length > 0) {
            const customFieldInserts = Object.entries(body.customFields).map(([fieldId, value]) => ({
              task_id: id,
              field_id: fieldId,
              value,
            }))

            await supabase.from("task_custom_field_values").insert(customFieldInserts)
          }
        })(),
      )
    }

    // Start background operations but don't wait for them
    Promise.all(backgroundOperations).catch((err) => {
      console.error("Error in background operations:", err)
    })

    // Format the task for the frontend response
    const updatedTask = {
      id: data.id,
      projectId: data.project_id,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      assignee: data.assignee_name
        ? {
            name: data.assignee_name,
            initials: data.assignee_initials,
          }
        : undefined,
      dueDate: data.due_date,
      comments: data.comments || 0,
      tags: body.tags || [],
      customFields: body.customFields || {},
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error("API: Error updating task:", error)
    return NextResponse.json(
      {
        error: "Failed to update task: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()

    console.log(`API: Patching task ${id} with data:`, body)

    const updatedTask = await updateTask(id, body)
    console.log("API: Task patched successfully:", updatedTask)

    // Update cache
    taskCache.set(id, updatedTask)

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    await deleteTask(id)

    // Remove from cache
    taskCache.delete(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
