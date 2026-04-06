'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  addMonths,
  subMonths,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
} from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DateRange {
  start: Date
  end: Date
}

interface DateRangePickerProps {
  value: DateRange | null
  onChange: (range: DateRange | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/* ------------------------------------------------------------------ */
/*  Presets                                                            */
/* ------------------------------------------------------------------ */

const presets: { label: string; range: () => DateRange }[] = [
  { label: 'Today', range: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }) },
  { label: 'Last 7 days', range: () => ({ start: startOfDay(subDays(new Date(), 6)), end: endOfDay(new Date()) }) },
  { label: 'Last 30 days', range: () => ({ start: startOfDay(subDays(new Date(), 29)), end: endOfDay(new Date()) }) },
  { label: 'Last 90 days', range: () => ({ start: startOfDay(subDays(new Date(), 89)), end: endOfDay(new Date()) }) },
  {
    label: 'This month',
    range: () => ({ start: startOfMonth(new Date()), end: endOfDay(new Date()) }),
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Select range',
  disabled = false,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(value?.start ?? new Date())
  const [picking, setPicking] = useState<Date | null>(null) // first pick
  const containerRef = useRef<HTMLDivElement>(null)

  // close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setPicking(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // calendar grid
  const days = useMemo(() => {
    const monthStart = startOfMonth(viewDate)
    const monthEnd = endOfMonth(viewDate)
    return eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) })
  }, [viewDate])

  const handleDayClick = useCallback(
    (day: Date) => {
      if (!picking) {
        setPicking(day)
      } else {
        const [start, end] = picking <= day ? [picking, day] : [day, picking]
        onChange({ start: startOfDay(start), end: endOfDay(end) })
        setPicking(null)
        setOpen(false)
      }
    },
    [picking, onChange]
  )

  const handlePreset = useCallback(
    (preset: (typeof presets)[0]) => {
      onChange(preset.range())
      setPicking(null)
      setOpen(false)
    },
    [onChange]
  )

  // display
  const displayText = value
    ? `${format(value.start, 'MMM d')} – ${format(value.end, 'MMM d, yyyy')}`
    : null

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
        <span className={cn(displayText ? 'text-[#F8FAFC]' : 'text-[#64748B]')}>
          {displayText || placeholder}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 flex gap-0 overflow-hidden rounded-xl border border-white/[0.06] bg-[#111827]/95 backdrop-blur-xl shadow-xl animate-[slideInTop_0.15s_ease-out]">
          {/* Presets */}
          <div className="flex w-36 flex-col border-r border-white/[0.06] py-2">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePreset(p)}
                className="px-3 py-1.5 text-left text-xs text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
              >
                {p.label}
              </button>
            ))}
            <div className="mx-3 my-1 border-t border-white/[0.06]" />
            <span className="px-3 py-1 text-[10px] font-medium text-[#64748B] uppercase tracking-wider">
              Custom
            </span>
          </div>

          {/* Calendar */}
          <div className="w-64 p-3">
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

            {/* Day headers */}
            <div className="mb-1 grid grid-cols-7">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} className="py-1 text-center text-[10px] font-medium text-[#64748B]">
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const inMonth = isSameMonth(day, viewDate)
                const isStart = (picking && isSameDay(day, picking)) || (value && isSameDay(day, value.start))
                const isEnd = value && !picking && isSameDay(day, value.end)
                const inRange =
                  value && !picking && isWithinInterval(day, { start: value.start, end: value.end })

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      'flex h-8 w-full items-center justify-center text-xs transition-colors',
                      !inMonth && 'text-[#334155]',
                      inMonth && !isStart && !isEnd && !inRange && 'text-slate-300 hover:bg-white/[0.06]',
                      inRange && !isStart && !isEnd && 'bg-[#2DD4BF]/10 text-[#2DD4BF]',
                      (isStart || isEnd) && 'bg-[#2DD4BF] font-semibold text-[#0B1120] rounded-lg'
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>

            {picking && (
              <p className="mt-2 text-center text-[10px] text-[#64748B]">
                Select end date
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
