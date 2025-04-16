"use client"

import { LayoutGrid, Table2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ViewMode = "board" | "table"

interface ViewToggleProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
}

export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-md border">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("board")}
        className={cn(
          "rounded-none rounded-l-md px-3 gap-2",
          currentView === "board" ? "bg-muted" : "hover:bg-transparent",
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        Board
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("table")}
        className={cn(
          "rounded-none rounded-r-md px-3 gap-2 border-l",
          currentView === "table" ? "bg-muted" : "hover:bg-transparent",
        )}
      >
        <Table2 className="h-4 w-4" />
        Table
      </Button>
    </div>
  )
}
