'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DatePickerProps {
  value: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(value ?? new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  // close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // calendar grid
  const days = useMemo(() => {
    const monthStart = startOfMonth(viewDate)
    const monthEnd = endOfMonth(viewDate)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [viewDate])

  const handleSelect = useCallback(
    (day: Date) => {
      onChange(day)
      setOpen(false)
    },
    [onChange]
  )

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-lg border bg-[#0B1120] px-3 text-sm transition-colors',
          'border-[rgba(148,163,184,0.1)] hover:border-[#2DD4BF]/30',
          open && 'border-[#2DD4BF]/40 ring-1 ring-[#2DD4BF]/20',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <Calendar size={14} className="text-[#64748B]" />
        <span className={cn(value ? 'text-[#F8FAFC]' : 'text-[#64748B]')}>
          {value ? format(value, 'MMM d, yyyy') : placeholder}
        </span>
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-white/[0.06] bg-[#111827]/95 backdrop-blur-xl p-3 shadow-xl animate-[slideInTop_0.15s_ease-out]">
          {/* Month nav */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewDate(subMonths(viewDate, 1))}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-[#F8FAFC]">
              {format(viewDate, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(addMonths(viewDate, 1))}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="mb-1 grid grid-cols-7 gap-0">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="py-1 text-center text-[10px] font-medium text-[#64748B]">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0">
            {days.map((day) => {
              const inMonth = isSameMonth(day, viewDate)
              const selected = value && isSameDay(day, value)
              const isToday = isSameDay(day, new Date())

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleSelect(day)}
                  className={cn(
                    'flex h-8 w-full items-center justify-center rounded-lg text-xs transition-colors',
                    !inMonth && 'text-[#334155]',
                    inMonth && !selected && 'text-slate-300 hover:bg-white/[0.06]',
                    isToday && !selected && 'font-semibold text-[#2DD4BF]',
                    selected && 'bg-[#2DD4BF] font-semibold text-[#0B1120]'
                  )}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
