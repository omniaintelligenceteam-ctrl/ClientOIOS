// Phase Delta: InlineEdit component
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Pencil, Check, X } from 'lucide-react'

type InlineEditType = 'text' | 'number' | 'currency' | 'select'

interface SelectOption {
  value: string
  label: string
}

interface InlineEditProps {
  value: string | number
  type?: InlineEditType
  options?: SelectOption[]
  placeholder?: string
  className?: string
  onSave: (value: string | number) => Promise<void> | void
  formatDisplay?: (value: string | number) => string
  disabled?: boolean
}

export function InlineEdit({
  value,
  type = 'text',
  options = [],
  placeholder = 'Click to edit',
  className = '',
  onSave,
  formatDisplay,
  disabled = false,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  useEffect(() => {
    if (editing) {
      setEditValue(String(value))
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          if (inputRef.current instanceof HTMLInputElement) {
            inputRef.current.select()
          }
        }
      }, 10)
    }
  }, [editing, value])

  const handleSave = useCallback(async () => {
    if (saving) return
    setError(null)
    let saveVal: string | number = editValue
    if (type === 'number' || type === 'currency') {
      const num = parseFloat(editValue.replace(/[$,]/g, ''))
      if (isNaN(num)) {
        setError('Invalid number')
        return
      }
      saveVal = num
    }
    setSaving(true)
    try {
      await onSave(saveVal)
      setEditing(false)
    } catch (err) {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }, [editValue, onSave, saving, type])

  const handleCancel = useCallback(() => {
    setEditing(false)
    setEditValue(String(value))
    setError(null)
  }, [value])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'text') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Enter' && !(e.shiftKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }, [handleSave, handleCancel, type])

  const displayValue = formatDisplay ? formatDisplay(value) : String(value)

  if (disabled) {
    return <span className={className}>{displayValue || placeholder}</span>
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`group inline-flex items-center gap-1.5 rounded transition-colors hover:bg-white/[0.04] cursor-text ${className}`}
        title="Click to edit"
      >
        <span className={value ? '' : 'italic text-slate-600'}>
          {displayValue || placeholder}
        </span>
        <Pencil
          size={11}
          className="shrink-0 text-slate-600 opacity-0 transition-opacity group-hover:opacity-100"
        />
      </button>
    )
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-[#0B1120] px-2 py-1 shadow-lg shadow-teal-500/5">
        {type === 'select' ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-transparent text-sm text-[#F8FAFC] outline-none"
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-[#111827]">
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type === 'number' || type === 'currency' ? 'text' : 'text'}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-w-[80px] bg-transparent text-sm text-[#F8FAFC] outline-none placeholder-slate-600"
            style={{ width: `${Math.max(editValue.length, 8)}ch` }}
          />
        )}

        <div className="flex items-center gap-0.5">
          <button
            onClick={handleSave}
            disabled={saving}
            title="Save (Enter)"
            className="flex h-5 w-5 items-center justify-center rounded text-teal-400 transition-colors hover:bg-teal-500/10 disabled:opacity-50"
          >
            <Check size={11} />
          </button>
          <button
            onClick={handleCancel}
            title="Cancel (Esc)"
            className="flex h-5 w-5 items-center justify-center rounded text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-slate-300"
          >
            <X size={11} />
          </button>
        </div>
      </div>
      {error && (
        <span className="text-[10px] text-red-400">{error}</span>
      )}
    </div>
  )
}
