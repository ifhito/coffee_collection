"use client"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

type Option = { label: string; value: string } | string

function toOpt(o: Option): { label: string; value: string } {
  if (typeof o === 'string') return { label: o, value: o }
  return o
}

export function SelectBox({
  value,
  onChange,
  options,
  placeholder = '選択してください',
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  options: Option[]
  placeholder?: string
  className?: string
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null)

  const opts = options.map(toOpt)
  const current = opts.find(o => o.value === value)

  const updateRect = () => {
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setRect({ top: r.bottom, left: r.left, width: r.width })
  }

  useLayoutEffect(() => { if (open) updateRect() }, [open])
  useEffect(() => {
    if (!open) return
    const onScroll = () => updateRect()
    const onResize = () => updateRect()
    const onClick = (e: MouseEvent) => {
      if (!btnRef.current) return
      if (!(e.target instanceof Node)) return
      if (!btnRef.current.contains(e.target)) setOpen(false)
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    window.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('click', onClick)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        className={[
          'w-full h-10 rounded-md border bg-background px-3 text-left',
          'outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] flex items-center justify-between',
          className,
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span className={value ? '' : 'text-muted-foreground'}>
          {current ? current.label : placeholder}
        </span>
        <span aria-hidden>▾</span>
      </button>
      {open && rect && (
        <div
          role="listbox"
          className="fixed z-50 max-h-60 overflow-auto rounded-md border bg-card shadow-md"
          style={{ top: rect.top + 4, left: rect.left, width: rect.width }}
        >
          {opts.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">候補がありません</div>
          )}
          {opts.map(o => (
            <div
              key={o.value}
              role="option"
              aria-selected={value === o.value}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={[
                'px-3 py-2 text-sm cursor-pointer',
                value === o.value ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground',
              ].join(' ')}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

