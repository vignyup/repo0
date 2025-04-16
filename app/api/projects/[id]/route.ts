import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase.from("projects").select("*").eq("id", id).single()

    if (error) {
      throw new Error(`Project not found: ${error.message}`)
    }

    // Get task count
    const { count } = await supabase.from("tasks").select("*", { count: "exact", head: true }).eq("project_id", id)

    const project = {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      taskCount: count || 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error("Error fetching project:", error)
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()
    const { title, description, status } = body

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json({ error: "项目名称和描述不能为空" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    // Update the project
    const { data, error } = await supabase
      .from("projects")
      .update({
        title,
        description,
        status: status || "planning", // Default to planning if not provided
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      throw new Error(`更新项目失败: ${error.message}`)
    }

    // Get task count
    const { count } = await supabase.from("tasks").select("*", { count: "exact", head: true }).eq("project_id", id)

    const updatedProject = {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      taskCount: count || 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error("Error updating project:", error)
    return NextResponse.json(
      {
        error: "更新项目失败: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}
