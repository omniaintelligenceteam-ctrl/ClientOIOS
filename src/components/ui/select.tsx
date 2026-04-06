'use client'

import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { ChevronDown, Check, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SelectOption {
  label: string
  value: string
  icon?: ReactNode
}

interface SelectBaseProps {
  options: SelectOption[]
  placeholder?: string
  searchable?: boolean
  disabled?: boolean
  error?: boolean
  className?: string
}

interface SingleSelectProps extends SelectBaseProps {
  multiple?: false
  value: string
  onChange: (value: string) => void
}

interface MultiSelectProps extends SelectBaseProps {
  multiple: true
  value: string[]
  onChange: (value: string[]) => void
}

export type SelectProps = SingleSelectProps | MultiSelectProps

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Select(props: SelectProps) {
  const {
    options,
    placeholder = 'Select...',
    searchable = false,
    disabled = false,
    error = false,
    multiple = false,
    className,
  } = props

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [focusIdx, setFocusIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // filtered options
  const filtered = useMemo(
    () =>
      search
        ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
        : options,
    [options, search]
  )

  // close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // auto-focus search
  useEffect(() => {
    if (open && searchable) searchRef.current?.focus()
  }, [open, searchable])

  // scroll focused item into view
  useEffect(() => {
    if (focusIdx < 0 || !listRef.current) return
    const el = listRef.current.children[searchable ? focusIdx + 1 : focusIdx] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [focusIdx, searchable])

  const handleSelect = useCallback(
    (val: string) => {
      if (multiple) {
        const current = (props as MultiSelectProps).value
        const next = current.includes(val)
          ? current.filter((v) => v !== val)
          : [...current, val]
        ;(props as MultiSelectProps).onChange(next)
      } else {
        ;(props as SingleSelectProps).onChange(val)
        setOpen(false)
        setSearch('')
      }
    },
    [multiple, props]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setSearch('')
        return
      }
      if (!open) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault()
          setOpen(true)
        }
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusIdx((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && focusIdx >= 0) {
        e.preventDefault()
        handleSelect(filtered[focusIdx].value)
      }
    },
    [open, filtered, focusIdx, handleSelect]
  )

  // display text
  const displayText = useMemo(() => {
    if (multiple) {
      const vals = (props as MultiSelectProps).value
      if (vals.length === 0) return null
      const labels = vals
        .map((v) => options.find((o) => o.value === v)?.label)
        .filter(Boolean)
      return labels.length <= 2 ? labels.join(', ') : `${labels.length} selected`
    }
    const val = (props as SingleSelectProps).value
    return options.find((o) => o.value === val)?.label ?? null
  }, [multiple, props, options])

  const isSelected = useCallback(
    (val: string) => {
      if (multiple) return (props as MultiSelectProps).value.includes(val)
      return (props as SingleSelectProps).value === val
    },
    [multiple, props]
  )

  return (
    <div ref={containerRef} className={cn('relative', className)} onKeyDown={handleKeyDown}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-lg border bg-[#0B1120] px-3 text-sm transition-colors',
          'border-[rgba(148,163,184,0.1)] hover:border-[#2DD4BF]/30',
          open && 'border-[#2DD4BF]/40 ring-1 ring-[#2DD4BF]/20',
          error && 'border-red-500/60',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <span className={cn(displayText ? 'text-[#F8FAFC]' : 'text-[#64748B]')}>
          {displayText || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            'text-[#64748B] transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={listRef}
          className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-white/[0.06] bg-[#111827]/95 backdrop-blur-xl shadow-xl animate-[slideInTop_0.15s_ease-out]"
        >
          {searchable && (
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
              <Search size={14} className="text-[#64748B]" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setFocusIdx(0)
                }}
                placeholder="Search..."
                className="h-6 flex-1 bg-transparent text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-[#64748B] hover:text-slate-300">
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-[#64748B]">No results</div>
            ) : (
              filtered.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                    'text-slate-300 hover:bg-white/[0.06] hover:text-slate-100',
                    isSelected(opt.value) && 'text-[#2DD4BF]',
                    i === focusIdx && 'bg-white/[0.06]'
                  )}
                >
                  {opt.icon}
                  <span className="flex-1">{opt.label}</span>
                  {isSelected(opt.value) && <Check size={14} className="text-[#2DD4BF]" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
