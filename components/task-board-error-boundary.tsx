"use client"

import React from "react"
import TaskBoard from "./task-board"
import type { Task, CustomField } from "@/lib/types"

type TaskBoardProps = {
  tasks: Task[]
  projectId: string
  onTasksChange?: (tasks: Task[]) => void
  customFields?: CustomField[]
  onCustomFieldsChange?: (fields: CustomField[]) => void
}

class TaskBoardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("TaskBoard Error:", error)
    console.error("Error details:", errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center border rounded-md bg-red-50">
          <h3 className="text-lg font-medium mb-2 text-red-700">Something went wrong</h3>
          <p className="text-muted-foreground mb-4">
            There was an error loading the task board. Please try refreshing the page.
          </p>
          <p className="text-xs text-red-500 mb-4">{this.state.error?.message || "Unknown error"}</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Refresh Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default function TaskBoardWithErrorBoundary(props: TaskBoardProps) {
  return (
    <TaskBoardErrorBoundary>
      <TaskBoard {...props} />
    </TaskBoardErrorBoundary>
  )
}
