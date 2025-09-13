"use client"
import { useRef, useState } from "react"

export function TagInput({
  value,
  onChange,
  placeholder = "入力してEnter / , で追加",
  className = "",
  inputId,
}: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  className?: string
  inputId?: string
}) {
  const [text, setText] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)

  const add = (raw: string) => {
    const items = raw
      .split(/[、,]/)
      .map(s => s.trim())
      .filter(Boolean)
    if (items.length === 0) return
    const next = Array.from(new Set([...value, ...items]))
    onChange(next)
    setText("")
  }

  const removeAt = (idx: number) => {
    const next = value.filter((_, i) => i !== idx)
    onChange(next)
  }

  return (
    <div
      className={["rounded-md border bg-background px-2 py-1.5", className].join(" ")}
      onMouseDown={(e) => {
        // Keep focus on input when clicking container; do not trigger unintended actions
        e.preventDefault()
        inputRef.current?.focus()
      }}
    >
      <div className="flex flex-wrap gap-1.5">
        {value.map((t, i) => (
          <span key={`${t}-${i}`} className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs">
            {t}
            <button
              type="button"
              className="text-muted-foreground"
              onClick={(e) => { e.stopPropagation(); removeAt(i) }}
              aria-label={`${t} を削除`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={inputId}
          className="min-w-[8ch] flex-1 bg-transparent outline-none px-1 text-sm placeholder:text-muted-foreground"
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              add(text)
            } else if (e.key === 'Backspace' && text === '' && value.length > 0 && document.activeElement === inputRef.current) {
              // Remove last tag only when input is focused and empty
              removeAt(value.length - 1)
            }
          }}
          onBlur={() => { if (text.trim()) add(text) }}
        />
      </div>
    </div>
  )
}
