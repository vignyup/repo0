"use client"

import type React from "react"
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CalendarIcon, MessageSquareIcon, PencilIcon, PlusIcon, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import type { FilterOptions } from "./task-filter"
import { MultiSelect } from "./multi-select"
import { TaskTable } from "./task-table"
import { ViewToggle } from "./view-toggle"
import type { Task } from "@/lib/data"
import type { CustomField } from "@/lib/types"
import { memo } from "react"
import { useToast } from "@/hooks/use-toast"
import dynamic from "next/dynamic"

// 使用动态导入延迟加载不是立即需要的组件
const TaskCustomFieldsLazy = dynamic(
  () => import("./task-custom-fields").then((mod) => ({ default: mod.TaskCustomFields })),
  {
    ssr: false,
    loading: () => <div className="p-4 border rounded animate-pulse bg-muted/20"></div>,
  },
)

// 定义拖拽位置类型
type DragPosition = "before" | "after"

// 定义拖拽信息类型
type DragOverInfo = {
  taskId: string
  position: DragPosition
  index: number
}

// 优化 TaskCard 组件，使用 React.memo 并添加比较函数
const TaskCard = memo(
  ({
    task,
    onDragStart,
    onDragEnd,
    onDragOver,
    handleEditTask,
    formatDate,
    getPriorityColor,
    customFields,
    renderCustomFieldInCard,
    getStatusColor,
    draggedTask,
    index,
    dragOverInfo,
  }: any) => {
    const router = useRouter()
    return (
      <div
        key={`task-card-${task.id}`}
        draggable
        onDragStart={(e) => onDragStart(e, task, index)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver(e, task, index)}
        onClick={() => router.push(`/projects/${task.projectId}/tasks/${task.id}`)}
        className={cn(
          "cursor-pointer task-card relative",
          draggedTask?.id === task.id && "opacity-50",
          dragOverInfo?.taskId === task.id && dragOverInfo?.position === "before" && "before-indicator",
          dragOverInfo?.taskId === task.id && dragOverInfo?.position === "after" && "after-indicator",
        )}
        data-task-id={task.id}
        data-index={index}
      >
        <Card className="h-[180px] w-full max-w-[calc(100%-1px)] transition-all hover:border-primary hover:shadow-sm relative">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium truncate">{task.title}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditTask(e, task)
                }}
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex flex-col h-[116px]">
            <div className="flex-grow">
              <p className="text-sm text-muted-foreground line-clamp-2 h-10 overflow-hidden">{task.description}</p>
            </div>
            <div className="mt-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full", getPriorityColor(task.priority))} />
                  <span className="text-xs text-muted-foreground">
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </span>
                </div>
                {task.assignee && (
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{task.assignee.initials}</AvatarFallback>
                  </Avatar>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1 flex-grow overflow-hidden relative group">
                  {task.tags && task.tags.length > 0 ? (
                    <>
                      {/* Show only first 2 tags by default */}
                      <div className="flex items-center gap-1 overflow-hidden">
                        {task.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs whitespace-nowrap">
                            {tag}
                          </Badge>
                        ))}
                        {task.tags.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{task.tags.length - 2}</span>
                        )}
                      </div>

                      {/* Show all tags on hover */}
                      {task.tags.length > 2 && (
                        <div className="absolute left-0 top-0 z-10 hidden group-hover:flex flex-wrap gap-1 bg-card p-2 rounded-md shadow-md border">
                          {task.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex-grow"></div>
                  )}
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs whitespace-nowrap",
                    getStatusColor(task.status) === "bg-black"
                      ? "bg-black text-white"
                      : getStatusColor(task.status).replace("bg-", "text-"),
                  )}
                >
                  {task.status === "in-progress"
                    ? "In Progress"
                    : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                </Badge>
              </div>
              {(task.dueDate || task.comments > 0) && (
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  {task.dueDate && (
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{formatDate(task.dueDate)}</span>
                    </div>
                  )}
                  {task.comments > 0 && (
                    <div className="flex items-center gap-1">
                      <MessageSquareIcon className="h-3 w-3" />
                      <span>{task.comments}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  },
  // 添加比较函数，只有当关键属性变化时才重新渲染
  (prevProps, nextProps) => {
    return (
      prevProps.task.id === nextProps.task.id &&
      prevProps.task.title === nextProps.task.title &&
      prevProps.task.description === nextProps.task.description &&
      prevProps.task.status === nextProps.task.status &&
      prevProps.task.priority === nextProps.task.priority &&
      prevProps.draggedTask?.id === nextProps.draggedTask?.id &&
      prevProps.index === nextProps.index &&
      JSON.stringify(prevProps.dragOverInfo) === JSON.stringify(nextProps.dragOverInfo) &&
      JSON.stringify(prevProps.task.tags) === JSON.stringify(nextProps.task.tags)
    )
  },
)

// 优化 TaskColumn 组件，使用 React.memo 并添加比较函数
const TaskColumn = memo(
  ({
    column,
    filteredTasksList,
    handleDragOver,
    handleDrop,
    handleDragEnter,
    handleDragLeave,
    dragOverColumn,
    handleAddTask,
    draggedTask,
    onDragStart,
    onDragEnd,
    onDragOverTask,
    handleEditTask,
    formatDate,
    getPriorityColor,
    customFields,
    renderCustomFieldInCard,
    getStatusColor,
    dragOverInfo,
  }: any) => {
    // 使用 useMemo 优化列内任务的过滤，避免不必要的重新计算
    const tasksInColumn = useMemo(() => {
      return filteredTasksList.filter((task) => task.status === column.id)
    }, [filteredTasksList, column.id])

    return (
      <div
        key={`task-column-${column.id}`}
        className={cn(
          "flex flex-col p-4 rounded-lg w-full min-w-0",
          dragOverColumn === column.id && "outline outline-2 outline-dashed outline-blue-500 bg-blue-50/50",
        )}
        onDragOver={(e) => handleDragOver(e, column.id)}
        onDrop={(e) => handleDrop(e, column.id as Task["status"])}
        onDragEnter={(e) => handleDragEnter(e, column.id)}
        onDragLeave={(e) => handleDragLeave(e, column.id)}
        data-column-id={column.id}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium">{column.title}</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{tasksInColumn.length}</Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleAddTask(column.id as Task["status"])}
            >
              <PlusIcon className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3 min-h-[200px]">
          {tasksInColumn.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOverTask}
              handleEditTask={handleEditTask}
              formatDate={formatDate}
              getPriorityColor={getPriorityColor}
              customFields={customFields}
              renderCustomFieldInCard={renderCustomFieldInCard}
              getStatusColor={getStatusColor}
              draggedTask={draggedTask}
              dragOverInfo={dragOverInfo}
            />
          ))}
          {tasksInColumn.length === 0 && (
            <div
              className="flex items-center justify-center h-24 border border-dashed rounded-lg text-muted-foreground text-sm"
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleDragOver(e, column.id)
              }}
            >
              No tasks
            </div>
          )}
        </div>
      </div>
    )
  },
  // 添加比较函数，只有当关键属性变化时才重新渲染
  (prevProps, nextProps) => {
    return (
      prevProps.column.id === nextProps.column.id &&
      prevProps.dragOverColumn === nextProps.dragOverColumn &&
      prevProps.draggedTask?.id === nextProps.draggedTask?.id &&
      JSON.stringify(prevProps.dragOverInfo) === JSON.stringify(nextProps.dragOverInfo) &&
      // 使用任务ID和状态的组合来比较任务列表是否变化
      JSON.stringify(
        prevProps.filteredTasksList
          .filter((t) => t.status === prevProps.column.id)
          .map((t) => ({ id: t.id, status: t.status })),
      ) ===
        JSON.stringify(
          nextProps.filteredTasksList
            .filter((t) => t.status === nextProps.column.id)
            .map((t) => ({ id: t.id, status: t.status })),
        )
    )
  },
)

