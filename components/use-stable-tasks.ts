"use client"

import { useRef, useEffect } from "react"
import type { Task } from "@/lib/data"

/**
 * Custom hook to provide a stable reference to tasks
 * This helps prevent infinite re-renders by ensuring the tasks reference
 * only changes when the actual content changes
 */
export function useStableTasks(tasks: Task[]): Task[] {
  const tasksRef = useRef<Task[]>(tasks)
  const prevTasksStringRef = useRef<string>("")

  useEffect(() => {
    const currentTasksString = JSON.stringify(tasks)
    if (currentTasksString !== prevTasksStringRef.current) {
      tasksRef.current = tasks
      prevTasksStringRef.current = currentTasksString
    }
  }, [tasks])

  return tasksRef.current
}
