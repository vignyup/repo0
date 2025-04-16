import { NextResponse } from "next/server"
import { addTask, getProjectTasks } from "@/lib/data"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    }

    const tasks = await getProjectTasks(projectId)
    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("Received task creation request:", body)

    const { projectId, title, description, status, priority, assignee, dueDate, tags, customFields } = body

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    }

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const newTask = await addTask({
      projectId,
      title,
      description: description || "",
      status: status || "todo",
      priority: priority || "medium",
      assignee,
      dueDate,
      tags,
      customFields,
    })

    console.log("Task created successfully:", newTask)
    return NextResponse.json(newTask, { status: 201 })
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json(
      { error: "Failed to create task: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    )
  }
}
