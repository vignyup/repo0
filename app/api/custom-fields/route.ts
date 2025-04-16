import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// 在 GET 处理程序中，确保返回 isMulti 字段
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase.from("custom_fields").select("*").eq("project_id", projectId)

    if (error) {
      throw new Error(`Failed to fetch custom fields: ${error.message}`)
    }

    const customFields = data.map((field) => ({
      id: field.id,
      projectId: field.project_id,
      name: field.name,
      type: field.type,
      options: field.options,
      isRequired: field.is_required,
      isMulti: field.is_multi, // 确保返回 isMulti 字段
    }))

    return NextResponse.json(customFields)
  } catch (error) {
    console.error("Error fetching custom fields:", error)
    return NextResponse.json({ error: "Failed to fetch custom fields" }, { status: 500 })
  }
}

// 在 POST 处理程序中，确保处理 isMulti 字段
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { projectId, name, type, options, isRequired, isMulti } = body

    if (!projectId || !name || !type) {
      return NextResponse.json({ error: "Project ID, name, and type are required" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from("custom_fields")
      .insert({
        project_id: projectId,
        name,
        type,
        options,
        is_required: isRequired,
        is_multi: isMulti,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create custom field: ${error.message}`)
    }

    const customField = {
      id: data.id,
      projectId: data.project_id,
      name: data.name,
      type: data.type,
      options: data.options,
      isRequired: data.is_required,
      isMulti: data.is_multi, // 确保返回 isMulti 字段
    }

    return NextResponse.json(customField)
  } catch (error) {
    console.error("Error creating custom field:", error)
    return NextResponse.json({ error: "Failed to create custom field" }, { status: 500 })
  }
}
