"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function EditProjectRedirect({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()

  useEffect(() => {
    router.replace(`/projects/${params.id}/settings`)
  }, [router, params.id])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>Redirecting to project settings...</p>
      </div>
    </div>
  )
}
