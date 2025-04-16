import { NextResponse } from "next/server"
import { deleteCustomField } from "@/lib/data"
import { createServerSupabaseClient } from "@/lib/supabase"

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    await deleteCustomField(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting custom field:", error)
    return NextResponse.json({ error: "Failed to delete custom field" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()
    const { name, type, options, isRequired } = body

    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from("custom_fields")
      .update({
        name,
        type,
        options,
        is_required: isRequired,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update custom field: ${error.message}`)
    }

    const updatedCustomField = {
      id: data.id,
      projectId: data.project_id,
      name: data.name,
      type: data.type,
      options: data.options,
      isRequired: data.is_required,
    }

    return NextResponse.json(updatedCustomField)
  } catch (error) {
    console.error("Error updating custom field:", error)
    return NextResponse.json({ error: "Failed to update custom field" }, { status: 500 })
  }
}
