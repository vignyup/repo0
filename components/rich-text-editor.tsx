"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

// Import the CSS separately to avoid SSR issues
import "react-quill/dist/quill.snow.css"

// Use a more robust dynamic import approach
const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import("react-quill")
    return RQ
  },
  {
    ssr: false,
    loading: () => (
      <div className="border rounded-md p-4 h-[300px] flex items-center justify-center">Loading editor...</div>
    ),
  },
)

interface RichTextEditorProps {
  initialValue?: string
  onChange: (content: string) => void
  height?: number
}

export default function RichTextEditor({ initialValue = "", onChange, height = 300 }: RichTextEditorProps) {
  const [value, setValue] = useState(initialValue)
  const [mounted, setMounted] = useState(false)
  const [editorError, setEditorError] = useState<Error | null>(null)

  useEffect(() => {
    setMounted(true)

    // Handle potential import errors
    const checkQuillAvailability = async () => {
      try {
        await import("react-quill")
      } catch (error) {
        console.error("Error loading React-Quill:", error)
        setEditorError(error instanceof Error ? error : new Error("Failed to load editor"))
      }
    }

    checkQuillAvailability()
  }, [])

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      [{ align: [] }],
      ["link"],
      ["clean"],
    ],
  }

  const formats = ["header", "bold", "italic", "underline", "strike", "list", "bullet", "indent", "align", "link"]

  const handleChange = (content: string) => {
    setValue(content)
    onChange(content)
  }

  // If there's an error loading React-Quill, fall back to the simple editor
  if (editorError) {
    // Import and use SimpleRichTextEditor as fallback
    const SimpleEditor = dynamic(() => import("./simple-rich-text-editor"), {
      ssr: false,
      loading: () => (
        <div className="border rounded-md p-4 h-[300px] flex items-center justify-center">Loading simple editor...</div>
      ),
    })

    return <SimpleEditor initialValue={initialValue} onChange={onChange} height={height} />
  }

  if (!mounted) {
    return <div className="border rounded-md p-4 h-[300px] flex items-center justify-center">Loading editor...</div>
  }

  return (
    <div className="rich-text-editor">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        style={{ height: `${height}px` }}
      />
      <style jsx global>{`
        .rich-text-editor .ql-container {
          height: ${height - 42}px;
          border-bottom-left-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
          font-size: 1rem;
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 0.375rem;
          border-top-right-radius: 0.375rem;
        }
        .rich-text-editor .ql-editor {
          min-height: ${height - 42}px;
        }
      `}</style>
    </div>
  )
}
