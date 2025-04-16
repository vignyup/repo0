"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckIcon, X, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { MultiSelect } from "./multi-select"
import { toast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

// Add the import for custom fields
import type { CustomField, CustomFieldValue } from "@/lib/types"

interface Task {
  id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "review" | "done"
  priority: "low" | "medium" | "high"
  assignee?: {
    name: string
    initials: string
  }
  dueDate?: string
  comments: number
  projectId?: string
  tags?: string[]
  customFields?: Record<string, CustomFieldValue>
  order?: number // Add order field to track task position
}

// Update the TaskTableProps interface
interface TaskTableProps {
  tasks: Task[]
  onUpdateTask: (updatedTask: Task) => Promise<void>
  onReorderTasks?: (taskIds: string[], newOrders: number[]) => Promise<boolean | void>
  availableTags: string[]
  customFields?: CustomField[]
}

// Update the component to accept customFields
export function TaskTable({ tasks, onUpdateTask, onReorderTasks, availableTags, customFields = [] }: TaskTableProps) {
  const [editingCell, setEditingCell] = useState<{
    taskId: string
    field: keyof Task | "assigneeName" | `custom_${string}`
  } | null>(null)

  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localTasks, setLocalTasks] = useState<Task[]>([])
  const [isReordering, setIsReordering] = useState(false)

  // Add these new state variables for drag and drop
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null)
  const dragCounter = useRef<Record<string, number>>({})
  const dragStartIndex = useRef<number>(-1)
  const dragEndIndex = useRef<number>(-1)

  // Add this ref
  const initialLoadRef = useRef(false)
  const tasksRef = useRef<Task[]>([])

  // Initialize tasks with order if not present
  useEffect(() => {
    // Skip if we're in the middle of reordering
    if (isReordering) return

    // Skip if we've already processed the initial tasks and the tasks array length hasn't changed
    if (initialLoadRef.current && tasks.length === localTasks.length) {
      // Only do a deep comparison if the lengths match but we suspect changes
      const tasksIds = tasks
        .map((t) => t.id)
        .sort()
        .join(",")
      const localTasksIds = localTasks
        .map((t) => t.id)
        .sort()
        .join(",")

      if (tasksIds === localTasksIds) {
        return // No changes in the task IDs, skip update
      }
    }

    // Ensure all tasks have an order property
    const tasksWithOrder = tasks.map((task, index) => ({
      ...task,
      order: task.order !== undefined ? task.order : index,
    }))

    // Sort by order
    const sortedTasks = [...tasksWithOrder].sort((a, b) =>
      a.order !== undefined && b.order !== undefined ? a.order - b.order : 0,
    )

    // Update the ref first to avoid race conditions
    tasksRef.current = sortedTasks
    setLocalTasks(sortedTasks)
    initialLoadRef.current = true
  }, [tasks, localTasks.length, isReordering])

  const statusMap = {
    todo: "To Do",
    "in-progress": "In Progress",
    review: "Review",
    done: "Done",
  }

  const priorityColorMap = {
    low: "text-green-500",
    medium: "text-yellow-500",
    high: "text-red-500",
  }

  const isEditing = useCallback(
    (taskId: string, field: keyof Task | "assigneeName" | `custom_${string}`) => {
      return editingCell?.taskId === taskId && editingCell?.field === field
    },
    [editingCell],
  )

  const handleStartEdit = useCallback(
    (taskId: string, field: keyof Task | "assigneeName" | `custom_${string}`, value: any) => {
      setEditingCell({ taskId, field })
      if (field !== "tags") {
        setEditValues((prev) => ({ ...prev, [field]: value }))
      }
    },
    [],
  )

  const handleCancelEdit = useCallback(() => {
    setEditingCell(null)
    setEditValues({})
  }, [])

  const handleSaveEdit = useCallback(
    async (task: Task) => {
      if (!editingCell || isSubmitting) return

      setIsSubmitting(true)

      try {
        const field = editingCell.field
        const updatedTask = { ...task }

        if (field === "assigneeName") {
          if (editValues[field] === "unassigned") {
            updatedTask.assignee = undefined
          } else if (editValues[field]) {
            updatedTask.assignee = {
              name: editValues[field],
              initials: editValues[field]
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase(),
            }
          }
        } else if (field === "tags") {
          updatedTask.tags = editValues[field] || []
        } else if (field.startsWith("custom_")) {
          // Handle custom field updates
          const fieldId = field.replace("custom_", "")
          if (!updatedTask.customFields) {
            updatedTask.customFields = {}
          }
          updatedTask.customFields[fieldId] = editValues[field]
        } else if (field in updatedTask) {
          updatedTask[field] = editValues[field]
        }

        // Optimistically update the UI
        setLocalTasks((prevTasks) => prevTasks.map((t) => (t.id === task.id ? updatedTask : t)))

        // Call the API to update the task
        await onUpdateTask(updatedTask)

        // Show success toast
        toast({
          title: "Task updated",
          description: "The task has been successfully updated.",
        })
      } catch (error) {
        console.error("Failed to update task:", error)

        // Revert to original tasks on error
        setLocalTasks(tasksRef.current)

        // Show error toast
        toast({
          title: "Update failed",
          description: "Failed to update the task. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
        setEditingCell(null)
        setEditValues({})
      }
    },
    [editingCell, isSubmitting, editValues, onUpdateTask, toast],
  )

  // Format date for display
  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return "No due date"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString()
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString
    }
  }, [])

  // Improved drag and drop handlers with debouncing
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string, index: number) => {
    e.dataTransfer.setData("text/plain", taskId)
    e.dataTransfer.effectAllowed = "move"
    setDraggedTaskId(taskId)
    dragStartIndex.current = index

    // Add a class to the dragged element for visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add("table-row-dragging")
    }
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent, taskId: string) => {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = "move"

      if (dragOverTaskId !== taskId) {
        setDragOverTaskId(taskId)
      }
    },
    [dragOverTaskId],
  )

  const handleDragEnter = useCallback((e: React.DragEvent, taskId: string) => {
    e.preventDefault()
    e.stopPropagation()

    dragCounter.current[taskId] = (dragCounter.current[taskId] || 0) + 1
    setDragOverTaskId(taskId)
  }, [])

  const handleDragLeave = useCallback(
    (e: React.DragEvent, taskId: string) => {
      e.preventDefault()
      e.stopPropagation()

      dragCounter.current[taskId] = (dragCounter.current[taskId] || 0) - 1
      if (dragCounter.current[taskId] <= 0) {
        dragCounter.current[taskId] = 0
        if (dragOverTaskId === taskId) {
          setDragOverTaskId(null)
        }
      }
    },
    [dragOverTaskId],
  )

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // Remove dragging class
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove("table-row-dragging")
    }

    // Reset drag state
    setDraggedTaskId(null)
    setDragOverTaskId(null)
    dragStartIndex.current = -1
    dragEndIndex.current = -1

    // Reset all drag counters
    Object.keys(dragCounter.current).forEach((key) => {
      dragCounter.current[key] = 0
    })
  }, [])

  // Improved drop handler with backend persistence
  const handleDrop = useCallback(
    async (e: React.DragEvent, targetTaskId: string, targetIndex: number) => {
      e.preventDefault()
      e.stopPropagation()

      const sourceTaskId = e.dataTransfer.getData("text/plain")
      if (!sourceTaskId || sourceTaskId === targetTaskId || isReordering) {
        setDragOverTaskId(null)
        setDraggedTaskId(null)
        return
      }

      // Set reordering flag to prevent multiple drops
      setIsReordering(true)
      dragEndIndex.current = targetIndex

      try {
        // Create a copy of the tasks array
        const tasksCopy = [...localTasks]

        // Find the indices of the source and target tasks
        const sourceIndex = tasksCopy.findIndex((task) => task.id === sourceTaskId)
        const targetIndex = tasksCopy.findIndex((task) => task.id === targetTaskId)

        if (sourceIndex === -1 || targetIndex === -1) {
          throw new Error("Task not found")
        }

        // Move the task in the array
        const [movedTask] = tasksCopy.splice(sourceIndex, 1)
        tasksCopy.splice(targetIndex, 0, movedTask)

        // Update order values for all affected tasks
        const updatedTaskIds: string[] = []
        const newOrders: number[] = []

        // Update all tasks to ensure consistent ordering
        tasksCopy.forEach((task, index) => {
          updatedTaskIds.push(task.id)
          newOrders.push(index)
          task.order = index
        })

        // Reset drag state before updating UI to prevent rendering issues
        setDragOverTaskId(null)
        setDraggedTaskId(null)

        // Optimistically update the UI
        setLocalTasks(tasksCopy)

        // Call the backend to persist the changes
        if (onReorderTasks && updatedTaskIds.length > 0) {
          await onReorderTasks(updatedTaskIds, newOrders)

          // Show success toast
          toast({
            title: "Tasks reordered",
            description: "The task order has been updated successfully.",
          })
        }
      } catch (error) {
        console.error("Failed to reorder tasks:", error)

        // Revert to original order on error
        setLocalTasks(
          tasks.map((task, index) => ({
            ...task,
            order: task.order !== undefined ? task.order : index,
          })),
        )

        // Show error toast
        toast({
          title: "Reordering failed",
          description: "Failed to update task order. Please try again.",
          variant: "destructive",
        })
      } finally {
        // Use setTimeout to ensure state updates don't conflict
        setTimeout(() => {
          setIsReordering(false)
        }, 0)
      }
    },
    [localTasks, onReorderTasks, isReordering, tasks, toast],
  )

  const renderValue = useCallback(
    (task: Task, field: keyof Task | "assigneeName") => {
      switch (field) {
        case "status":
          return <span className="text-sm">{statusMap[task.status]}</span>
        case "priority":
          return (
            <span className={cn("text-sm font-medium", priorityColorMap[task.priority])}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </span>
          )
        case "assigneeName":
          return <span className="text-sm">{task.assignee?.name || "Unassigned"}</span>
        case "dueDate":
          return <span className="text-sm">{task.dueDate ? formatDate(task.dueDate) : "No due date"}</span>
        default:
          return null
      }
    },
    [formatDate, priorityColorMap, statusMap],
  )

  const handleDirectValueChange = useCallback(
    async (task: Task, field: keyof Task, value: any) => {
      if (isSubmitting) return

      setIsSubmitting(true)

      try {
        const updatedTask = { ...task, [field]: value }

        // Optimistically update the UI
        setLocalTasks((prevTasks) => prevTasks.map((t) => (t.id === task.id ? updatedTask : t)))

        // Call the API to update the task
        await onUpdateTask(updatedTask)
      } catch (error) {
        console.error(`Failed to update ${String(field)}:`, error)

        // Revert to original tasks on error
        setLocalTasks(tasksRef.current)

        // Show error toast
        toast({
          title: "Update failed",
          description: `Failed to update ${String(field)}. Please try again.`,
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting, onUpdateTask, toast],
  )

  const handleAssigneeChange = useCallback(
    async (task: Task, value: string) => {
      if (isSubmitting) return

      setIsSubmitting(true)

      try {
        const updatedTask = { ...task }

        if (value === "unassigned") {
          updatedTask.assignee = undefined
        } else {
          updatedTask.assignee = {
            name: value,
            initials: value
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase(),
          }
        }

        // Optimistically update the UI
        setLocalTasks((prevTasks) => prevTasks.map((t) => (t.id === task.id ? updatedTask : t)))

        // Call the API to update the task
        await onUpdateTask(updatedTask)
      } catch (error) {
        console.error("Failed to update assignee:", error)

        // Revert to original tasks on error
        setLocalTasks(tasksRef.current)

        // Show error toast
        toast({
          title: "Update failed",
          description: "Failed to update assignee. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting, onUpdateTask, toast],
  )

  const handleTagsChange = useCallback(
    async (task: Task, tags: string[]) => {
      if (isSubmitting) return

      setIsSubmitting(true)

      try {
        const updatedTask = { ...task, tags }

        // Optimistically update the UI
        setLocalTasks((prevTasks) => prevTasks.map((t) => (t.id === task.id ? updatedTask : t)))

        // Call the API to update the task
        await onUpdateTask(updatedTask)
      } catch (error) {
        console.error("Failed to update tags:", error)

        // Revert to original tasks on error
        setLocalTasks(tasksRef.current)

        // Show error toast
        toast({
          title: "Update failed",
          description: "Failed to update tags. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
        setEditingCell(null)
        setEditValues({})
      }
    },
    [isSubmitting, onUpdateTask, toast],
  )

  // Add this function to handle custom field changes
  const handleCustomFieldChange = useCallback(
    async (task: Task, fieldId: string, value: CustomFieldValue) => {
      if (isSubmitting) return

      setIsSubmitting(true)

      try {
        const updatedTask = {
          ...task,
          customFields: {
            ...(task.customFields || {}),
            [fieldId]: value,
          },
        }

        // Optimistically update the UI
        setLocalTasks((prevTasks) => prevTasks.map((t) => (t.id === task.id ? updatedTask : t)))

        // Call the API to update the task
        await onUpdateTask(updatedTask)
      } catch (error) {
        console.error("Failed to update custom field:", error)

        // Revert to original tasks on error
        setLocalTasks(tasksRef.current)

        // Show error toast
        toast({
          title: "Update failed",
          description: "Failed to update custom field. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting, onUpdateTask, toast],
  )

  const renderTagsCell = useCallback(
    (task: Task) => {
      if (isEditing(task.id, "tags")) {
        return (
          <div className="relative">
            <div className="absolute z-10 left-0 right-0 bg-background border rounded-md shadow-lg">
              <MultiSelect
                selected={task.tags || []}
                onChange={(tags) => handleTagsChange(task, tags)}
                placeholder="Select tags..."
                options={availableTags}
              />
            </div>
          </div>
        )
      }

      return (
        <div
          className="flex flex-wrap gap-1 max-w-[200px] min-h-[24px] cursor-pointer hover:bg-muted/50 rounded p-1"
          onClick={() => handleStartEdit(task.id, "tags", task.tags || [])}
        >
          {task.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs truncate max-w-[100px]">
              {tag}
              <button
                className="ml-1"
                onClick={(e) => {
                  e.stopPropagation()
                  const newTags = task.tags?.filter((t) => t !== tag) || []
                  handleTagsChange(task, newTags)
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {(!task.tags || task.tags.length === 0) && <span className="text-sm text-muted-foreground">No tags</span>}
        </div>
      )
    },
    [isEditing, handleStartEdit, handleTagsChange, availableTags],
  )

  // Add these helper functions before the return statement:
  const renderCustomFieldValue = useCallback((task: Task, field: CustomField) => {
    const value = task.customFields?.[field.id]

    if (value === undefined || value === null) {
      return <span className="text-muted-foreground text-sm">-</span>
    }

    switch (field.type) {
      case "checkbox":
        return <span>{value ? "✓" : "✗"}</span>
      case "select":
        return <span className="text-sm">{value as string}</span>
      case "multiselect":
        if (Array.isArray(value) && value.length > 0) {
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((item, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {item}
                </Badge>
              ))}
            </div>
          )
        }
        return <span className="text-muted-foreground text-sm">-</span>
      case "url":
        return (
          <a
            href={value as string}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {(value as string).length > 20 ? `${(value as string).substring(0, 20)}...` : (value as string)}
          </a>
        )
      case "number":
        return <span className="text-sm">{value.toString()}</span>
      case "text":
        return <span className="text-sm">{String(value)}</span>
      default:
        return <span className="text-sm">{String(value)}</span>
    }
  }, [])

  const renderCustomFieldEditor = useCallback(
    (task: Task, field: CustomField) => {
      const fieldId = `custom_${field.id}`
      const currentValue = task.customFields?.[field.id]

      switch (field.type) {
        case "text":
        case "url":
          return (
            <div className="flex items-center gap-2">
              <Input
                value={(currentValue as string) || ""}
                onChange={(e) => setEditValues((prev) => ({ ...prev, [fieldId]: e.target.value }))}
                className="h-8"
                autoFocus
              />
              <div className="flex items-center">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    handleCustomFieldChange(task, field.id, editValues[fieldId])
                    handleCancelEdit()
                  }}
                  disabled={isSubmitting}
                >
                  <CheckIcon className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )

        case "number":
          return (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={(currentValue as number) || ""}
                onChange={(e) => setEditValues((prev) => ({ ...prev, [fieldId]: e.target.valueAsNumber || null }))}
                className="h-8"
                autoFocus
              />
              <div className="flex items-center">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    handleCustomFieldChange(task, field.id, editValues[fieldId])
                    handleCancelEdit()
                  }}
                  disabled={isSubmitting}
                >
                  <CheckIcon className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )

        case "date":
          return (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={(currentValue as string) || ""}
                onChange={(e) => setEditValues((prev) => ({ ...prev, [fieldId]: e.target.value }))}
                className="h-8"
                autoFocus
              />
              <div className="flex items-center">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    handleCustomFieldChange(task, field.id, editValues[fieldId])
                    handleCancelEdit()
                  }}
                  disabled={isSubmitting}
                >
                  <CheckIcon className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )

        case "select":
          // Get the field options from the field configuration
          const fieldOptions = field.options || []
          return (
            <Select
              value={(currentValue as string) || ""}
              onValueChange={(value) => {
                handleCustomFieldChange(task, field.id, value)
                handleCancelEdit()
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {/* Add an empty option */}
                <SelectItem value="none">-</SelectItem>
                {/* Only show the actual options from the field configuration */}
                {fieldOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )

        case "multiselect":
          // For multiselect, we'll use the MultiSelect component
          const multiSelectOptions = field.options || []
          const selectedValues = Array.isArray(currentValue) ? currentValue : []

          // Initialize editValues with the current selection if not already set
          if (!editValues[fieldId]) {
            setEditValues((prev) => ({ ...prev, [fieldId]: selectedValues }))
          }

          return (
            <div className="relative z-50">
              <MultiSelect
                options={multiSelectOptions}
                selected={editValues[fieldId] || selectedValues}
                onChange={(selected) => {
                  setEditValues((prev) => ({ ...prev, [fieldId]: selected }))
                  handleCustomFieldChange(task, field.id, selected)
                  // Don't close the editor immediately to allow multiple selections
                }}
                placeholder="Select options..."
              />
              <div className="flex justify-end mt-2">
                <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={isSubmitting}>
                  Done
                </Button>
              </div>
            </div>
          )

        case "checkbox":
          return (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={!!currentValue}
                onCheckedChange={(checked) => {
                  handleCustomFieldChange(task, field.id, !!checked)
                  handleCancelEdit()
                }}
                disabled={isSubmitting}
              />
              <span>{currentValue ? "✓" : "✗"}</span>
            </div>
          )

        default:
          return null
      }
    },
    [editValues, handleCancelEdit, handleCustomFieldChange, isSubmitting, setEditValues],
  )

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[140px]">Status</TableHead>
            <TableHead className="w-[100px]">Priority</TableHead>
            <TableHead className="w-[140px]">Assignee</TableHead>
            <TableHead className="w-[120px]">Due Date</TableHead>
            <TableHead>Tags</TableHead>
            {/* Add custom field columns */}
            {customFields.map((field) => (
              <TableHead key={field.id} className="w-[150px]">
                {field.name}
                {field.isRequired && <span className="text-red-500 ml-1">*</span>}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {localTasks.map((task, index) => (
            <TableRow
              key={task.id}
              draggable
              onDragStart={(e) => handleDragStart(e, task.id, index)}
              onDragOver={(e) => handleDragOver(e, task.id)}
              onDragEnter={(e) => handleDragEnter(e, task.id)}
              onDragLeave={(e) => handleDragLeave(e, task.id)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, task.id, index)}
              className={cn(
                draggedTaskId === task.id && "table-row-dragging",
                dragOverTaskId === task.id && "table-row-drag-over",
              )}
            >
              <TableCell className="font-medium cursor-pointer hover:bg-muted/50">
                <div className="flex items-center">
                  <GripVertical className="h-4 w-4 mr-2 text-muted-foreground grip-handle" />
                  {isEditing(task.id, "title") ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValues.title}
                        onChange={(e) => setEditValues((prev) => ({ ...prev, title: e.target.value }))}
                        className="h-8"
                        autoFocus
                      />
                      <div className="flex items-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleSaveEdit(task)}
                          disabled={isSubmitting}
                        >
                          <CheckIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={handleCancelEdit}
                          disabled={isSubmitting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <span onClick={() => handleStartEdit(task.id, "title", task.title)}>{task.title}</span>
                  )}
                </div>
              </TableCell>

              <TableCell
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleStartEdit(task.id, "description", task.description)}
              >
                {isEditing(task.id, "description") ? (
                  <div className="flex items-center gap-2">
                    <Textarea
                      value={editValues.description}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, description: e.target.value }))}
                      className="h-20"
                      autoFocus
                    />
                    <div className="flex flex-col">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleSaveEdit(task)}
                        disabled={isSubmitting}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleCancelEdit}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <span className="line-clamp-2">{task.description}</span>
                )}
              </TableCell>

              <TableCell className="cursor-pointer" onClick={() => handleStartEdit(task.id, "status", task.status)}>
                {isEditing(task.id, "status") ? (
                  <Select
                    key={`status-select-${task.id}`}
                    value={editValues.status}
                    onValueChange={(value) => {
                      setEditValues({ ...editValues, status: value })
                      handleDirectValueChange(task, "status", value as Task["status"])
                      handleCancelEdit()
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  renderValue(task, "status")
                )}
              </TableCell>

              <TableCell className="cursor-pointer" onClick={() => handleStartEdit(task.id, "priority", task.priority)}>
                {isEditing(task.id, "priority") ? (
                  <Select
                    key={`priority-select-${task.id}`}
                    value={editValues.priority}
                    onValueChange={(value) => {
                      setEditValues({ ...editValues, priority: value })
                      handleDirectValueChange(task, "priority", value as Task["priority"])
                      handleCancelEdit()
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  renderValue(task, "priority")
                )}
              </TableCell>

              <TableCell
                className="cursor-pointer"
                onClick={() => handleStartEdit(task.id, "assigneeName", task.assignee?.name || "unassigned")}
              >
                {isEditing(task.id, "assigneeName") ? (
                  <Select
                    key={`assignee-select-${task.id}`}
                    value={editValues.assigneeName}
                    onValueChange={(value) => {
                      setEditValues({ ...editValues, assigneeName: value })
                      handleAssigneeChange(task, value)
                      handleCancelEdit()
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      <SelectItem value="John Doe">John Doe</SelectItem>
                      <SelectItem value="Jane Smith">Jane Smith</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  renderValue(task, "assigneeName")
                )}
              </TableCell>

              <TableCell
                className="cursor-pointer"
                onClick={() => handleStartEdit(task.id, "dueDate", task.dueDate || "")}
              >
                {isEditing(task.id, "dueDate") ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={editValues.dueDate}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, dueDate: e.target.value }))}
                      className="h-8"
                      autoFocus
                      disabled={isSubmitting}
                    />
                    <div className="flex items-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleSaveEdit(task)}
                        disabled={isSubmitting}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleCancelEdit}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  renderValue(task, "dueDate")
                )}
              </TableCell>

              <TableCell>{renderTagsCell(task)}</TableCell>
              {/* Add custom field cells */}
              {customFields.map((field) => (
                <TableCell
                  key={field.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleStartEdit(task.id, `custom_${field.id}`, task.customFields?.[field.id] || "")}
                >
                  {isEditing(task.id, `custom_${field.id}`)
                    ? renderCustomFieldEditor(task, field)
                    : renderCustomFieldValue(task, field)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <style jsx global>{`
        .table-row-dragging {
          opacity: 0.5;
          background-color: var(--background);
          cursor: grabbing !important;
        }
        
        .table-row-drag-over {
          border: 2px dashed var(--primary);
          position: relative;
        }
        
        .table-row-drag-over::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--primary);
          bottom: -1px;
        }
        
        .grip-handle {
          cursor: grab;
          display: inline-flex;
          align-items: center;
          opacity: 0.5;
          transition: opacity 0.2s;
        }
        
        .grip-handle:hover {
          opacity: 1;
        }
        
        tr:hover .grip-handle {
          opacity: 0.8;
        }
      `}</style>
    </div>
  )
}
