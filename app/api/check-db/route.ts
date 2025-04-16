import { NextResponse } from "next/server"
import { checkSupabaseConnection } from "@/lib/check-supabase"

export async function GET() {
  try {
    const connectionStatus = await checkSupabaseConnection()

    return NextResponse.json({
      status: connectionStatus.connected ? "connected" : "disconnected",
      error: connectionStatus.error,
      env: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 },
    )
  }
}
