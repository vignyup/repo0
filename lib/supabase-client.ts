import { createClient } from "@supabase/supabase-js"

// 全局变量存储 Supabase 客户端实例
let supabaseClient: ReturnType<typeof createClient> | null = null

export function createSupabaseClient() {
  // 如果已经创建了客户端实例，则直接返回
  if (supabaseClient) return supabaseClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("缺少 Supabase 环境变量")
    throw new Error("缺少 Supabase 所需的环境变量")
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false, // 对于服务器端操作，不需要持久化会话
      },
    })
    return supabaseClient
  } catch (error) {
    console.error("创建 Supabase 客户端时出错:", error)
    throw new Error("无法创建 Supabase 客户端")
  }
}

// 服务器端 Supabase 客户端
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("缺少 Supabase 环境变量")
    throw new Error("缺少 Supabase 所需的环境变量")
  }

  try {
    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    })
  } catch (error) {
    console.error("创建服务器端 Supabase 客户端时出错:", error)
    throw new Error("无法创建服务器端 Supabase 客户端")
  }
}
