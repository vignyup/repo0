"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, PencilIcon, PlusIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import type { Project, CustomField } from "@/lib/types"

// Define system fields type
type SystemField = {
  id: string
  name: string
  type: string
  createdAt: string
  createdBy: string
  isSystem: boolean
}

// Define CustomFieldType
type CustomFieldType = "text" | "number" | "date" | "select" | "multiselect" | "checkbox" | "url"

// 在 fieldTypeOptions 数组中添加 multiselect 类型
const fieldTypeOptions: { value: string; label: string }[] = [
  { value: "text", label: "文本" },
  { value: "number", label: "数字" },
  { value: "date", label: "日期" },
  { value: "select", label: "单选" },
  { value: "select-multi", label: "多选" }, // 使用特殊值表示多选
  { value: "checkbox", label: "复选框" },
  { value: "url", label: "链接" },
]

export default function ProjectSettingsPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("basic-info")
  const [customFields, setCustomFields] = useState<CustomField[]>([])

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editError, setEditError] = useState("")

  // Add field dialog state
  const [isAddFieldDialogOpen, setIsAddFieldDialogOpen] = useState(false)
  const [newFieldName, setNewFieldName] = useState("")
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>("text")
  const [newFieldRequired, setNewFieldRequired] = useState(false)
  const [newFieldOptions, setNewFieldOptions] = useState<string[]>([])
  const [newOptionInput, setNewOptionInput] = useState("")
  const [addFieldError, setAddFieldError] = useState("")

  // Edit field dialog state
  const [isEditFieldDialogOpen, setIsEditFieldDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [editFieldName, setEditFieldName] = useState("")
  const [editFieldType, setEditFieldType] = useState("")
  const [editFieldRequired, setEditFieldRequired] = useState(false)
  const [editFieldOptions, setEditFieldOptions] = useState<string[]>([])
  const [editOptionInput, setEditOptionInput] = useState("")
  const [editFieldError, setEditFieldError] = useState("")

  // System fields
  const [systemFields, setSystemFields] = useState<SystemField[]>([
    {
      id: "field-title",
      name: "标题",
      type: "文本",
      createdAt: "2023-01-01",
      createdBy: "系统",
      isSystem: true,
    },
    {
      id: "field-description",
      name: "描述",
      type: "多行文本",
      createdAt: "2023-01-01",
      createdBy: "系统",
      isSystem: true,
    },
    {
      id: "field-status",
      name: "状态",
      type: "选择",
      createdAt: "2023-01-01",
      createdBy: "系统",
      isSystem: true,
    },
    {
      id: "field-priority",
      name: "优先级",
      type: "选择",
      createdAt: "2023-01-01",
      createdBy: "系统",
      isSystem: true,
    },
    {
      id: "field-assignee",
      name: "负责人",
      type: "用户",
      createdAt: "2023-01-01",
      createdBy: "系统",
      isSystem: true,
    },
    {
      id: "field-dueDate",
      name: "截止日期",
      type: "日期",
      createdAt: "2023-01-01",
      createdBy: "系统",
      isSystem: true,
    },
  ])

  // Fetch project data
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/projects/${params.id}`)

        if (!response.ok) {
          throw new Error("Failed to fetch project")
        }

        const projectData = await response.json()
        setProject(projectData)
        setTitle(projectData.title)
        setDescription(projectData.description)

        // Fetch custom fields
        try {
          const fieldsResponse = await fetch(`/api/custom-fields?projectId=${params.id}`)
          if (fieldsResponse.ok) {
            const fieldsData = await fieldsResponse.json()
            setCustomFields(fieldsData)
          }
        } catch (err) {
          console.error("Error fetching custom fields:", err)
        }
      } catch (err) {
        console.error("Error fetching project:", err)
        setError("Failed to load project details")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [params.id])

  const handleOpenEditDialog = () => {
    if (project) {
      setTitle(project.title)
      setDescription(project.description)
      setEditError("")
      setIsEditDialogOpen(true)
    }
  }

  const handleSaveChanges = async () => {
    if (!title.trim() || !description.trim()) {
      setEditError("项目名称和描述不能为空")
      return
    }

    setIsSubmitting(true)
    setEditError("")

    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          status: project?.status,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update project")
      }

      const updatedProject = await response.json()
      setProject(updatedProject)

      toast({
        title: "项目已更新",
        description: "项目信息已成功更新",
      })

      setIsEditDialogOpen(false)
    } catch (err) {
      console.error("Error updating project:", err)
      setEditError("更新项目失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add a new option to the field options list
  const handleAddOption = () => {
    if (!newOptionInput.trim()) return

    setNewFieldOptions([...newFieldOptions, newOptionInput.trim()])
    setNewOptionInput("")
  }

  // Remove an option from the field options list
  const handleRemoveOption = (index: number) => {
    const updatedOptions = [...newFieldOptions]
    updatedOptions.splice(index, 1)
    setNewFieldOptions(updatedOptions)
  }

  // Add a new option to the edit field options list
  const handleAddEditOption = () => {
    if (!editOptionInput.trim()) return

    setEditFieldOptions([...editFieldOptions, editOptionInput.trim()])
    setEditOptionInput("")
  }

  // Remove an option from the edit field options list
  const handleRemoveEditOption = (index: number) => {
    const updatedOptions = [...editFieldOptions]
    updatedOptions.splice(index, 1)
    setEditFieldOptions(updatedOptions)
  }

  // Reset add field form
  const resetAddFieldForm = () => {
    setNewFieldName("")
    setNewFieldType("text")
    setNewFieldRequired(false)
    setNewFieldOptions([])
    setNewOptionInput("")
    setAddFieldError("")
  }

  // Handle adding a new field
  const handleAddField = async () => {
    // Validate form
    if (!newFieldName.trim()) {
      setAddFieldError("字段名称不能为空")
      return
    }

    // Validate options for select and checkbox types
    if (
      (newFieldType === "select" || newFieldType === "checkbox" || newFieldType === "select-multi") &&
      newFieldOptions.length === 0
    ) {
      setAddFieldError(`${newFieldType === "select" ? "下拉选择" : "复选框"}类型的字段必须至少有一个选项`)
      return
    }

    setIsSubmitting(true)
    setAddFieldError("")

    try {
      // 处理多选类型
      let actualType = newFieldType
      let isMulti = false

      if (newFieldType === "select-multi") {
        actualType = "select" // 在数据库中使用 select 类型
        isMulti = true // 但标记为多选
      }

      const payload = {
        projectId: params.id,
        name: newFieldName,
        type: actualType,
        options: ["select", "select-multi"].includes(newFieldType) ? newFieldOptions : undefined,
        isRequired: newFieldRequired,
        isMulti: isMulti,
      }

      const response = await fetch("/api/custom-fields", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create custom field")
      }

      const newField = await response.json()

      // Update local state
      setCustomFields([...customFields, newField])

      toast({
        title: "字段添加成功",
        description: "自定义字段已成功添加到项目中",
      })

      // Reset form and close dialog
      resetAddFieldForm()
      setIsAddFieldDialogOpen(false)
    } catch (err) {
      console.error("Error creating custom field:", err)
      setAddFieldError("添加字段失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open edit field dialog
  const handleOpenEditFieldDialog = (field: CustomField) => {
    setEditingField(field)
    setEditFieldName(field.name)

    // 根据 isMulti 标志设置正确的字段类型
    if (field.type === "select" && field.isMulti) {
      setEditFieldType("select-multi")
    } else {
      setEditFieldType(field.type)
    }

    setEditFieldRequired(field.isRequired || false)
    setEditFieldOptions(field.options || [])
    setEditOptionInput("")
    setEditFieldError("")
    setIsEditFieldDialogOpen(true)
  }

  // Handle updating a field
  const handleUpdateField = async () => {
    if (!editingField) return

    // Validate form
    if (!editFieldName.trim()) {
      setEditFieldError("字段名称不能为空")
      return
    }

    // Validate options for select and checkbox types
    if (
      (editFieldType === "select" || editFieldType === "checkbox" || editFieldType === "select-multi") &&
      editFieldOptions.length === 0
    ) {
      setEditFieldError(`${editFieldType === "select" ? "下拉选择" : "复选框"}类型的字段必须至少有一个选项`)
      return
    }

    setIsSubmitting(true)
    setEditFieldError("")

    try {
      // 处理多选类型
      let actualType = editFieldType
      let isMulti = false

      if (editFieldType === "select-multi") {
        actualType = "select" // 在数据库中使用 select 类型
        isMulti = true // 但标记为多选
      }

      const payload = {
        name: editFieldName,
        type: actualType,
        options: ["select", "select-multi"].includes(editFieldType) ? editFieldOptions : undefined,
        isRequired: editFieldRequired,
        isMulti: isMulti,
      }

      const response = await fetch(`/api/custom-fields/${editingField.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update custom field")
      }

      const updatedField = await response.json()

      // Update local state
      setCustomFields(customFields.map((field) => (field.id === updatedField.id ? updatedField : field)))

      toast({
        title: "字段更新成功",
        description: "自定义字段已成功更新",
      })

      // Close dialog
      setIsEditFieldDialogOpen(false)
    } catch (err) {
      console.error("Error updating custom field:", err)
      setEditFieldError("更新字段失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle deleting a field
  const handleDeleteField = async (fieldId: string) => {
    if (!confirm("确定要删除这个字段吗？此操作不可撤销。")) {
      return
    }

    try {
      const response = await fetch(`/api/custom-fields/${fieldId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete custom field")
      }

      // Update local state
      setCustomFields(customFields.filter((field) => field.id !== fieldId))

      toast({
        title: "字段删除成功",
        description: "自定义字段已成功删除",
      })
    } catch (err) {
      console.error("Error deleting custom field:", err)
      toast({
        title: "删除字段失败",
        description: "删除字段时出现错误，请重试",
        variant: "destructive",
      })
    }
  }

  // Combine system fields and custom fields for display
  const allFields = [
    ...systemFields,
    ...customFields.map((field) => ({
      id: field.id,
      name: field.name,
      type: getFieldTypeName(field.type),
      createdAt: field.created_at || new Date().toISOString().split("T")[0],
      createdBy: "管理员",
      isSystem: false,
      originalField: field,
    })),
  ]

  // Helper function to get field type display name
  function getFieldTypeName(type: string): string {
    const typeMap: Record<string, string> = {
      text: "文本",
      number: "数字",
      date: "日期",
      select: "选择",
      checkbox: "复选框",
      url: "链接",
      multiselect: "多选",
    }
    return typeMap[type] || type
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b">
          <div className="container flex h-16 items-center px-4">
            <div className="flex items-center gap-2 font-semibold">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                PM
              </div>
              <span>Project Manager</span>
            </div>
            <nav className="ml-auto flex gap-4 sm:gap-6">
              <Link href="/" className="text-sm font-medium">
                Dashboard
              </Link>
              <Link href="/projects" className="text-sm font-medium">
                Projects
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 py-8">
          <div className="container px-4 max-w-6xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center px-4">
          <div className="flex items-center gap-2 font-semibold">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              PM
            </div>
            <span>Project Manager</span>
          </div>
          <nav className="ml-auto flex gap-4 sm:gap-6">
            <Link href="/" className="text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/projects" className="text-sm font-medium">
              Projects
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 py-8">
        <div className="container px-4 max-w-6xl mx-auto">
          <div className="mb-8">
            <Link
              href={`/projects/${params.id}`}
              className="flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              返回项目
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold">项目设置</h1>
            <p className="mt-1 text-muted-foreground">管理项目的基本信息、字段和成员权限</p>
          </div>

          {error ? <div className="rounded-md bg-red-50 p-4 text-sm text-red-500 mb-6">{error}</div> : null}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="basic-info">基础信息</TabsTrigger>
              <TabsTrigger value="field-settings">字段设置</TabsTrigger>
              <TabsTrigger value="member-permissions">成员权限</TabsTrigger>
            </TabsList>

            <TabsContent value="basic-info">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>基础信息</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleOpenEditDialog}>
                    <PencilIcon className="h-4 w-4 mr-2" />
                    编辑
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">项目名称</h3>
                      <p className="text-lg">{project?.title}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">项目描述</h3>
                      <p className="text-base">{project?.description}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">项目状态</h3>
                      <div className="flex items-center">
                        <span
                          className={`mr-2 h-2 w-2 rounded-full ${
                            project?.status === "active"
                              ? "bg-green-500"
                              : project?.status === "planning"
                                ? "bg-yellow-500"
                                : "bg-blue-500"
                          }`}
                        ></span>
                        <span className="capitalize">
                          {project?.status === "active"
                            ? "进行中"
                            : project?.status === "planning"
                              ? "规划中"
                              : project?.status === "completed"
                                ? "已完成"
                                : project?.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">任务数量</h3>
                      <p className="text-base">{project?.taskCount || 0} 个任务</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="field-settings">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>字段设置</CardTitle>
                  <Button
                    onClick={() => {
                      resetAddFieldForm()
                      setIsAddFieldDialogOpen(true)
                    }}
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    添加字段
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">在这里您可以管理项目的系统字段和自定义字段。</p>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>字段名称</TableHead>
                        <TableHead>字段类型</TableHead>
                        <TableHead>添加时间</TableHead>
                        <TableHead>添加人</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allFields.map((field) => (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium">{field.name}</TableCell>
                          <TableCell>{field.type}</TableCell>
                          <TableCell>{field.createdAt}</TableCell>
                          <TableCell>{field.createdBy}</TableCell>
                          <TableCell className="text-right">
                            {field.isSystem ? (
                              <span className="text-muted-foreground text-sm">系统字段</span>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEditFieldDialog(field.originalField)}
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => handleDeleteField(field.id)}
                                >
                                  删除
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {allFields.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            暂无字段数据
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="member-permissions">
              <Card>
                <CardHeader>
                  <CardTitle>成员权限</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">在这里您可以管理项目成员和他们的权限。</p>

                  <div className="mt-6 border rounded-md p-8 text-center">
                    <h3 className="text-lg font-medium mb-2">成员管理</h3>
                    <p className="text-muted-foreground mb-4">您可以邀请新成员加入项目并设置他们的权限</p>
                    <Button>邀请成员</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑项目信息</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {editError && <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">{editError}</div>}
            <div className="space-y-2">
              <Label htmlFor="title">项目名称</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入项目名称"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">项目描述</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="输入项目描述"
                rows={5}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button onClick={handleSaveChanges} disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : "保存更改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Field Dialog */}
      <Dialog open={isAddFieldDialogOpen} onOpenChange={setIsAddFieldDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>添加自定义字段</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {addFieldError && <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">{addFieldError}</div>}
            <div className="space-y-2">
              <Label htmlFor="fieldName">字段名称</Label>
              <Input
                id="fieldName"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="输入字段名称"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fieldType">字段类型</Label>
              <Select value={newFieldType} onValueChange={setNewFieldType}>
                <SelectTrigger id="fieldType">
                  <SelectValue placeholder="选择字段类型" />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Options configuration for select and checkbox types */}
            {(newFieldType === "select" || newFieldType === "checkbox" || newFieldType === "select-multi") && (
              <div className="space-y-2 border rounded-md p-4">
                <Label>配置选项</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  {newFieldType === "select" ? "下拉选择" : newFieldType === "select-multi" ? "多选" : "复选框"}
                  类型的字段需要配置可选项
                </p>

                <div className="flex gap-2 mb-2">
                  <Input
                    value={newOptionInput}
                    onChange={(e) => setNewOptionInput(e.target.value)}
                    placeholder="输入选项值"
                    className="flex-1"
                  />
                  <Button type="button" onClick={handleAddOption}>
                    添加
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {newFieldOptions.map((option, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {option}
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="ml-1 rounded-full hover:bg-muted p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {newFieldOptions.length === 0 && (
                    <p className="text-sm text-muted-foreground">暂无选项，请添加至少一个选项</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="fieldRequired"
                checked={newFieldRequired}
                onCheckedChange={(checked) => setNewFieldRequired(!!checked)}
              />
              <Label htmlFor="fieldRequired" className="text-sm">
                必填字段
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddFieldDialogOpen(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button onClick={handleAddField} disabled={isSubmitting}>
              {isSubmitting ? "添加中..." : "添加字段"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Field Dialog */}
      <Dialog open={isEditFieldDialogOpen} onOpenChange={setIsEditFieldDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑自定义字段</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {editFieldError && <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">{editFieldError}</div>}
            <div className="space-y-2">
              <Label htmlFor="editFieldName">字段名称</Label>
              <Input
                id="editFieldName"
                value={editFieldName}
                onChange={(e) => setEditFieldName(e.target.value)}
                placeholder="输入字段名称"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editFieldType">字段类型</Label>
              <Select value={editFieldType} onValueChange={setEditFieldType}>
                <SelectTrigger id="editFieldType">
                  <SelectValue placeholder="选择字段类型" />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Options configuration for select and checkbox types */}
            {(editFieldType === "select" || editFieldType === "checkbox" || editFieldType === "select-multi") && (
              <div className="space-y-2 border rounded-md p-4">
                <Label>配置选项</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  {editFieldType === "select" ? "下拉选择" : editFieldType === "select-multi" ? "多选" : "复选框"}
                  类型的字段需要配置可选项
                </p>

                <div className="flex gap-2 mb-2">
                  <Input
                    value={editOptionInput}
                    onChange={(e) => setEditOptionInput(e.target.value)}
                    placeholder="输入选项值"
                    className="flex-1"
                  />
                  <Button type="button" onClick={handleAddEditOption}>
                    添加
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {editFieldOptions.map((option, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {option}
                      <button
                        type="button"
                        onClick={() => handleRemoveEditOption(index)}
                        className="ml-1 rounded-full hover:bg-muted p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {editFieldOptions.length === 0 && (
                    <p className="text-sm text-muted-foreground">暂无选项，请添加至少一个选项</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="editFieldRequired"
                checked={editFieldRequired}
                onCheckedChange={(checked) => setEditFieldRequired(!!checked)}
              />
              <Label htmlFor="editFieldRequired" className="text-sm">
                必填字段
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditFieldDialogOpen(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button onClick={handleUpdateField} disabled={isSubmitting}>
              {isSubmitting ? "更新中..." : "更新字段"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
