"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MultiSelect } from "@/components/multi-select"
import { TaskCustomFields } from "@/components/task-custom-fields"
import { toast } from "@/hooks/use-toast"
import type { Task } from "@/lib/types"
import type { CustomField, CustomFieldValue } from "@/lib/types"

// Import the simple editor directly to avoid dynamic loading delay
import SimpleRichTextEditor from "@/components/simple-rich-text-editor"

export default function EditTaskPage({
  params,
}: {
  params: { id: string; taskId: string }
}) {
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [localChanges, setLocalChanges] = useState<Partial<Task>>({})
  const initialTaskRef = useRef<Task | null>(null)
  const hasUnsavedChanges = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Add validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Memoize the merged task to avoid unnecessary re-renders
  const mergedTask = useMemo(() => {
    if (!task) return null
    return { ...task, ...localChanges }
  }, [task, localChanges])

  // Optimized fetch function with caching
  const fetchTask = useCallback(async () => {
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
        initialTaskRef.current = JSON.parse(JSON.stringify(taskFromStorage))
      } else {
        // Otherwise try to fetch from API
        console.log(`Fetching task from API: /api/tasks/${params.taskId}`)
        const response = await fetch(`/api/tasks/${params.taskId}`, {
          cache: "no-store",
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch task")
        }

        const taskData = await response.json()
        console.log("Task from API:", taskData)
        setTask(taskData)
        initialTaskRef.current = JSON.parse(JSON.stringify(taskData))
      }

      // Try to load custom fields and tags from localStorage
      try {
        const storedFields = localStorage.getItem(`project-${params.id}-custom-fields`)
        if (storedFields) {
          setCustomFields(JSON.parse(storedFields))
        }

        // Load available tags
        if (storedTasks) {
          const tasks = JSON.parse(storedTasks)
          const tagSet = new Set<string>()
          tasks.forEach((t: Task) => {
            if (t.tags) {
              t.tags.forEach((tag) => tagSet.add(tag))
            }
          })
          setAvailableTags(Array.from(tagSet))
        }
      } catch (err) {
        console.error("Error loading data from localStorage:", err)
      }
    } catch (err) {
      console.error("Error fetching task:", err)
      setError(`Failed to load task details: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }, [params.taskId, params.id])

  useEffect(() => {
    fetchTask()

    // Cleanup function
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [fetchTask])

  // Handle field changes with debouncing
  const handleFieldChange = useCallback((field: keyof Task, value: any) => {
    setLocalChanges((prev) => ({ ...prev, [field]: value }))
    hasUnsavedChanges.current = true
  }, [])

  // Update the handleCustomFieldChange function
  const handleCustomFieldChange = useCallback(
    (fieldId: string, value: CustomFieldValue) => {
      setLocalChanges((prev) => ({
        ...prev,
        customFields: {
          ...(prev.customFields || {}),
          ...(task?.customFields || {}),
          [fieldId]: value,
        },
      }))
      hasUnsavedChanges.current = true

      // Clear validation error for this field if it exists
      if (validationErrors[fieldId]) {
        setValidationErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[fieldId]
          return newErrors
        })
      }
    },
    [task?.customFields, validationErrors],
  )

  const handleDescriptionChange = useCallback(
    (html: string) => {
      handleFieldChange("description", html)
    },
    [handleFieldChange],
  )

  // Update the handleSave function to include validation
  const handleSave = useCallback(async () => {
    if (!task || !hasUnsavedChanges.current) return

    // Validate required fields
    const errors: Record<string, string> = {}

    // Validate required custom fields
    customFields.forEach((field) => {
      if (field.isRequired) {
        const value = mergedTask?.customFields?.[field.id]

        if (value === undefined || value === null || value === "") {
          errors[field.id] = `${field.name}是必填字段`
        }
      }
    })

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      toast({
        title: "表单验证失败",
        description: "请填写所有必填字段",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      // Create the updated task by merging the original task with local changes
      const updatedTask = { ...task, ...localChanges }

      // Optimistically update localStorage first for instant feedback
      try {
        const storedTasks = localStorage.getItem(`project-${params.id}-tasks`)
        if (storedTasks) {
          const tasks = JSON.parse(storedTasks)
          const updatedTasks = tasks.map((t: Task) => (t.id === task.id ? updatedTask : t))
          localStorage.setItem(`project-${params.id}-tasks`, JSON.stringify(updatedTasks))
        }
      } catch (err) {
        console.error("Error updating localStorage:", err)
      }

      // Show success toast immediately
      try {
        toast({
          title: "任务已更新",
          description: "任务已成功更新",
        })
      } catch (toastError) {
        console.error("Error showing toast:", toastError)
      }

      // Navigate back to task detail page immediately
      router.push(`/projects/${params.id}/tasks/${params.taskId}`)

      // Send the update to the server in the background
      fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedTask),
      }).catch((error) => {
        console.error("Error updating task:", error)

        // Show error toast if the background update fails
        try {
          toast({
            title: "更新可能失败",
            description: "在服务器上更新任务时出现问题。更改可能不会永久保存。",
            variant: "destructive",
          })
        } catch (toastError) {
          console.error("Error showing toast:", toastError)
        }
      })
    } catch (err) {
      console.error("Error updating task:", err)
      try {
        toast({
          title: "更新失败",
          description: "更新任务失败，请重试",
          variant: "destructive",
        })
      } catch (toastError) {
        console.error("Error showing toast:", toastError)
      }
      setIsSaving(false)
    }
  }, [task, localChanges, params.id, params.taskId, router, toast, customFields, mergedTask])

  // Auto-save when user stops typing
  useEffect(() => {
    if (hasUnsavedChanges.current && !isSaving) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Don't auto-save, just update the flag
      saveTimeoutRef.current = setTimeout(() => {
        console.log("Changes ready to save")
      }, 500)
    }
  }, [localChanges, isSaving])

  // Handle beforeunload event to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges.current) {
        e.preventDefault()
        e.returnValue = ""
        return ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="container py-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>Loading task details...</p>
          </div>
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
          href={`/projects/${params.id}/tasks/${params.taskId}`}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Task Details
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Task</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="grid gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={mergedTask?.title || ""}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <SimpleRichTextEditor initialValue={mergedTask?.description || ""} onChange={handleDescriptionChange} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={mergedTask?.status || ""} onValueChange={(value) => handleFieldChange("status", value)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={mergedTask?.priority || ""}
                  onValueChange={(value) => handleFieldChange("priority", value)}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Select
                  value={mergedTask?.assignee?.name || "unassigned"}
                  onValueChange={(value) => {
                    if (value === "unassigned") {
                      handleFieldChange("assignee", undefined)
                    } else {
                      handleFieldChange("assignee", {
                        name: value,
                        initials: value
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase(),
                      })
                    }
                  }}
                >
                  <SelectTrigger id="assignee">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    <SelectItem value="John Doe">John Doe</SelectItem>
                    <SelectItem value="Jane Smith">Jane Smith</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={mergedTask?.dueDate || ""}
                  onChange={(e) => handleFieldChange("dueDate", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <MultiSelect
                options={availableTags}
                selected={mergedTask?.tags || []}
                onChange={(tags) => handleFieldChange("tags", tags)}
                placeholder="Select tags..."
              />
            </div>

            {customFields.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium mb-2">自定义字段</h3>
                <TaskCustomFields
                  customFields={customFields}
                  values={mergedTask?.customFields || {}}
                  onChange={handleCustomFieldChange}
                  errors={validationErrors}
                />
              </div>
            )}
          </div>
        </CardContent>
        <div className="flex justify-end gap-2 p-6 border-t">
          <Button
            variant="outline"
            onClick={() => router.push(`/projects/${params.id}/tasks/${params.taskId}`)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges.current} className="min-w-[100px]">
            {isSaving ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>Saving...</span>
              </div>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
