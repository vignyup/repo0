"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, RefreshCw } from "lucide-react"

export function SupabaseStatus() {
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkConnection = async () => {
    setIsChecking(true)
    setStatus("loading")

    try {
      const response = await fetch("/api/test-supabase")
      const data = await response.json()

      if (data.success) {
        setStatus("connected")
        setErrorMessage(null)
      } else {
        setStatus("error")
        setErrorMessage(data.message || "连接失败")
      }
    } catch (error) {
      setStatus("error")
      setErrorMessage("请求失败")
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkConnection()
  }, [])

  return (
    <div className="space-y-4">
      <Alert variant={status === "connected" ? "default" : "destructive"}>
        <div className="flex items-center">
          {status === "connected" ? (
            <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
          ) : status === "error" ? (
            <XCircle className="h-5 w-5 mr-2" />
          ) : (
            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
          )}
          <AlertTitle>
            {status === "connected"
              ? "Supabase 连接成功"
              : status === "error"
                ? "Supabase 连接失败"
                : "正在检查 Supabase 连接..."}
          </AlertTitle>
        </div>
        {errorMessage && <AlertDescription className="mt-2">{errorMessage}</AlertDescription>}
      </Alert>

      <Button onClick={checkConnection} disabled={isChecking} className="flex items-center gap-2">
        {isChecking && <RefreshCw className="h-4 w-4 animate-spin" />}
        重新检查连接
      </Button>
    </div>
  )
}
