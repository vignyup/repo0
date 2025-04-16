"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import TaskBoard from "@/components/task-board"
import { getProject, getProjectTasks } from "@/lib/data"
import { notFound } from "next/navigation"
import { AddTaskButton } from "@/components/add-task-button"

export default function ProjectClientPage({
  params,
  project: initialProject,
  tasks: initialTasks,
}: {
  params: { id: string }
  project: any
  tasks: any[]
}) {
  const [tasks, setTasks] = useState(initialTasks || [])
  const [project, setProject] = useState(initialProject)
  const [isLoading, setIsLoading] = useState(!initialProject)
  const [isTaskBoardVisible, setIsTaskBoardVisible] = useState(false)
  const taskBoardRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)

  // Memoize the data loading function
  const loadData = useCallback(async () => {
    if (!initialProject || !initialTasks) {
      setIsLoading(true)
      try {
        // Load project and tasks in parallel
        const [projectData, tasksData] = await Promise.all([getProject(params.id), getProjectTasks(params.id)])

        setProject(projectData)
        setTasks(tasksData)
      } catch (error) {
        console.error("Error loading project data:", error)
        notFound()
      } finally {
        setIsLoading(false)
      }
    }
  }, [params.id, initialProject, initialTasks])

  useEffect(() => {
    // Load data on initial mount
    loadData()

    // Show task board with a slight delay for better perceived performance
    const timer = setTimeout(() => {
      setIsTaskBoardVisible(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [loadData])

  // Use intersection observer to lazy load the task board
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (!taskBoardRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsTaskBoardVisible(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.1 },
    )

    observer.observe(taskBoardRef.current)

    return () => {
      observer.disconnect()
    }
  }, [isLoading])

  const handleTaskAdded = (newTask: any) => {
    console.log("New task added:", newTask)
    // Add the new task to the existing tasks
    setTasks((prevTasks) => [...prevTasks, newTask])
  }

  // Update the loading state to show a better loading skeleton
  if (isLoading) {
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

            {/* Skeleton for project title and description */}
            <div className="mb-8">
              <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-96 bg-gray-200 rounded animate-pulse"></div>
            </div>

            {/* Skeleton for task board */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-8">
                <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-9 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((col) => (
                  <div key={col} className="flex flex-col p-4 rounded-lg border min-h-[300px]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="mb-3 p-4 border rounded-lg animate-pulse">
                        <div className="h-5 w-3/4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 w-1/2 bg-gray-200 rounded mb-2"></div>
                        <div className="flex justify-between mt-2">
                          <div className="h-4 w-16 bg-gray-200 rounded"></div>
                          <div className="h-4 w-16 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">{project.title}</h1>
              <p className="mt-1 text-muted-foreground">{project.description}</p>
            </div>
            <AddTaskButton projectId={params.id} onTaskAdded={handleTaskAdded} />
          </div>
          <div className="mt-8" ref={taskBoardRef}>
            {isTaskBoardVisible ? (
              <TaskBoard tasks={tasks} projectId={params.id} onTasksChange={setTasks} />
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
