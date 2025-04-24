"use client"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiSelect } from "./multi-select"
import type { CustomField, CustomFieldValue } from "@/lib/types"
import { memo, useCallback } from "react"

interface TaskCustomFieldsProps {
  customFields: CustomField[]
  values: Record<string, CustomFieldValue>
  onChange: (fieldId: string, value: CustomFieldValue) => void
  errors?: Record<string, string>
  readOnly?: boolean
}

// 使用 memo 包装单个字段渲染组件以减少重渲染
const CustomFieldEditor = memo(
  ({
    field,
    value,
    onChange,
    hasError,
    readOnly,
  }: {
    field: CustomField
    value: CustomFieldValue
    onChange: (fieldId: string, value: CustomFieldValue) => void
    hasError: boolean
    readOnly: boolean
  }) => {
    const handleChange = useCallback(
      (newValue: CustomFieldValue) => {
        onChange(field.id, newValue)
      },
      [field.id, onChange],
    )

    if (readOnly) {
      return renderReadOnlyValue(field, value)
    }

    switch (field.type) {
      case "text":
        return (
          <Input
            value={(value as string) || ""}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`输入${field.name}`}
            className={hasError ? "border-red-500" : ""}
            disabled={readOnly}
          />
        )
      case "number":
        return (
          <Input
            type="number"
            value={value !== undefined && value !== null ? String(value) : ""}
            onChange={(e) => {
              const val = e.target.value === "" ? null : Number(e.target.value)
              handleChange(val)
            }}
            placeholder={`输入${field.name}`}
            className={hasError ? "border-red-500" : ""}
            disabled={readOnly}
          />
        )
      case "date":
        return (
          <Input
            type="date"
            value={(value as string) || ""}
            onChange={(e) => handleChange(e.target.value)}
            className={hasError ? "border-red-500" : ""}
            disabled={readOnly}
          />
        )
      case "url":
        return (
          <Input
            type="url"
            value={(value as string) || ""}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="https://example.com"
            className={hasError ? "border-red-500" : ""}
            disabled={readOnly}
          />
        )
      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`field-${field.id}`}
              checked={!!value}
              onCheckedChange={(checked) => handleChange(!!checked)}
              disabled={readOnly}
            />
            <Label htmlFor={`field-${field.id}`} className="text-sm">
              {field.name}
            </Label>
          </div>
        )
      case "select":
        return (
          <Select value={(value as string) || ""} onValueChange={(val) => handleChange(val)} disabled={readOnly}>
            <SelectTrigger className={hasError ? "border-red-500" : ""}>
              <SelectValue placeholder={`选择${field.name}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">请选择</SelectItem>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case "multiselect":
        return (
          <MultiSelect
            options={field.options || []}
            selected={Array.isArray(value) ? value : []}
            onChange={(selected) => handleChange(selected)}
            placeholder={`选择${field.name}`}
          />
        )
      default:
        return <div>不支持的字段类型: {field.type}</div>
    }
  },
)

// 使用 memo 包装只读值渲染组件
const ReadOnlyFieldValue = memo(({ field, value }: { field: CustomField; value: CustomFieldValue }) => {
  return renderReadOnlyValue(field, value)
})

function renderReadOnlyValue(field: CustomField, value: CustomFieldValue) {
  if (value === undefined || value === null || value === "") {
    return <div className="text-muted-foreground">-</div>
  }

  switch (field.type) {
    case "checkbox":
      return <div>{value ? "✓" : "✗"}</div>
    case "select":
      return <div>{value as string}</div>
    case "multiselect":
      if (Array.isArray(value) && value.length > 0) {
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((item, index) => (
              <div key={index} className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded">
                {item}
              </div>
            ))}
          </div>
        )
      }
      return <div className="text-muted-foreground">-</div>
    case "url":
      return (
        <a href={value as string} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          {value as string}
        </a>
      )
    default:
      return <div>{String(value)}</div>
  }
}

// 使用 memo 包装整个组件
export const TaskCustomFields = memo(function TaskCustomFields({
  customFields,
  values,
  onChange,
  errors = {},
  readOnly = false,
}: TaskCustomFieldsProps) {
  return (
    <div className="space-y-4">
      {customFields.map((field) => (
        <div key={field.id} className="space-y-2">
          <div className="flex items-center">
            <Label className="text-sm">
              {field.name}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
          </div>
          <CustomFieldEditor
            field={field}
            value={values[field.id]}
            onChange={onChange}
            hasError={!!errors[field.id]}
            readOnly={readOnly}
          />
          {errors[field.id] && <p className="text-xs text-red-500 mt-1">{errors[field.id]}</p>}
        </div>
      ))}
    </div>
  )
})

export default TaskCustomFields
