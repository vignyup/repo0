import { createServerSupabaseClient } from "./supabase-client"

export async function checkSupabaseConnection() {
  try {
    const supabase = createServerSupabaseClient()

    // 尝试执行一个简单的查询来测试连接
    const { data, error } = await supabase.from("projects").select("count").limit(1)

    if (error) {
      console.error("Supabase 连接测试失败:", error)
      return {
        connected: false,
        error: error.message,
      }
    }

    return {
      connected: true,
      error: null,
    }
  } catch (error) {
    console.error("检查 Supabase 连接时出错:", error)
    return {
      connected: false,
      error: error instanceof Error ? error.message : "未知错误",
    }
  }
}
