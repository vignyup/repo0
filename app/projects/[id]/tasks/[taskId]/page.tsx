"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, CalendarIcon, MessageSquareIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { TaskCustomFields } from "@/components/task-custom-fields"
import type { Task } from "@/lib/types"
import type { CustomField } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function TaskDetailPage({
  params,
}: {
  params: { id: string; taskId: string }
}) {
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTask = async () => {
      try {
        setIsLoading(true)

        // First try to get the task from localStorage
        const storedTasks = localStorage.getItem(`project-${params.id}-tasks`)
        let taskFromStorage = null

        if (storedTasks) {
          try {
            const tasks = JSON.parse(storedTasks)
            taskFromStorage = tasks.find((t: Task) => t.id === params.taskId)
            console.log("Task from localStorage:", taskFromStorage)
          } catch (err) {
            console.error("Error parsing stored tasks:", err)
          }
        }

        // If we found the task in localStorage, use it
        if (taskFromStorage) {
          setTask(taskFromStorage)
        } else {
          // Otherwise try to fetch from API
          console.log(`Fetching task from API: /api/tasks/${params.taskId}`)
          const response = await fetch(`/api/tasks/${params.taskId}`)

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || "Failed to fetch task")
          }

          const taskData = await response.json()
          console.log("Task from API:", taskData)
          setTask(taskData)
        }

        // Try to load custom fields from localStorage
        try {
          const storedFields = localStorage.getItem(`project-${params.id}-custom-fields`)
          if (storedFields) {
            setCustomFields(JSON.parse(storedFields))
          }
        } catch (err) {
          console.error("Error loading custom fields:", err)
        }
      } catch (err) {
        console.error("Error fetching task:", err)
        setError(`Failed to load task details: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTask()
  }, [params.taskId, params.id])

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "text-red-500"
      case "medium":
        return "text-yellow-500"
      case "low":
        return "text-green-500"
      default:
        return "text-gray-500"
    }
  }

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "todo":
        return "text-gray-500"
      case "in-progress":
        return "text-red-500"
      case "review":
        return "text-purple-500"
      case "done":
        return "text-black"
      default:
        return "text-gray-500"
    }
  }

  const getStatusText = (status: Task["status"]) => {
    switch (status) {
      case "in-progress":
        return "In Progress"
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "No due date"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString()
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString
    }
  }

  if (isLoading) {
    return (
      <div className="container py-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <p>Loading task details...</p>
        </div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="container py-8 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-red-500 mb-4">{error || "Task not found"}</p>
          <Button onClick={() => router.push(`/projects/${params.id}`)}>Back to Project</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href={`/projects/${params.id}`}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Project
        </Link>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">{task.title}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => router.push(`/projects/${params.id}/tasks/${params.taskId}/edit`)}
              >
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Description</h3>
              <div className="text-muted-foreground whitespace-pre-line">
                {task.description ? (
                  <div dangerouslySetInnerHTML={{ __html: task.description }} />
                ) : (
                  "No description provided."
                )}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium mb-3">Details</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className={cn("font-medium", getStatusColor(task.status))}>{getStatusText(task.status)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Priority</dt>
                    <dd className={cn("font-medium", getPriorityColor(task.priority))}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Assignee</dt>
                    <dd className="font-medium flex items-center">
                      {task.assignee ? (
                        <>
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarFallback className="text-xs">{task.assignee.initials}</AvatarFallback>
                          </Avatar>
                          {task.assignee.name}
                        </>
                      ) : (
                        "Unassigned"
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Due Date</dt>
                    <dd className="font-medium flex items-center">
                      {task.dueDate ? (
                        <>
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {formatDate(task.dueDate)}
                        </>
                      ) : (
                        "No due date"
                      )}
                    </dd>
                  </div>
                  {task.comments > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Comments</dt>
                      <dd className="font-medium flex items-center">
                        <MessageSquareIcon className="h-4 w-4 mr-1" />
                        {task.comments}
                      </dd>
                    </div>
                  )}

                  {/* Move tags here, below due date */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Tags</dt>
                      <dd className="font-medium">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {task.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {task.customFields && Object.keys(task.customFields).length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium mb-3">Custom Fields</h3>
                  <TaskCustomFields
                    customFields={customFields.filter(
                      (field) => task.customFields && task.customFields[field.id] !== undefined,
                    )}
                    values={task.customFields}
                    onChange={() => {}}
                    readOnly={true}
                  />
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
