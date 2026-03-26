'use client'

import { useState } from 'react'
import { GitCompare } from 'lucide-react'

export type ComparisonPeriod = 'off' | 'last_week' | 'last_month'

interface ComparisonToggleProps {
  value: ComparisonPeriod
  onChange: (period: ComparisonPeriod) => void
}

const OPTIONS: { value: ComparisonPeriod; label: string }[] = [
  { value: 'last_week', label: 'vs last week' },
  { value: 'last_month', label: 'vs last month' },
]

export function ComparisonToggle({ value, onChange }: ComparisonToggleProps) {
  const isActive = value !== 'off'

  return (
    <div className="flex items-center gap-1 rounded-xl bg-[rgba(148,163,184,0.05)] border border-[rgba(148,163,184,0.08)] p-1">
      <div className="flex items-center gap-1 px-2 text-slate-500">
        <GitCompare className="h-3.5 w-3.5" />
      </div>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(value === opt.value ? 'off' : opt.value)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            value === opt.value
              ? 'bg-teal-600/20 border border-teal-500/30 text-teal-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Hook to get the date range offset for a comparison period.
 * Returns the number of days to subtract to get the previous period's start.
 */
export function useComparisonDateRange(period: ComparisonPeriod): {
  offsetDays: number | null
  label: string | null
} {
  if (period === 'off') return { offsetDays: null, label: null }
  if (period === 'last_week') return { offsetDays: 7, label: 'Last Week' }
  return { offsetDays: 30, label: 'Last Month' }
}
