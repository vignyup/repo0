"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, FilterIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { MultiSelect } from "./multi-select"

export type FilterOptions = {
  title: string
  assignee: string
  priority: string
  dueDateFrom: Date | undefined
  dueDateTo: Date | undefined
  tags: string[]
}

type TaskFilterProps = {
  onFilterChange: (filters: FilterOptions) => void
  availableTags: string[]
}

export default function TaskFilter({ onFilterChange, availableTags }: TaskFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [assignee, setAssignee] = useState("")
  const [priority, setPriority] = useState("")
  const [dueDateFrom, setDueDateFrom] = useState<Date | undefined>(undefined)
  const [dueDateTo, setDueDateTo] = useState<Date | undefined>(undefined)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const handleApplyFilters = () => {
    onFilterChange({
      title,
      assignee,
      priority,
      dueDateFrom,
      dueDateTo,
      tags: selectedTags,
    })
  }

  const handleResetFilters = () => {
    setTitle("")
    setAssignee("")
    setPriority("")
    setDueDateFrom(undefined)
    setDueDateTo(undefined)
    setSelectedTags([])
    onFilterChange({
      title: "",
      assignee: "",
      priority: "",
      dueDateFrom: undefined,
      dueDateTo: undefined,
      tags: [],
    })
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Task Board</h2>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-1">
          <FilterIcon className="h-4 w-4" />
          Filters
          {(title || assignee !== "" || priority !== "" || dueDateFrom || dueDateTo || selectedTags.length > 0) && (
            <Badge variant="secondary" className="ml-2 px-1 py-0">
              {
                [
                  title && "Title",
                  assignee !== "" && "Assignee",
                  priority !== "" && "Priority",
                  (dueDateFrom || dueDateTo) && "Date",
                  selectedTags.length > 0 && "Tags",
                ].filter(Boolean).length
              }
            </Badge>
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="bg-card border rounded-md p-4 mb-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filter-title">Title</Label>
              <Input
                id="filter-title"
                placeholder="Search by title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-assignee">Assignee</Label>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger id="filter-assignee">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignees</SelectItem>
                  <SelectItem value="John Doe">John Doe</SelectItem>
                  <SelectItem value="Jane Smith">Jane Smith</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="filter-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDateFrom && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDateFrom ? format(dueDateFrom, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dueDateFrom} onSelect={setDueDateFrom} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Due Date To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dueDateTo && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDateTo ? format(dueDateTo, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dueDateTo} onSelect={setDueDateTo} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-tags">Tags</Label>
              <MultiSelect
                options={availableTags}
                selected={selectedTags}
                onChange={setSelectedTags}
                placeholder="Select tags..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleResetFilters}>
              Reset
            </Button>
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </div>
        </div>
      )}
    </div>
  )
}
