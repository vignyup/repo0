"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import type { Task } from "@/lib/data"
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

  // 使用 useMemo 缓存自定义字段
  const memoizedCustomFields = useMemo(() => customFields, [customFields]);

  // Update the resetForm function
  const resetForm = useCallback(() => {
    setTitle("")
    setDescription("")
    setStatus("todo")
    setPriority("medium")
    setDueDate("")
    setAssignee("")
    setTags([])
    setCustomFieldValues({})
    setValidationErrors({})
  }, []);

  // Add this function
  const handleCustomFieldChange = useCallback((fieldId: string, value: CustomFieldValue) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }))

    // Clear validation error for this field if it exists
    setValidationErrors((prev) => {
      if (!prev[fieldId]) return prev;
      
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
  }, []);

  // Add a function to validate the form
  const validateForm = useCallback((): boolean => {
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
  }, [title, customFields, customFieldValues]);

  // Update the handleSubmit function to include validation
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
  }, [
    validateForm, 
    projectId, 
    title, 
    description, 
    status, 
    priority, 
    dueDate, 
    assignee, 
    tags, 
    customFieldValues, 
    toast, 
    resetForm, 
    onTaskAdded
  ]);

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
                  <Label htmlFor="title" className="flex items\
