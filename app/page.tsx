import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import { getProjects } from "@/lib/data"
import { ProjectList } from "@/components/project-list"

// Force dynamic rendering and disable cache
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

export default async function Home() {
  const projects = await getProjects()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center px-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 font-semibold">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              PM
            </div>
            <span>Project Manager</span>
          </div>
          <nav className="ml-auto flex gap-4 sm:gap-6">
            <Link href="/" className="text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/projects" className="text-sm font-medium">
              Projects
            </Link>
            <Link href="/settings" className="text-sm font-medium">
              Settings
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 py-8">
        <div className="container px-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Projects</h1>
            <Link href="/projects/new">
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </Link>
          </div>

          <ProjectList initialProjects={projects} />
        </div>
      </main>
    </div>
  )
}
