import { NextResponse } from "next/server"
import { reorderTasks } from "@/lib/data"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { taskIds, newOrders } = body

    if (!taskIds || !newOrders || taskIds.length !== newOrders.length) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    // Use the improved reorderTasks function from data.ts
    const result = await reorderTasks(taskIds, newOrders)

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("Error reordering tasks:", error)
    return NextResponse.json(
      { error: "Failed to reorder tasks: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    )
  }
}
