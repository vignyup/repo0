"use client"

import { useState, useEffect, useMemo } from "react"
import TaskBoardWithErrorBoundary from "@/components/task-board-error-boundary"
import { AddTaskButton } from "@/components/add-task-button"
import type { Task } from "@/lib/data"
import type { CustomField } from "@/lib/types"

interface ProjectTaskManagerProps {
  initialTasks: Task[]
  projectId: string
  initialCustomFields?: CustomField[]
  onCustomFieldsChange?: (fields: CustomField[]) => void
}

export function ProjectTaskManager({
  initialTasks,
  projectId,
  initialCustomFields = [],
  onCustomFieldsChange,
}: ProjectTaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>(initialCustomFields)
  const [isLoading, setIsLoading] = useState(true)

  // Memoize tasks to prevent unnecessary re-renders
  const memoizedTasks = useMemo(() => initialTasks, [initialTasks])

  // Load data with improved performance
  useEffect(() => {
    // Start with a loading state
    setIsLoading(true)

    // Use a small timeout to allow the UI to render first
    const timer = setTimeout(() => {
      // Always use initialCustomFields from props, don't try to load from localStorage
      setCustomFields(initialCustomFields)

      // Set tasks with a small delay to improve perceived performance
      setTasks(memoizedTasks)
      setIsLoading(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [projectId, initialCustomFields, memoizedTasks])

  // Update tasks when initialTasks changes
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  const handleTaskAdded = (newTask: Task) => {
    console.log("New task added in ProjectTaskManager:", newTask)
    // Update tasks state with the new task
    setTasks((prevTasks) => {
      const updatedTasks = [...prevTasks, newTask]
      console.log("Updated tasks:", updatedTasks)
      return updatedTasks
    })
  }

  const handleCustomFieldsChange = (fields: CustomField[]) => {
    console.log("Updating custom fields:", fields)
    setCustomFields(fields)

    // Save to localStorage for persistence
    try {
      localStorage.setItem(`project-${projectId}-custom-fields`, JSON.stringify(fields))
    } catch (err) {
      console.error("Error storing custom fields:", err)
    }

    // Notify parent component
    if (onCustomFieldsChange) {
      onCustomFieldsChange(fields)
    }
  }

  // Show a loading skeleton while data is being prepared
  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-medium">Task Board</h2>
          <div className="w-24 h-9 bg-gray-200 rounded animate-pulse"></div>
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
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-lg font-medium">Task Board</h2>
        <AddTaskButton projectId={projectId} onTaskAdded={handleTaskAdded} />
      </div>
      <TaskBoardWithErrorBoundary
        tasks={tasks}
        projectId={projectId}
        onTasksChange={(updatedTasks) => setTasks(updatedTasks)}
        customFields={customFields}
        onCustomFieldsChange={handleCustomFieldsChange}
      />
    </div>
  )
}
