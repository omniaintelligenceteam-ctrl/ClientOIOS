'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface HeatmapCalendarProps {
  organizationId: string
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getHourLabel(hour: number): string {
  if (hour % 3 !== 0) return ''
  if (hour === 0) return '12a'
  if (hour < 12) return `${hour}a`
  if (hour === 12) return '12p'
  return `${hour - 12}p`
}

function cellColor(value: number, max: number): string {
  if (max === 0 || value === 0) return 'rgba(30,41,59,0.6)' // slate-800-ish
  const intensity = value / max
  // slate-800 (#1e293b) → teal-400 (#2DD4BF)
  const r = Math.round(30 + (45 - 30) * intensity)
  const g = Math.round(41 + (212 - 41) * intensity)
  const b = Math.round(59 + (191 - 59) * intensity)
  const a = 0.3 + intensity * 0.7
  return `rgba(${r},${g},${b},${a})`
}

export function HeatmapCalendar({ organizationId }: HeatmapCalendarProps) {
  // grid[day 0=Sun..6][hour 0..23]
  const [grid, setGrid] = useState<number[][]>(
    Array.from({ length: 7 }, () => Array(24).fill(0))
  )
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<{
    day: number
    hour: number
    count: number
    x: number
    y: number
  } | null>(null)

  useEffect(() => {
    if (!organizationId) return
    const supabase = createSupabaseBrowserClient()

    const load = async () => {
      // Fetch calls from last 90 days and aggregate client-side
      const since = new Date(Date.now() - 90 * 86_400_000).toISOString()
      const { data: rows } = await supabase
        .from('calls')
        .select('started_at')
        .eq('organization_id', organizationId)
        .gte('started_at', since)

      const newGrid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))

      if (rows && rows.length > 0) {
        for (const row of rows) {
          const d = new Date(row.started_at)
          const day = d.getDay()
          const hour = d.getHours()
          newGrid[day][hour]++
        }
      }

      setGrid(newGrid)
      setLoading(false)
    }

    load()
  }, [organizationId])

  const maxVal = Math.max(...grid.flatMap((r) => r), 1)

  if (loading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center gap-0.5">
            <div className="w-9 h-4 rounded bg-slate-800 animate-pulse" />
            {Array.from({ length: 24 }, (__, h) => (
              <div key={h} className="flex-1 h-4 rounded-sm bg-slate-800 animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="relative overflow-x-auto">
      {/* Hour axis */}
      <div className="flex ml-10 mb-1">
        {Array.from({ length: 24 }, (_, h) => (
          <div
            key={h}
            className="flex-1 text-center"
            style={{ fontSize: 9, color: '#64748b', lineHeight: '1' }}
          >
            {getHourLabel(h)}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      <div className="space-y-0.5">
        {grid.map((row, dayIdx) => (
          <div key={dayIdx} className="flex items-center">
            <div
              className="w-10 flex-shrink-0 text-right pr-2"
              style={{ fontSize: 10, color: '#64748b' }}
            >
              {DAY_LABELS[dayIdx]}
            </div>
            <div className="flex flex-1 gap-0.5">
              {row.map((count, hourIdx) => (
                <div
                  key={hourIdx}
                  className="flex-1 rounded-sm cursor-default transition-transform hover:scale-110 hover:z-10 relative"
                  style={{
                    height: 16,
                    backgroundColor: cellColor(count, maxVal),
                    border: '1px solid rgba(148,163,184,0.04)',
                  }}
                  onMouseEnter={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    setTooltip({ day: dayIdx, hour: hourIdx, count, x: rect.left + rect.width / 2, y: rect.top })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-xs text-slate-600">Low</span>
        <div className="flex gap-0.5">
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
            <div
              key={t}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: cellColor(t * maxVal, maxVal) }}
            />
          ))}
        </div>
        <span className="text-xs text-slate-600">High</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-1.5 rounded-lg text-xs text-slate-200 shadow-lg"
          style={{
            backgroundColor: '#111827',
            border: '1px solid rgba(148,163,184,0.15)',
            left: tooltip.x,
            top: tooltip.y - 36,
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
          }}
        >
          {DAY_LABELS[tooltip.day]}{' '}
          {tooltip.hour === 0
            ? '12am'
            : tooltip.hour < 12
            ? `${tooltip.hour}am`
            : tooltip.hour === 12
            ? '12pm'
            : `${tooltip.hour - 12}pm`}{' '}
          — <span className="text-teal-400 font-semibold">{tooltip.count}</span> call
          {tooltip.count !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
