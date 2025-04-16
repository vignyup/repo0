"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <h2 className="mt-2 text-xl">Project Not Found</h2>
        <p className="mt-4 text-muted-foreground">The project you're looking for doesn't exist or has been removed.</p>
        <Button className="mt-6" onClick={() => router.push("/")}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  )
}
