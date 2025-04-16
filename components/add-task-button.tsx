"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiSelect } from "./multi-select"
import { toast } from "@/hooks/use-toast"
import type { Task } from "@/lib/data"
// Add the import for custom fields
import { TaskCustomFields } from "./task-custom-fields"
import type { CustomField, CustomFieldValue } from "@/lib/types"

// Update the interface
interface AddTaskButtonProps {
  projectId: string
  onTaskAdded: (newTask: Task) => void
  customFields?: CustomField[]
}

// Update the component to handle custom fields
export function AddTaskButton({ projectId, onTaskAdded, customFields = [] }: AddTaskButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<"todo" | "in-progress" | "review" | "done">("todo")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [dueDate, setDueDate] = useState("")
  const [assignee, setAssignee] = useState("")
  const [tags, setTags] = useState<string[]>([])
  // Add state for custom field values
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, CustomFieldValue>>({})
  // Add state for validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Update the resetForm function
  const resetForm = () => {
    setTitle("")
    setDescription("")
    setStatus("todo")
    setPriority("medium")
    setDueDate("")
    setAssignee("")
    setTags([])
    setCustomFieldValues({})
    setValidationErrors({})
  }

  // Add this function
  const handleCustomFieldChange = (fieldId: string, value: CustomFieldValue) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }))

    // Clear validation error for this field if it exists
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[fieldId]
        return newErrors
      })
    }
  }

  // Add a function to validate the form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Validate title
    if (!title.trim()) {
      errors.title = "任务标题不能为空"
    }

    // Validate required custom fields
    customFields.forEach((field) => {
      if (field.isRequired) {
        const value = customFieldValues[field.id]

        if (value === undefined || value === null || value === "") {
          errors[field.id] = `${field.name}是必填字段`
        }

        // Special validation for different field types
        if (field.type === "select" && value === "") {
          errors[field.id] = `请选择${field.name}`
        }
      }
    })

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Update the handleSubmit function to include validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate the form
    if (!validateForm()) {
      // Show a toast for validation errors
      toast({
        title: "表单验证失败",
        description: "请填写所有必填字段",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        projectId,
        title,
        description,
        status,
        priority,
        dueDate: dueDate || undefined,
        assignee:
          assignee && assignee !== "unassigned"
            ? {
                name: assignee,
                initials: assignee
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase(),
              }
            : undefined,
        tags: tags.length > 0 ? tags : undefined,
        customFields: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
      }

      console.log("Submitting new task:", payload)

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create task")
      }

      const newTask = await response.json()
      console.log("Task created successfully:", newTask)

      toast({
        title: "任务创建成功",
        description: "您的任务已成功创建",
      })

      // Close the dialog and reset form
      setIsOpen(false)
      resetForm()

      // Pass the new task to the parent component
      onTaskAdded(newTask)
    } catch (error) {
      console.error("Error creating task:", error)
      toast({
        title: "创建任务失败",
        description: error instanceof Error ? error.message : "发生了意外错误",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fetch custom fields when the dialog opens
  useEffect(() => {
    if (isOpen && customFields.length > 0) {
      // Initialize default values for required fields
      const initialValues: Record<string, CustomFieldValue> = {}

      customFields.forEach((field) => {
        if (field.defaultValue !== undefined) {
          initialValues[field.id] = field.defaultValue
        }
      })

      if (Object.keys(initialValues).length > 0) {
        setCustomFieldValues((prev) => ({
          ...prev,
          ...initialValues,
        }))
      }
    }
  }, [isOpen, customFields])

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <PlusIcon className="mr-2 h-4 w-4" />
        添加任务
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>添加新任务</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="flex items-center">
                    任务标题 <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value)
                      if (validationErrors.title) {
                        setValidationErrors((prev) => {
                          const newErrors = { ...prev }
                          delete newErrors.title
                          return newErrors
                        })
                      }
                    }}
                    placeholder="输入任务标题"
                    className={validationErrors.title ? "border-red-500" : ""}
                  />
                  {validationErrors.title && <p className="text-sm text-red-500">{validationErrors.title}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">描述</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="输入任务描述"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">状态</Label>
                    <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                      <SelectTrigger id="status">
                        <SelectValue placeholder="选择状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">待办</SelectItem>
                        <SelectItem value="in-progress">进行中</SelectItem>
                        <SelectItem value="review">审核</SelectItem>
                        <SelectItem value="done">已完成</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">优先级</Label>
                    <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="选择优先级" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">低</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="high">高</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assignee">负责人</Label>
                    <Select value={assignee} onValueChange={setAssignee}>
                      <SelectTrigger id="assignee">
                        <SelectValue placeholder="选择负责人" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">未分配</SelectItem>
                        <SelectItem value="John Doe">John Doe</SelectItem>
                        <SelectItem value="Jane Smith">Jane Smith</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">截止日期</Label>
                    <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">标签</Label>
                  <MultiSelect selected={tags} onChange={setTags} placeholder="选择标签" />
                </div>

                {customFields.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">自定义字段</h3>
                    <TaskCustomFields
                      customFields={customFields}
                      values={customFieldValues}
                      onChange={handleCustomFieldChange}
                      errors={validationErrors}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsOpen(false)
                  resetForm()
                }}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "创建中..." : "创建任务"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