export type TaskBoardProps = {
  tasks: Task[]
  projectId: string
  onTasksChange?: (tasks: Task[]) => void
  customFields?: CustomField[]
  onCustomFieldsChange?: (fields: CustomField[]) => void
}

type ViewMode = "board" | "table"

// Add this to the existing styles
const RequiredIndicator = () => <span className="text-red-500 mr-0.5">*</span>

// 将过滤函数移到组件外部并使用 useMemo 缓存结果
const filterTasks = (tasksToFilter: Task[], filterOptions: FilterOptions, query: string) => {
  let result = [...tasksToFilter]

  // Add search filter
  if (query) {
    const lowerQuery = query.toLowerCase()
    result = result.filter(
      (task) => task.title.toLowerCase().includes(lowerQuery) || task.description.toLowerCase().includes(lowerQuery),
    )
  }

  // Filter by title
  if (filterOptions.title) {
    const lowerTitle = filterOptions.title.toLowerCase()
    result = result.filter((task) => task.title.toLowerCase().includes(lowerTitle))
  }

  // Filter by assignee
  if (filterOptions.assignee) {
    if (filterOptions.assignee === "unassigned") {
      result = result.filter((task) => !task.assignee)
    } else {
      result = result.filter((task) => task.assignee?.name === filterOptions.assignee)
    }
  }

  // Filter by priority
  if (filterOptions.priority) {
    result = result.filter((task) => task.priority === filterOptions.priority)
  }

  // Filter by due date range
  if (filterOptions.dueDateFrom) {
    result = result.filter((task) => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate)
      return taskDate >= filterOptions.dueDateFrom!
    })
  }

  if (filterOptions.dueDateTo) {
    result = result.filter((task) => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate)
      return taskDate <= filterOptions.dueDateTo!
    })
  }

  // Filter by tags
  if (filterOptions.tags.length > 0) {
    result = result.filter((task) => {
      if (!task.tags || task.tags.length === 0) return false
      return filterOptions.tags.some((tag) => task.tags!.includes(tag))
    })
  }

  return result
}

