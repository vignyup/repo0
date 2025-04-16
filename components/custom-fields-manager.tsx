"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { PlusIcon, Trash2Icon, Settings2Icon } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { CustomField, CustomFieldType } from "@/lib/types"

interface CustomFieldsManagerProps {
  projectId: string
  customFields: CustomField[]
  onCustomFieldsChange: (fields: CustomField[]) => void
}

export function CustomFieldsManager({ projectId, customFields, onCustomFieldsChange }: CustomFieldsManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [fields, setFields] = useState<CustomField[]>(customFields)
  const [newField, setNewField] = useState<CustomField>({
    id: "",
    projectId,
    name: "",
    type: "text",
    isRequired: false,
  })
  const [isAddingField, setIsAddingField] = useState(false)
  const [selectOptions, setSelectOptions] = useState("")

  useEffect(() => {
    setFields(customFields)
  }, [customFields])

  const handleAddField = () => {
    if (!newField.name.trim()) {
      toast({
        title: "Field name required",
        description: "Please enter a name for the custom field",
        variant: "destructive",
      })
      return
    }

    const fieldId = `field-${Date.now()}`
    const fieldToAdd: CustomField = {
      ...newField,
      id: fieldId,
      options:
        newField.type === "select"
          ? selectOptions
              .split(",")
              .map((opt) => opt.trim())
              .filter(Boolean)
          : undefined,
    }

    const updatedFields = [...fields, fieldToAdd]
    setFields(updatedFields)
    onCustomFieldsChange(updatedFields)

    // Reset form
    setNewField({
      id: "",
      projectId,
      name: "",
      type: "text",
      isRequired: false,
    })
    setSelectOptions("")
    setIsAddingField(false)

    toast({
      title: "Custom field added",
      description: `${fieldToAdd.name} has been added to the project`,
    })
  }

  const handleDeleteField = (fieldId: string) => {
    const updatedFields = fields.filter((field) => field.id !== fieldId)
    setFields(updatedFields)
    onCustomFieldsChange(updatedFields)

    toast({
      title: "Custom field removed",
      description: "The custom field has been removed from the project",
    })
  }

  const fieldTypeOptions: { value: CustomFieldType; label: string }[] = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
    { value: "select", label: "Select" },
    { value: "checkbox", label: "Checkbox" },
    { value: "url", label: "URL" },
  ]

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="flex items-center gap-1">
        <Settings2Icon className="h-4 w-4" />
        Custom Fields
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Custom Fields</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium">Project Custom Fields</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingField(true)}
                className="flex items-center gap-1"
              >
                <PlusIcon className="h-3 w-3" />
                Add Field
              </Button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No custom fields defined for this project</div>
            ) : (
              <div className="space-y-2">
                {fields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <div className="font-medium">{field.name}</div>
                      <div className="text-sm text-muted-foreground flex gap-2">
                        <span className="capitalize">{field.type}</span>
                        {field.isRequired && <span className="text-red-500">Required</span>}
                        {field.type === "select" && field.options && <span>Options: {field.options.join(", ")}</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteField(field.id)}>
                      <Trash2Icon className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isAddingField && (
            <div className="border rounded-md p-4 space-y-4 mt-4">
              <h3 className="font-medium">Add New Custom Field</h3>

              <div className="space-y-2">
                <Label htmlFor="field-name">Field Name</Label>
                <Input
                  id="field-name"
                  value={newField.name}
                  onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                  placeholder="e.g., Story Points, Epic Link, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="field-type">Field Type</Label>
                <Select
                  value={newField.type}
                  onValueChange={(value: CustomFieldType) => setNewField({ ...newField, type: value })}
                >
                  <SelectTrigger id="field-type">
                    <SelectValue placeholder="Select field type" />
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

              {newField.type === "select" && (
                <div className="space-y-2">
                  <Label htmlFor="field-options">Options (comma separated)</Label>
                  <Input
                    id="field-options"
                    value={selectOptions}
                    onChange={(e) => setSelectOptions(e.target.value)}
                    placeholder="Option 1, Option 2, Option 3"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="field-required"
                  checked={newField.isRequired}
                  onCheckedChange={(checked) => setNewField({ ...newField, isRequired: checked })}
                />
                <Label htmlFor="field-required">Required Field</Label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsAddingField(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddField}>Add Field</Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
