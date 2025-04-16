"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback, memo } from "react"
import { Bold, Italic, Underline, List, ListOrdered, Link, AlignLeft, AlignCenter, AlignRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SimpleRichTextEditorProps {
  initialValue?: string
  onChange: (content: string) => void
  height?: number
}

// Use memo to prevent unnecessary re-renders
const SimpleRichTextEditor = memo(function SimpleRichTextEditor({
  initialValue = "",
  onChange,
  height = 300,
}: SimpleRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const lastContentRef = useRef<string>(initialValue)
  const changeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize the editor once on mount
  useEffect(() => {
    setMounted(true)
    if (editorRef.current) {
      editorRef.current.innerHTML = initialValue
      lastContentRef.current = initialValue
    }

    return () => {
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current)
      }
    }
  }, [initialValue])

  // Fix for list buttons
  const handleListCommand = useCallback((command: string) => {
    if (!editorRef.current) return

    // Save selection
    const selection = window.getSelection()
    const range = selection?.getRangeAt(0)

    // Execute command
    document.execCommand(command, false)

    // Force focus back to editor and restore selection position
    editorRef.current.focus()

    // Trigger change event
    handleEditorChange()
  }, [])

  // Memoize the execCommand function
  const execCommand = useCallback(
    (command: string, value = "") => {
      if (!editorRef.current) return

      // Special handling for list commands
      if (command === "insertUnorderedList" || command === "insertOrderedList") {
        handleListCommand(command)
        return
      }

      // For other commands
      document.execCommand(command, false, value)

      // Force focus back to editor
      editorRef.current.focus()

      // Get updated content
      const newContent = editorRef.current.innerHTML
      lastContentRef.current = newContent
      onChange(newContent)
    },
    [onChange, handleListCommand],
  )

  // Debounce the handleEditorChange function
  const handleEditorChange = useCallback(() => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML

      // Only update if content has changed
      if (newContent !== lastContentRef.current) {
        lastContentRef.current = newContent

        // Debounce the onChange call
        if (changeTimeoutRef.current) {
          clearTimeout(changeTimeoutRef.current)
        }

        changeTimeoutRef.current = setTimeout(() => {
          onChange(newContent)
        }, 300)
      }
    }
  }, [onChange])

  // Handle keydown events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Don't override Enter behavior when in a list
      const selection = window.getSelection()
      if (!selection) return

      const parentList =
        selection.anchorNode?.parentElement?.closest("ul, ol") ||
        selection.anchorNode?.parentNode?.parentNode?.closest("ul, ol")

      if (parentList) return // Let the browser handle Enter in lists

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()

        // Insert a proper <br> followed by a space to ensure the cursor moves to the next line
        document.execCommand("insertHTML", false, "<br><br>")

        // Trigger change event
        handleEditorChange()
      }
    },
    [handleEditorChange],
  )

  if (!mounted) {
    return <div className="border rounded-md p-4 h-[300px] flex items-center justify-center">Loading editor...</div>
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2 bg-secondary/30 border-b">
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand("bold")}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCommand("italic")}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => execCommand("underline")}
        >
          <Underline className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-border mx-1"></div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => execCommand("justifyLeft")}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => execCommand("justifyCenter")}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => execCommand("justifyRight")}
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-border mx-1"></div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => execCommand("insertUnorderedList")}
          aria-label="Unordered List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => execCommand("insertOrderedList")}
          aria-label="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => {
            const url = prompt("Enter link URL:")
            if (url) execCommand("createLink", url)
          }}
        >
          <Link className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        className="p-3 outline-none overflow-y-auto rich-text-content"
        style={{ height: height ? `${height - 50}px` : "250px" }}
        onInput={handleEditorChange}
        onBlur={handleEditorChange}
        onKeyDown={handleKeyDown}
      />
    </div>
  )
})

export default SimpleRichTextEditor