// 优化自定义字段渲染函数
const renderCustomFieldInCard = (task: Task, field: CustomField) => {
  const value = task.customFields?.[field.id]

  if (value === undefined || value === null) {
    return null
  }

  switch (field.type) {
    case "checkbox":
      return value ? "✓" : "✗"
    case "select":
      return <span className="text-xs truncate max-w-[100px] inline-block">{value as string}</span>
    case "url":
      return (
        <a
          href={value as string}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline text-xs truncate max-w-[100px] inline-block"
          onClick={(e) => e.stopPropagation()}
        >
          {(value as string).length > 15 ? `${(value as string).substring(0, 15)}...` : (value as string)}
        </a>
      )
    case "number":
      return <span className="text-xs truncate max-w-[100px] inline-block">{value.toString()}</span>
    case "text":
      return <span className="text-xs truncate max-w-[100px] inline-block">{String(value)}</span>
    default:
      return <span className="text-xs truncate max-w-[100px] inline-block">{String(value)}</span>
  }
}

// 优化状态颜色函数
const getStatusColorMemo = (() => {
  const cache = new Map<string, string>()

  return (status: Task["status"]) => {
    if (cache.has(status)) {
      return cache.get(status)!
    }

    let color
    switch (status) {
      case "todo":
        color = "bg-gray-500"
        break
      case "in-progress":
        color = "bg-red-500"
        break
      case "review":
        color = "bg-purple-500"
        break
      case "done":
        color = "bg-black"
        break
      default:
        color = "bg-gray-500"
    }

    cache.set(status, color)
    return color
  }
})()

