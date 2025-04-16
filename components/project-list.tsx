"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import type { Project } from "@/lib/types"

interface ProjectListProps {
  initialProjects: Project[]
}

export function ProjectList({ initialProjects }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)

  // Update projects when initialProjects changes
  useEffect(() => {
    setProjects(initialProjects)
    // Store projects in localStorage for faster access
    try {
      localStorage.setItem("projects-list", JSON.stringify(initialProjects))
    } catch (error) {
      console.error("Error storing projects in localStorage:", error)
    }
  }, [initialProjects])

  // Simple click handler for loading indicator
  const handleProjectClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const link = e.currentTarget

    // Don't show loading for new project link
    if (link.href.endsWith("/projects/new")) return

    // Find the loading indicator and show it
    const indicator = link.querySelector(".loading-indicator") as HTMLElement
    if (indicator) {
      indicator.style.opacity = "1"
    }
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          prefetch={true}
          className="group rounded-lg border p-4 transition-all hover:border-primary hover:shadow-sm h-full relative overflow-hidden"
          onClick={handleProjectClick}
        >
          {/* Add loading indicator that appears on click */}
          <div className="loading-indicator absolute inset-0 bg-background/80 flex items-center justify-center opacity-0 transition-opacity pointer-events-none">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>

          <h2 className="text-xl font-semibold">{project.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
          <div className="mt-4 flex items-center text-sm text-muted-foreground">
            <span className="flex items-center">
              <span
                className={`mr-2 h-2 w-2 rounded-full ${
                  project.status === "active"
                    ? "bg-green-500"
                    : project.status === "planning"
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                }`}
              ></span>
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </span>
            <span className="ml-auto">{project.taskCount} tasks</span>
          </div>
        </Link>
      ))}

      {projects.length === 0 && (
        <div className="col-span-full text-center py-12">
          <h3 className="text-lg font-medium">No projects yet</h3>
          <p className="mt-2 text-muted-foreground">Create your first project to get started</p>
          <Link href="/projects/new">
            <Button className="mt-4">
              <PlusIcon className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>
      )}

      <style jsx global>{`
        .loading-indicator {
          z-index: 10;
          transition: opacity 0.2s ease;
        }
      `}</style>
    </div>
  )
}
