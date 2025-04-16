import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { checkSupabaseEnv } from "@/lib/check-env"

export async function GET() {
  // 检查环境变量
  const envCheck = checkSupabaseEnv()

  if (!envCheck.isComplete) {
    return NextResponse.json(
      {
        success: false,
        message: "缺少必要的环境变量",
        missingVars: envCheck.missingVars,
        envStatus: envCheck.envVars,
      },
      { status: 500 },
    )
  }

  try {
    // 尝试创建 Supabase 客户端
    const supabase = createServerSupabaseClient()

    // 尝试执行一个简单的查询
    const { data, error } = await supabase.from("projects").select("count").limit(1)

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: "Supabase 查询失败",
          error: error.message,
          details: error,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Supabase 连接成功",
      data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Supabase 连接失败",
        error: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 },
    )
  }
}