function TaskBoard({
  tasks: initialTasks,
  projectId,
  onTasksChange,
  customFields: initialCustomFields = [],
  onCustomFieldsChange,
}: TaskBoardProps) {
  // Move the useToast hook to the top of the component
  const { toast } = useToast()

  // Add state for custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>(initialCustomFields)
  const router = useRouter()
  const [initialized, setInitialized] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [filters, setFilters] = useState<FilterOptions>({
    title: "",
    assignee: "",
    priority: "",
    dueDateFrom: undefined,
    dueDateTo: undefined,
    tags: [],
  })
  const [viewMode, setViewMode] = useState<ViewMode>("board")
  const [searchQuery, setSearchQuery] = useState("")

  // 修改拖拽状态管理
  const [dragOverInfo, setDragOverInfo] = useState<DragOverInfo | null>(null)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isMovingTask, setIsMovingTask] = useState(isSaving)

  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskStatus, setNewTaskStatus] = useState<Task["status"]>("todo")
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskDescription, setNewTaskDescription] = useState("")
  const [newTaskPriority, setNewTaskPriority] = useState<Task["priority"]>("medium")
  const [newTaskDueDate, setNewTaskDueDate] = useState("")
  const [newTaskAssignee, setNewTaskAssignee] = useState("")
  const [newTaskTags, setNewTaskTags] = useState<string[]>([])
  const [isSubmittingNewTask, setIsSubmittingNewTask] = useState(false)

  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const dragCounter = useRef<Record<string, number>>({})
  const originalTaskRef = useRef<Task | null>(null)
  const draggedTaskIdRef = useRef<string | null>(null)
  const draggedTaskSourceStatusRef = useRef<string | null>(null)
  const draggedTaskSourceIndexRef = useRef<number | null>(null)
  const tasksRef = useRef<Task[]>([])
  const initialTasksRef = useRef<Task[]>([])
  const isUpdatingRef = useRef(false)
  const isFilteringRef = useRef(false)
  const prevTasksStringRef = useRef<string>("")

  // 使用防抖处理搜索查询
  const debouncedSearchRef = useRef<NodeJS.Timeout | null>(null)
  const [debouncedQuery, setDebouncedQuery] = useState("")

  // 处理搜索输入的防抖
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)

    if (debouncedSearchRef.current) {
      clearTimeout(debouncedSearchRef.current)
    }

    debouncedSearchRef.current = setTimeout(() => {
      setDebouncedQuery(value)
    }, 300)
  }, [])

  // Extract all unique tags from tasks
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>()
    tasks.forEach((task) => {
      if (task.tags) {
        task.tags.forEach((tag) => tagSet.add(tag))
      }
    })
    return Array.from(tagSet)
  }, [tasks])

  // Use useMemo for filtered tasks
  const filteredTasksList = useMemo(() => {
    if (!initialized) return []
    return filterTasks(tasks, filters, debouncedQuery)
  }, [tasks, filters, debouncedQuery, initialized])

  // 使用 useCallback 优化 getPriorityColor 函数
  const getPriorityColor = useCallback((priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }, [])

  // 使用 useCallback 优化 formatDate 函数
  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return null
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString()
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString
    }
  }, [])

  // Initialize tasks only once
  useEffect(() => {
    if (!initialized) {
      console.log("Initializing TaskBoard with tasks:", initialTasks)

      try {
        // First check if we have tasks in memory to avoid localStorage lookup
        if (initialTasks && initialTasks.length > 0) {
          console.log("Using provided initialTasks")
          tasksRef.current = initialTasks
          setTasks(initialTasks)
          setInitialized(true)
          return
        }

        // Then try localStorage as a fallback
        const storedTasks = localStorage.getItem(`project-${projectId}-tasks`)
        let tasksToUse = initialTasks

        if (storedTasks) {
          try {
            const parsedTasks = JSON.parse(storedTasks)
            // Only use stored tasks if they exist and have data
            if (parsedTasks && parsedTasks.length > 0) {
              tasksToUse = parsedTasks
              console.log("Loaded tasks from localStorage:", tasksToUse)
            }
          } catch (error) {
            console.error("Error parsing stored tasks:", error)
          }
        } else {
          console.log("No stored tasks found, using initialTasks")
        }

        // Set refs first, then state to avoid re-renders
        initialTasksRef.current = initialTasks
        tasksRef.current = tasksToUse

        // Use requestAnimationFrame to defer state update to next frame
        requestAnimationFrame(() => {
          setTasks(tasksToUse)
          setInitialized(true)
        })
      } catch (error) {
        console.error("Error during initialization:", error)
        // Fallback to initial tasks
        tasksRef.current = initialTasks
        setTasks(initialTasks)
        setInitialized(true)
      }
    }
  }, [projectId, initialTasks, initialized])

  // Update when initialTasks change significantly
  useEffect(() => {
    if (
      initialized &&
      initialTasksRef.current !== initialTasks &&
      JSON.stringify(initialTasksRef.current) !== JSON.stringify(initialTasks)
    ) {
      console.log("Initial tasks changed significantly, updating:", initialTasks)
      initialTasksRef.current = initialTasks
      setTasks(initialTasks)
      tasksRef.current = initialTasks
    }
  }, [initialTasks, initialized])

  // Save tasks to localStorage and notify parent when tasks change
  useEffect(() => {
    if (initialized && tasks.length > 0) {
      const currentTasksString = JSON.stringify(tasks)
      if (currentTasksString !== prevTasksStringRef.current) {
        console.log("Saving tasks to localStorage:", tasks)

        // 使用 requestIdleCallback 在浏览器空闲时执行非关键操作
        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
          ;(window as any).requestIdleCallback(() => {
            localStorage.setItem(`project-${projectId}-tasks`, currentTasksString)
          })
        } else {
          // 降级处理
          setTimeout(() => {
            localStorage.setItem(`project-${projectId}-tasks`, currentTasksString)
          }, 0)
        }

        tasksRef.current = tasks
        prevTasksStringRef.current = currentTasksString

        // Notify parent component of task changes
        if (onTasksChange) {
          onTasksChange(tasks)
        }
      }
    }
  }, [tasks, projectId, initialized, onTasksChange])

  // Add this after the other useEffect hooks
  useEffect(() => {
    if (initialized) {
      // Only use the custom fields passed from the parent component
      setCustomFields(initialCustomFields)

      // Store in localStorage for consistency
      try {
        localStorage.setItem(`project-${projectId}-custom-fields`, JSON.stringify(initialCustomFields))
      } catch (err) {
        console.error("Error storing custom fields in localStorage:", err)
      }
    }
  }, [initialCustomFields, initialized, projectId])

  // 清理防抖定时器
  useEffect(() => {
    return () => {
      if (debouncedSearchRef.current) {
        clearTimeout(debouncedSearchRef.current)
      }
    }
  }, [])

  // Find the handleUpdateTask function and update it to also update localStorage
  const handleUpdateTask = useCallback(
    (updatedTask: Task) => {
      if (isUpdatingRef.current) return

      try {
        isUpdatingRef.current = true
        setTasks((prevTasks) => {
          const newTasks = prevTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
          tasksRef.current = newTasks

          // Update localStorage immediately
          try {
            localStorage.setItem(`project-${projectId}-tasks`, JSON.stringify(newTasks))
          } catch (err) {
            console.error("Error updating localStorage:", err)
          }

          return newTasks
        })
      } finally {
        // Use setTimeout to ensure the update completes before clearing the flag
        setTimeout(() => {
          isUpdatingRef.current = false
        }, 0)
      }
    },
    [projectId],
  )

  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters)
  }, [])

  const columns = useMemo(
    () => [
      { id: "todo", title: "To Do" },
      { id: "in-progress", title: "In Progress" },
      { id: "review", title: "Review" },
      { id: "done", title: "Done" },
    ],
    [],
  )

  // 修改 handleDragStart 函数，添加 index 参数
  const handleDragStart = useCallback((e: React.DragEvent, task: Task, index: number) => {
    console.log("Drag started for task:", task.id, task, "at index:", index)

    // Store the original task for potential reversion
    originalTaskRef.current = JSON.parse(JSON.stringify(task))
    draggedTaskIdRef.current = task.id
    draggedTaskSourceStatusRef.current = task.status
    draggedTaskSourceIndexRef.current = index

    // Set data for the drag operation
    e.dataTransfer.setData("text/plain", task.id)
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        taskId: task.id,
        sourceStatus: task.status,
        sourceIndex: index,
      }),
    )
    e.dataTransfer.effectAllowed = "move"

    // Set the dragged task in state
    setDraggedTask(task)

    // Add a class to the dragged element for visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add("dragging")
    }
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent, columnId: string) => {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = "move"

      if (dragOverColumn !== columnId) {
        setDragOverColumn(columnId)
      }
    },
    [dragOverColumn],
  )

  const handleDragEnter = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.stopPropagation()

    dragCounter.current[columnId] = (dragCounter.current[columnId] || 0) + 1
    setDragOverColumn(columnId)
  }, [])

  const handleDragLeave = useCallback(
    (e: React.DragEvent, columnId: string) => {
      e.preventDefault()
      e.stopPropagation()

      dragCounter.current[columnId] = (dragCounter.current[columnId] || 0) - 1
      if (dragCounter.current[columnId] <= 0) {
        dragCounter.current[columnId] = 0
        if (dragOverColumn === columnId) {
          setDragOverColumn(null)
        }
      }
    },
    [dragOverColumn],
  )

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // Remove dragging class
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove("dragging")
    }

    // Reset drag state
    setDraggedTask(null)
    setDragOverColumn(null)
    setDragOverInfo(null)
    draggedTaskIdRef.current = null
    draggedTaskSourceStatusRef.current = null
    draggedTaskSourceIndexRef.current = null

    // Reset all drag counters
    Object.keys(dragCounter.current).forEach((key) => {
      dragCounter.current[key] = 0
    })
  }, [])

  // 修改 onDragOverTask 函数，增加精确的拖拽位置检测
  const onDragOverTask = useCallback((e: React.DragEvent, task: Task, index: number) => {
    e.preventDefault()
    e.stopPropagation()

    // 设置拖拽效果
    e.dataTransfer.dropEffect = "move"

    // 获取鼠标在目标元素上的相对位置
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    // 确定拖放位置：上半部分放在任务前，下半部分放在任务后
    const position: DragPosition = y < height / 2 ? "before" : "after"

    // 更新当前悬停的任务信息
    setDragOverInfo({
      taskId: task.id,
      position,
      index,
    })

    // 防止事件冒泡到列
    e.stopPropagation()
  }, [])

  // 新增优化的顺序计算函数
  const calculateNewOrder = useCallback((tasks: Task[], targetIndex: number, position: DragPosition): number => {
    // 列表为空的情况
    if (tasks.length === 0) return 1000

    // 拖到列表最前面
    if (targetIndex === 0 && position === "before") {
      return Math.max(0, (tasks[0].order || 0) - 1000)
    }

    // 拖到列表最后面
    if (targetIndex === tasks.length - 1 && position === "after") {
      return (tasks[tasks.length - 1].order || 0) + 1000
    }

    // 拖到两个任务之间
    const prevIndex = position === "before" ? targetIndex - 1 : targetIndex
    const nextIndex = position === "before" ? targetIndex : targetIndex + 1

    // 确保索引有效
    if (prevIndex >= 0 && nextIndex < tasks.length) {
      const prevOrder = tasks[prevIndex].order || 0
      const nextOrder = tasks[nextIndex].order || 0
      return prevOrder + Math.floor((nextOrder - prevOrder) / 2)
    }

    // 默认情况，添加到末尾
    return (tasks[tasks.length - 1].order || 0) + 1000
  }, [])

  // 优化 handleDrop 函数，使用批处理和防抖
  const handleDrop = useCallback(
    async (e: React.DragEvent, newStatus: Task["status"]) => {
      e.preventDefault()
      e.stopPropagation()

      try {
        // 获取拖拽数据
        const taskId = e.dataTransfer.getData("text/plain")
        const dragData = JSON.parse(e.dataTransfer.getData("application/json") || "{}")
        const sourceStatus = dragData.sourceStatus || draggedTaskSourceStatusRef.current

        if (!taskId) {
          console.log("No taskId found")
          setDragOverColumn(null)
          setDraggedTask(null)
          setDragOverInfo(null)
          return
        }

        const taskToUpdate = tasksRef.current.find((t) => t.id === taskId)
        if (!taskToUpdate) {
          console.error("Task not found in current state")
          setDragOverColumn(null)
          setDraggedTask(null)
          setDragOverInfo(null)
          return
        }

        // 设置移动标志，防止重复操作
        if (isMovingTask) return

        setIsMovingTask(true)

        // 获取目标列中的任务
        const tasksInColumn = filteredTasksList.filter((t) => t.status === newStatus)

        // 根据拖放位置计算新的顺序值
        let newOrder: number

        if (dragOverInfo) {
          // 如果有具体的拖放位置信息，使用精确计算
          newOrder = calculateNewOrder(tasksInColumn, dragOverInfo.index, dragOverInfo.position)
        } else {
          // 如果只有列信息，则放在列末尾
          if (tasksInColumn.length === 0) {
            newOrder = 1000
          } else {
            const lastTask = tasksInColumn[tasksInColumn.length - 1]
            newOrder = (lastTask.order || 0) + 1000
          }
        }

        // 创建更新后的任务对象（只更新这一个任务）
        const updatedTask = {
          ...JSON.parse(JSON.stringify(taskToUpdate)),
          status: newStatus, // 如果跨列拖拽，更新状态
          order: newOrder, // 更新顺序值
        }

        // 重置拖拽状态
        setDragOverColumn(null)
        setDraggedTask(null)
        setDragOverInfo(null)

        // 乐观更新UI
        handleUpdateTask(updatedTask)

        // 使用 AbortController 实现请求取消功能
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

        // 发送API请求，只更新这一个任务
        try {
          console.log("Sending API request to update task:", updatedTask)
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedTask),
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          // 检查是否是 429 错误
          if (response.status === 429) {
            throw new Error("Too many requests. Please try again later.")
          }

          if (!response.ok) {
            // 只有在非429错误时才尝试解析JSON
            const errorData = await response.json().catch(() => ({ error: "Unknown error occurred" }))
            throw new Error(errorData.error || "Failed to update task status")
          }

          // 解析响应
          const result = await response.json().catch(() => {
            console.error("Failed to parse response as JSON")
            return updatedTask // 如果解析失败，使用我们已经有的更新后的任务
          })

          console.log("Task updated successfully:", result)

          // 显示成功提示
          toast({
            title: "任务已更新",
            description: sourceStatus === newStatus ? "任务顺序已成功更新" : "任务状态和顺序已成功更新",
          })
        } catch (error) {
          console.error("Error updating task:", error)

          // 恢复原始状态
          if (originalTaskRef.current) {
            handleUpdateTask(originalTaskRef.current)
            toast({
              title: "更新失败",
              description: error instanceof Error ? error.message : "更新任务失败，已恢复原始状态",
              variant: "destructive",
            })
          }
        } finally {
          setIsMovingTask(false)
          originalTaskRef.current = null
        }
      } catch (error) {
        console.error("Error in handleDrop:", error)
        setIsMovingTask(false)
      }
    },
    [filteredTasksList, handleUpdateTask, dragOverInfo, calculateNewOrder, isMovingTask, toast],
  )

  const handleEditTask = useCallback(
    (e: React.MouseEvent | null, task: Task) => {
      e?.stopPropagation() // Prevent card click from triggering drag
      console.log("Editing task:", task)

      // Create a clean copy of the task with only the custom fields that exist in the current project
      const taskCopy = { ...task }

      // Filter custom fields to only include those defined in the project
      if (taskCopy.customFields && customFields.length > 0) {
        const filteredCustomFields: Record<string, any> = {}
        customFields.forEach((field) => {
          if (taskCopy.customFields && taskCopy.customFields[field.id] !== undefined) {
            filteredCustomFields[field.id] = taskCopy.customFields[field.id]
          }
        })
        taskCopy.customFields = filteredCustomFields
      }

      setEditingTask(taskCopy)
      setIsEditing(true)
    },
    [customFields],
  )

  // 优化 handleSaveTask 函数，使用批处理和防抖
  const handleSaveTask = useCallback(async () => {
    if (!editingTask) return

    // Validate required fields
    const errors: Record<string, string> = {}

    // Validate required custom fields
    customFields.forEach((field) => {
      if (field.isRequired) {
        const value = editingTask.customFields?.[field.id]

        if (value === undefined || value === null || value === "") {
          errors[field.id] = `${field.name}是必填字段`
        }
      }
    })

    if (Object.keys(errors).length > 0) {
      toast({
        title: "表单验证失败",
        description: "请填写所有必填字段",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      // Create a deep copy of the task to ensure we're not modifying the original reference
      const taskToUpdate = JSON.parse(JSON.stringify(editingTask))

      // Optimistically update UI first for immediate feedback
      setTasks((prevTasks) => {
        const updatedTasks = prevTasks.map((t) => (t.id === taskToUpdate.id ? taskToUpdate : t))

        // Update localStorage immediately
        try {
          localStorage.setItem(`project-${projectId}-tasks`, JSON.stringify(updatedTasks))
        } catch (err) {
          console.error("Error updating localStorage:", err)
        }

        return updatedTasks
      })

      // Close the dialog immediately after optimistic update
      setIsEditing(false)
      setEditingTask(null)

      // Show success toast
      toast({
        title: "任务已更新",
        description: "任务已成功更新",
      })

      // 使用 AbortController 实现请求取消功能
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

      // Send API request in the background
      fetch(`/api/tasks/${taskToUpdate.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskToUpdate),
        signal: controller.signal,
      })
        .then((response) => {
          clearTimeout(timeoutId)

          // 检查是否是 429 错误
          if (response.status === 429) {
            throw new Error("Too many requests. Please try again later.")
          }

          if (!response.ok) {
            throw new Error("Failed to update task")
          }
          return response.json().catch(() => taskToUpdate) // 如果解析失败，使用我们已经有的更新后的任务
        })
        .then((updatedTask) => {
          // Silently update the state with the server response
          setTasks((prevTasks) => prevTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
        })
        .catch((error) => {
          console.error("Error updating task:", error)

          // Show error toast
          toast({
            title: "更新失败",
            description: error instanceof Error ? error.message : "保存更改时出错，请重试",
            variant: "destructive",
          })
        })
    } catch (error) {
      console.error("Error in task update:", error)

      // Show error toast
      toast({
        title: "更新失败",
        description: error instanceof Error ? error.message : "更新任务失败，请重试",
        variant: "destructive",
      })

      setIsSaving(false)
    }
  }, [editingTask, projectId, toast, customFields])

  const handleAddTask = useCallback((status: Task["status"]) => {
    setNewTaskStatus(status)
    setNewTaskTitle("")
    setNewTaskDescription("")
    setNewTaskPriority("medium")
    setNewTaskDueDate("")
    setNewTaskAssignee("")
    setNewTaskTags([])
    setIsAddingTask(true)
  }, [])

  // 优化 handleCreateTask 函数，添加错误处理和请求超时
  const handleCreateTask = useCallback(async () => {
    if (!newTaskTitle || isSubmittingNewTask) return

    setIsSubmittingNewTask(true)

    try {
      const payload = {
        projectId,
        title: newTaskTitle,
        description: newTaskDescription || "",
        status: newTaskStatus,
        priority: newTaskPriority,
        dueDate: newTaskDueDate || undefined,
        assignee:
          newTaskAssignee && newTaskAssignee !== "unassigned"
            ? {
                name: newTaskAssignee,
                initials: newTaskAssignee
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase(),
              }
            : undefined,
        tags: newTaskTags.length > 0 ? newTaskTags : undefined,
      }

      console.log("Creating task with payload:", payload)

      // First close the dialog to prevent any state updates from the dialog
      setIsAddingTask(false)

      // Reset form fields
      setNewTaskTitle("")
      setNewTaskDescription("")
      setNewTaskPriority("medium")
      setNewTaskDueDate("")
      setNewTaskAssignee("")
      setNewTaskTags([])

      // 使用 AbortController 实现请求取消功能
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // 检查是否是 429 错误
      if (response.status === 429) {
        throw new Error("Too many requests. Please try again later.")
      }

      if (!response.ok) {
        // 只有在非429错误时才尝试解析JSON
        const errorData = await response.json().catch(() => ({ error: "Unknown error occurred" }))
        throw new Error(errorData.error || "Failed to create task")
      }

      // 解析响应
      const newTask = await response.json().catch(() => {
        console.error("Failed to parse response as JSON")
        throw new Error("Failed to parse server response")
      })

      console.log("Task created successfully:", newTask)

      // Update tasks state with the new task
      setTasks((prevTasks) => {
        const updatedTasks = [...prevTasks, newTask]
        tasksRef.current = updatedTasks
        return updatedTasks
      })
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        title: "Failed to create task",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingNewTask(false)
    }
  }, [
    newTaskTitle,
    isSubmittingNewTask,
    projectId,
    newTaskDescription,
    newTaskStatus,
    newTaskPriority,
    newTaskDueDate,
    newTaskAssignee,
    newTaskTags,
    toast,
  ])

  // 优化 handleUpdateTaskInline 函数，正确处理 429 错误和请求超时
  const handleUpdateTaskInline = useCallback(
    async (updatedTask: Task) => {
      try {
        console.log("Updating task inline:", updatedTask)

        // 使用 AbortController 实现请求取消功能
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

        const response = await fetch(`/api/tasks/${updatedTask.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedTask),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        // 检查是否是 429 错误
        if (response.status === 429) {
          throw new Error("Too many requests. Please try again later.")
        }

        if (!response.ok) {
          // 只有在非429错误时才尝试解析JSON
          const errorData = await response.json().catch(() => ({ error: "Unknown error occurred" }))
          throw new Error(errorData.error || "Failed to update task")
        }

        // 解析响应
        const result = await response.json().catch(() => {
          console.error("Failed to parse response as JSON")
          return updatedTask // 如果解析失败，使用我们已经有的更新后的任务
        })

        console.log("Task updated successfully:", result)

        // Update local state immediately
        handleUpdateTask(result)

        return Promise.resolve()
      } catch (error) {
        console.error("Error updating task:", error)
        return Promise.reject(error)
      }
    },
    [handleUpdateTask],
  )

  // Add this useEffect for cleanup
  useEffect(() => {
    return () => {
      // Cleanup function to prevent memory leaks
      isUpdatingRef.current = false
      draggedTaskIdRef.current = null
      originalTaskRef.current = null
    }
  }, [])

  // Add this function to handle custom field changes
  type CustomFieldValue = string | number | boolean | null
  const handleCustomFieldChange = (taskId: string, fieldId: string, value: CustomFieldValue) => {
    if (isUpdatingRef.current) return

    try {
      isUpdatingRef.current = true
      setTasks((prevTasks) => {
        const newTasks = prevTasks.map((task) => {
          if (task.id === taskId) {
            const customFields = task.customFields || {}
            return {
              ...task,
              customFields: {
                ...customFields,
                [fieldId]: value,
              },
            }
          }
          return task
        })
        tasksRef.current = newTasks
        return newTasks
      })
    } finally {
      isUpdatingRef.current = false
    }
  }

  // Add this function to handle custom fields updates
  const handleCustomFieldsChange = (fields: CustomField[]) => {
    setCustomFields(fields)
    if (onCustomFieldsChange) {
      onCustomFieldsChange(fields)
    }
  }

  // 优化 handleReorderTasks 函数，使用批处理和请求超时
  const handleReorderTasks = async (taskIds: string[], newOrders: number[]) => {
    if (isUpdatingRef.current) return

    try {
      isUpdatingRef.current = true

      // 使用 AbortController 实现请求取消功能
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

      // 批量更新任务顺序
      const response = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskIds, newOrders }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error("Failed to reorder tasks")
      }

      // 乐观更新UI
      setTasks((prevTasks) => {
        const updatedTasks = [...prevTasks]
        taskIds.forEach((taskId, index) => {
          const taskIndex = updatedTasks.findIndex((t) => t.id === taskId)
          if (taskIndex !== -1) {
            updatedTasks[taskIndex] = {
              ...updatedTasks[taskIndex],
              order: newOrders[index],
            }
          }
        })
        return updatedTasks
      })

      return true
    } catch (error) {
      console.error("Error reordering tasks:", error)
      toast({
        title: "Reordering failed",
        description: error instanceof Error ? error.message : "Failed to update task order. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      isUpdatingRef.current = false
    }
  }

  if (!initialized) {
    return <div className="flex items-center justify-center h-64">Loading tasks...</div>
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <ViewToggle currentView={viewMode} onViewChange={setViewMode} />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8 w-[200px] sm:w-[300px]"
            />
          </div>
        </div>
      </div>

      {viewMode === "board" ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-full">
          {columns.map((column) => (
            <TaskColumn
              key={column.id}
              column={column}
              filteredTasksList={filteredTasksList}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              handleDragEnter={handleDragEnter}
              handleDragLeave={handleDragLeave}
              dragOverColumn={dragOverColumn}
              handleAddTask={handleAddTask}
              draggedTask={draggedTask}
              dragOverInfo={dragOverInfo}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOverTask={onDragOverTask}
              handleEditTask={handleEditTask}
              formatDate={formatDate}
              getPriorityColor={getPriorityColor}
              customFields={customFields}
              renderCustomFieldInCard={renderCustomFieldInCard}
              getStatusColor={getStatusColorMemo}
            />
          ))}
        </div>
      ) : (
        <TaskTable
          tasks={filteredTasksList}
          onUpdateTask={handleUpdateTaskInline}
          onReorderTasks={handleReorderTasks}
          availableTags={availableTags}
          customFields={customFields}
        />
      )}

      {isEditing && editingTask && (
        <Dialog
          open={isEditing}
          onOpenChange={(open) => {
            if (!open && !isSaving) {
              setIsEditing(false)
              setEditingTask(null)
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={editingTask.title}
                    onChange={(e) => setEditingTask((prev) => (prev ? { ...prev, title: e.target.value } : null))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingTask.description}
                    onChange={(e) => setEditingTask((prev) => (prev ? { ...prev, description: e.target.value } : null))}
                    rows={3}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={editingTask.priority}
                      onValueChange={(value) =>
                        setEditingTask((prev) => (prev ? { ...prev, priority: value as Task["priority"] } : null))
                      }
                    >
                      <SelectTrigger>
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
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={editingTask.dueDate || ""}
                      onChange={(e) => setEditingTask((prev) => (prev ? { ...prev, dueDate: e.target.value } : null))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editingTask.status}
                    onValueChange={(value) =>
                      setEditingTask((prev) => (prev ? { ...prev, status: value as Task["status"] } : null))
                    }
                  >
                    <SelectTrigger>
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
                  <Label>Assignee</Label>
                  <Select
                    value={editingTask.assignee?.name || "unassigned"}
                    onValueChange={(value) =>
                      setEditingTask((prev) =>
                        prev
                          ? {
                              ...prev,
                              assignee:
                                value !== "unassigned"
                                  ? {
                                      name: value,
                                      initials: value
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .toUpperCase(),
                                    }
                                  : undefined,
                            }
                          : null,
                      )
                    }
                  >
                    <SelectTrigger>
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
                  <Label>Tags</Label>
                  <MultiSelect
                    options={availableTags}
                    selected={editingTask.tags || []}
                    onChange={(tags) => setEditingTask((prev) => (prev ? { ...prev, tags } : null))}
                    placeholder="Select tags..."
                  />
                </div>
              </div>
              {customFields.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-medium">自定义字段</h3>
                  <TaskCustomFieldsLazy
                    customFields={customFields}
                    values={editingTask.customFields || {}}
                    onChange={(fieldId, value) =>
                      setEditingTask((prev) =>
                        prev
                          ? {
                              ...prev,
                              customFields: {
                                ...(prev.customFields || {}),
                                [fieldId]: value,
                              },
                            }
                          : null,
                      )
                    }
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 mt-2 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setEditingTask(null)
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveTask} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Task Dialog */}
      <Dialog
        open={isAddingTask}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingTask(false)
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Task to {columns.find((col) => col.id === newTaskStatus)?.title}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newTaskPriority}
                  onValueChange={(value) => setNewTaskPriority(value as Task["priority"])}
                >
                  <SelectTrigger>
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
                <Label>Due Date</Label>
                <Input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                value={newTaskAssignee || "unassigned"}
                onValueChange={(value) => setNewTaskAssignee(value === "unassigned" ? "" : value)}
              >
                <SelectTrigger>
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
              <Label>Tags</Label>
              <MultiSelect
                options={availableTags}
                selected={newTaskTags}
                onChange={setNewTaskTags}
                placeholder="Select tags..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 mt-2 border-t">
            <Button variant="outline" onClick={() => setIsAddingTask(false)} disabled={isSubmittingNewTask}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={isSubmittingNewTask}>
              {isSubmittingNewTask ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// 在文件末尾添加默认导出语句
export default TaskBoard
