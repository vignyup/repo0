"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
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

  // 使用 useMemo 缓存任务数据，避免不必要的重新渲染
  const memoizedTasks = useMemo(() => initialTasks, [initialTasks])

  // 优化数据加载性能
  useEffect(() => {
    // 使用 requestIdleCallback 在浏览器空闲时加载数据
    const loadData = () => {
      // 使用 initialCustomFields 而不是从 localStorage 加载
      setCustomFields(initialCustomFields)

      // 设置任务数据
      setTasks(memoizedTasks)
      setIsLoading(false)
    }

    if ("requestIdleCallback" in window) {
      // 使用 requestIdleCallback 在浏览器空闲时执行
      window.requestIdleCallback(() => loadData(), { timeout: 500 })
    } else {
      // 回退到 setTimeout
      setTimeout(loadData, 100)
    }

    return () => {
      // 清理函数
    }
  }, [projectId, initialCustomFields, memoizedTasks])

  // 当 initialTasks 变化时更新任务
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  // 优化任务添加处理函数
  const handleTaskAdded = useCallback((newTask: Task) => {
    setTasks((prevTasks) => [...prevTasks, newTask])
  }, [])

  // 优化自定义字段变更处理函数
  const handleCustomFieldsChange = useCallback(
    (fields: CustomField[]) => {
      setCustomFields(fields)

      // 保存到 localStorage 以提高持久性
      try {
        localStorage.setItem(`project-${projectId}-custom-fields`, JSON.stringify(fields))
      } catch (err) {
        console.error("Error storing custom fields:", err)
      }

      // 通知父组件
      if (onCustomFieldsChange) {
        onCustomFieldsChange(fields)
      }
    },
    [projectId, onCustomFieldsChange],
  )

  // 显示加载骨架屏
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
        <AddTaskButton projectId={projectId} onTaskAdded={handleTaskAdded} customFields={customFields} />
      </div>
      <TaskBoardWithErrorBoundary
        tasks={tasks}
        projectId={projectId}
        onTasksChange={setTasks}
        customFields={customFields}
        onCustomFieldsChange={handleCustomFieldsChange}
      />
    </div>
  )
}

export default ProjectTaskManager
