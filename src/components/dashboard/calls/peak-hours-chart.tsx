'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Loader2 } from 'lucide-react'
import type { Call } from '@/lib/types'

interface PeakHoursChartProps {
  organizationId: string
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOUR_LABELS: Record<number, string> = { 0: '12a', 3: '3a', 6: '6a', 9: '9a', 12: '12p', 15: '3p', 18: '6p', 21: '9p' }

function getHourLabel(hour: number): string {
  if (hour === 0) return '12am'
  if (hour < 12) return `${hour}am`
  if (hour === 12) return '12pm'
  return `${hour - 12}pm`
}

function cellColor(value: number, max: number): string {
  if (max === 0 || value === 0) return 'rgba(148,163,184,0.04)'
  const intensity = value / max
  const r = Math.round(45 * intensity)
  const g = Math.round(212 * intensity)
  const b = Math.round(191 * intensity)
  const a = 0.15 + intensity * 0.85
  return `rgba(${r},${g},${b},${a})`
}

function buildEmptyMatrix(): number[][] {
  return Array.from({ length: 7 }, () => Array(24).fill(0))
}

export function PeakHoursChart({ organizationId }: PeakHoursChartProps) {
  const [matrix, setMatrix] = useState<number[][]>(buildEmptyMatrix())
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<{ day: number; hour: number; count: number; x: number; y: number } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createSupabaseBrowserClient()
      const since = new Date()
      since.setDate(since.getDate() - 90)

      const { data: calls } = await supabase
        .from('calls')
        .select('started_at')
        .eq('organization_id', organizationId)
        .gte('started_at', since.toISOString())

      const m = buildEmptyMatrix()
      ;(calls as unknown as Pick<Call, 'started_at'>[] | null)?.forEach((call) => {
        const d = new Date(call.started_at)
        m[d.getDay()][d.getHours()]++
      })

      setMatrix(m)
      setLoading(false)
    }

    fetchData()
  }, [organizationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-[#2DD4BF]" />
      </div>
    )
  }

  const maxVal = Math.max(...matrix.flatMap((row: number[]) => row), 1)

  return (
    <div className="relative overflow-x-auto -mx-1 px-1">
      {/* Hour labels */}
      <div className="flex ml-10 mb-1">
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="flex-1 text-center" style={{ fontSize: 10, color: '#64748b', lineHeight: '1' }}>
            {HOUR_LABELS[h] ?? ''}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="space-y-1">
        {matrix.map((row, dayIdx) => (
          <div key={dayIdx} className="flex items-center gap-0">
            <div className="w-10 flex-shrink-0 text-right pr-2" style={{ fontSize: 11, color: '#64748b' }}>
              {DAY_LABELS[dayIdx]}
            </div>
            <div className="flex flex-1 gap-0.5">
              {row.map((count, hourIdx) => (
                <div
                  key={hourIdx}
                  className="flex-1 rounded-sm cursor-default transition-transform hover:scale-110"
                  style={{
                    height: 18,
                    backgroundColor: cellColor(count, maxVal),
                    border: '1px solid rgba(148,163,184,0.04)',
                  }}
                  onMouseEnter={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    setTooltip({ day: dayIdx, hour: hourIdx, count, x: rect.left, y: rect.top })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-1.5 rounded-lg text-xs text-slate-200 shadow-lg"
          style={{
            backgroundColor: '#111827',
            border: '1px solid rgba(148,163,184,0.1)',
            left: tooltip.x,
            top: tooltip.y - 36,
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
          }}
        >
          {DAY_LABELS[tooltip.day]}, {getHourLabel(tooltip.hour)} — {tooltip.count} call{tooltip.count !== 1 ? 's' : ''}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 ml-10">
        <span className="text-xs text-slate-500">Less</span>
        <div className="flex gap-0.5">
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v, i) => (
            <div key={i} className="h-3 w-4 rounded-sm" style={{ backgroundColor: cellColor(v, 1) }} />
          ))}
        </div>
        <span className="text-xs text-slate-500">More</span>
      </div>
    </div>
  )
}
