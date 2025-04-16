import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { getProject, getProjectTasks, getProjectCustomFields } from "@/lib/data"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ProjectTaskManager } from "@/components/project-task-manager"
import { Button } from "@/components/ui/button"

// Add cache control to ensure fresh data
export const fetchCache = "force-no-store"
export const dynamic = "force-dynamic"
export const revalidate = 0

// Add a loading component for better UX
function ProjectLoading() {
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
          <div className="mb-8">
            <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Projects
            </Link>
          </div>
          <div className="mb-8">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse mt-2"></div>
          </div>
          <div className="mt-8">
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default async function ProjectPage({
  params,
}: {
  params: { id: string }
}) {
  try {
    // Use Promise.all to fetch project data and tasks in parallel
    const [project, tasks] = await Promise.all([getProject(params.id), getProjectTasks(params.id)])

    // Update the project's task count to match the actual number of tasks
    project.taskCount = tasks.length

    // Process tasks with tags (keep this logic)
    const tasksWithTags = tasks.map((task, index) => {
      if (index % 3 === 0) {
        return {
          ...task,
          tags: ["bug", "frontend"],
        }
      } else if (index % 3 === 1) {
        return {
          ...task,
          tags: ["feature", "backend"],
        }
      } else if (index % 5 === 0) {
        return {
          ...task,
          tags: ["documentation"],
        }
      }
      return task
    })

    // Get custom fields from the database or use sample fields if none exist
    const customFields = await getProjectCustomFields(params.id).catch(() => {
      console.log("Using sample custom fields")
      return [
        {
          id: "field-1",
          projectId: params.id,
          name: "Story Points",
          type: "number",
          isRequired: false,
        },
        {
          id: "field-2",
          projectId: params.id,
          name: "Epic",
          type: "select",
          options: ["Authentication", "Dashboard", "Reports", "Settings"],
          isRequired: false,
        },
        {
          id: "field-3",
          projectId: params.id,
          name: "Documentation",
          type: "url",
          isRequired: false,
        },
      ]
    })

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
              <Link href="/" className="text-sm font-medium" prefetch={true}>
                Dashboard
              </Link>
              <Link href="/projects" className="text-sm font-medium" prefetch={true}>
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
            <div className="mb-8">
              <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeftIcon className="mr-2 h-4 w-4" />
                Back to Projects
              </Link>
            </div>
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">{project.title}</h1>
                  <p className="mt-1 text-muted-foreground">{project.description}</p>
                </div>
                <Link href={`/projects/${params.id}/settings`}>
                  <Button variant="outline" size="sm">
                    项目设置
                  </Button>
                </Link>
              </div>
            </div>
            <div className="mt-8">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                }
              >
                <ProjectTaskManager
                  initialTasks={tasksWithTags}
                  projectId={params.id}
                  initialCustomFields={customFields}
                />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    )
  } catch (error) {
    console.error("Error loading project:", error)
    notFound()
  }
}
