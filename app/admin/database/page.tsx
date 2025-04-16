import { SupabaseStatus } from "@/components/supabase-status"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function DatabasePage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回首页
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">数据库连接诊断</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Supabase 连接状态</CardTitle>
            <CardDescription>检查应用程序与 Supabase 数据库的连接状态</CardDescription>
          </CardHeader>
          <CardContent>
            <SupabaseStatus />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>环境变量检查</CardTitle>
            <CardDescription>确保所有必要的 Supabase 环境变量都已正确设置</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">请确保以下环境变量已正确设置：</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <code>NEXT_PUBLIC_SUPABASE_URL</code> - Supabase 项目 URL
              </li>
              <li>
                <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> - 匿名访问密钥
              </li>
              <li>
                <code>SUPABASE_SERVICE_ROLE_KEY</code> - 服务角色密钥（可选，用于管理员操作）
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>常见问题排查</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">1. 检查 Supabase 项目状态</h3>
                <p className="text-muted-foreground">确保您的 Supabase 项目处于活动状态，并且没有维护或停机。</p>
              </div>

              <div>
                <h3 className="font-medium">2. 验证数据库表结构</h3>
                <p className="text-muted-foreground">确认 Supabase 中存在所需的表（projects, tasks 等）。</p>
              </div>

              <div>
                <h3 className="font-medium">3. 检查 RLS 策略</h3>
                <p className="text-muted-foreground">确保行级安全策略允许应用程序访问所需的数据。</p>
              </div>

              <div>
                <h3 className="font-medium">4. 重新生成 API 密钥</h3>
                <p className="text-muted-foreground">
                  如果怀疑密钥泄露或损坏，可以在 Supabase 仪表板中重新生成 API 密钥。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
