"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { PlusIcon, Pencil, Trash2, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import type { CustomField, CustomFieldType } from "@/lib/types"

interface CustomFieldsManagerProps {
  projectId: string
  customFields: CustomField[]
  onCustomFieldsChange: (fields: CustomField[]) => void
}

export function CustomFieldsManager({ projectId, customFields, onCustomFieldsChange }: CustomFieldsManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [fieldName, setFieldName] = useState("")
  const [fieldType, setFieldType] = useState<CustomFieldType>("text")
  const [fieldOptions, setFieldOptions] = useState<string[]>([])
  const [newOption, setNewOption] = useState("")
  const [isRequired, setIsRequired] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setFieldName("")
    setFieldType("text")
    setFieldOptions([])
    setNewOption("")
    setIsRequired(false)
    setEditingField(null)
    setIsEditing(false)
  }

  const handleOpenDialog = () => {
    resetForm()
    setIsOpen(true)
  }

  const handleEditField = (field: CustomField) => {
    setEditingField(field)
    setFieldName(field.name)
    setFieldType(field.type as CustomFieldType)
    setFieldOptions(field.options || [])
    setIsRequired(field.isRequired || false)
    setIsEditing(true)
    setIsOpen(true)
  }

  const handleAddOption = () => {
    if (!newOption.trim()) return
    if (fieldOptions.includes(newOption.trim())) {
      toast({
        title: "选项已存在",
        description: "请添加不同的选项",
        variant: "destructive",
      })
      return
    }
    setFieldOptions([...fieldOptions, newOption.trim()])
    setNewOption("")
  }

  const handleRemoveOption = (option: string) => {
    setFieldOptions(fieldOptions.filter((o) => o !== option))
  }

  const handleSubmit = async () => {
    if (!fieldName.trim()) {
      toast({
        title: "请输入字段名称",
        description: "字段名称不能为空",
        variant: "destructive",
      })
      return
    }

    if (fieldType === "select" && fieldOptions.length === 0) {
      toast({
        title: "请添加选项",
        description: "下拉选择字段需要至少一个选项",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        projectId,
        name: fieldName.trim(),
        type: fieldType,
        options: ["select", "multiselect"].includes(fieldType) ? fieldOptions : undefined,
        isRequired,
      }

      let response
      let newField

      if (isEditing && editingField) {
        // Update existing field
        response = await fetch(`/api/custom-fields/${editingField.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error("Failed to update custom field")
        }

        newField = await response.json()

        // Update the fields array
        const updatedFields = customFields.map((field) => (field.id === editingField.id ? newField : field))
        onCustomFieldsChange(updatedFields)

        toast({
          title: "字段已更新",
          description: "自定义字段已成功更新",
        })
      } else {
        // Create new field
        response = await fetch("/api/custom-fields", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error("Failed to create custom field")
        }

        newField = await response.json()

        // Add the new field to the array
        onCustomFieldsChange([...customFields, newField])

        toast({
          title: "字段已创建",
          description: "新的自定义字段已成功创建",
        })
      }

      setIsOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error saving custom field:", error)
      toast({
        title: "保存失败",
        description: "保存自定义字段时出错，请重试",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteField = async (field: CustomField) => {
    if (!confirm(`确定要删除字段 "${field.name}" 吗？这将从所有任务中移除此字段的数据。`)) {
      return
    }

    try {
      const response = await fetch(`/api/custom-fields/${field.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete custom field")
      }

      // Remove the field from the array
      const updatedFields = customFields.filter((f) => f.id !== field.id)
      onCustomFieldsChange(updatedFields)

      toast({
        title: "字段已删除",
        description: "自定义字段已成功删除",
      })
    } catch (error) {
      console.error("Error deleting custom field:", error)
      toast({
        title: "删除失败",
        description: "删除自定义字段时出错，请重试",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpenDialog}>
        <PlusIcon className="h-4 w-4 mr-2" />
        自定义字段
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "编辑自定义字段" : "添加自定义字段"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fieldName">字段名称</Label>
              <Input
                id="fieldName"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="例如：优先级、状态、截止日期等"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fieldType">字段类型</Label>
              <Select
                value={fieldType}
                onValueChange={(value) => setFieldType(value as CustomFieldType)}
                disabled={isEditing} // Prevent changing type when editing
              >
                <SelectTrigger id="fieldType">
                  <SelectValue placeholder="选择字段类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">文本</SelectItem>
                  <SelectItem value="number">数字</SelectItem>
                  <SelectItem value="date">日期</SelectItem>
                  <SelectItem value="select">单选</SelectItem>
                  <SelectItem value="multiselect">多选</SelectItem>
                  <SelectItem value="checkbox">复选框</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(fieldType === "select" || fieldType === "multiselect") && (
              <div className="space-y-2">
                <Label>选项</Label>
                <div className="flex gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    placeholder="添加选项"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddOption()
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddOption}>
                    添加
                  </Button>
                </div>
                {fieldOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {fieldOptions.map((option) => (
                      <Badge key={option} variant="secondary" className="text-xs">
                        {option}
                        <button
                          className="ml-1"
                          onClick={() => handleRemoveOption(option)}
                          aria-label={`Remove ${option}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox id="isRequired" checked={isRequired} onCheckedChange={(checked) => setIsRequired(!!checked)} />
              <Label htmlFor="isRequired">必填字段</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : isEditing ? "更新" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Display existing custom fields */}
      {customFields.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">现有自定义字段</h3>
          <div className="space-y-4">
            {customFields.map((field) => (
              <div key={field.id} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <div className="font-medium">
                    {field.name} {field.isRequired && <span className="text-red-500">*</span>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    类型: {getFieldTypeLabel(field.type as CustomFieldType)}
                    {field.options && field.options.length > 0 && (
                      <span className="ml-2">
                        选项: {field.options.slice(0, 3).join(", ")}
                        {field.options.length > 3 && ` +${field.options.length - 3} 更多`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEditField(field)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteField(field)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function getFieldTypeLabel(type: CustomFieldType): string {
  const typeMap: Record<CustomFieldType, string> = {
    text: "文本",
    number: "数字",
    date: "日期",
    select: "下拉选择",
    checkbox: "复选框",
    url: "URL",
  }
  return typeMap[type] || type
}
