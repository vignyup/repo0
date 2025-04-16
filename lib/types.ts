export type Project = {
  id: string
  title: string
  description: string
  status: "planning" | "active" | "completed" | "archived"
  taskCount?: number
  created_at?: string
  updated_at?: string
}

export type Task = {
  id: string
  projectId: string
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
  tags?: string[]
  customFields?: Record<string, any>
  created_at?: string
  updated_at?: string
  order?: number
}

export type CustomField = {
  id: string
  projectId: string
  name: string
  type: CustomFieldType
  options?: string[]
  isRequired?: boolean
  isMulti?: boolean // 确保这个字段存在
  created_at?: string
}

export type CustomFieldValue = string | number | boolean | string[] | null

// 保持与数据库兼容的类型
export type CustomFieldType = "text" | "number" | "date" | "select" | "checkbox" | "url"
