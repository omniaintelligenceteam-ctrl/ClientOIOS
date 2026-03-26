'use client'

import { useState } from 'react'

interface CallHeatmapProps {
  data: number[][] // [day 0=Sun..6=Sat][hour 0..23]
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOUR_LABELS: Record<number, string> = {
  0: '12a',
  3: '3a',
  6: '6a',
  9: '9a',
  12: '12p',
  15: '3p',
  18: '6p',
  21: '9p',
}

function getHourLabel(hour: number): string {
  if (hour === 0) return '12am'
  if (hour < 12) return `${hour}am`
  if (hour === 12) return '12pm'
  return `${hour - 12}pm`
}

function cellColor(value: number, max: number): string {
  if (max === 0 || value === 0) return 'rgba(148,163,184,0.04)'
  const intensity = value / max
  // Interpolate from transparent to teal #2DD4BF
  const r = Math.round(45 * intensity)
  const g = Math.round(212 * intensity)
  const b = Math.round(191 * intensity)
  const a = 0.15 + intensity * 0.85
  return `rgba(${r},${g},${b},${a})`
}

export function CallHeatmap({ data }: CallHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    day: number
    hour: number
    count: number
    x: number
    y: number
  } | null>(null)

  const maxVal = Math.max(...data.flatMap((row) => row), 1)

  return (
    <div className="relative overflow-x-auto -mx-1 px-1">
      {/* Hour axis labels */}
      <div className="flex ml-10 mb-1">
        {Array.from({ length: 24 }, (_, h) => (
          <div
            key={h}
            className="flex-1 text-center"
            style={{ fontSize: 10, color: '#64748b', lineHeight: '1' }}
          >
            {HOUR_LABELS[h] ?? ''}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      <div className="space-y-1">
        {data.map((row, dayIdx) => (
          <div key={dayIdx} className="flex items-center gap-0">
            {/* Day label */}
            <div
              className="w-10 flex-shrink-0 text-right pr-2"
              style={{ fontSize: 11, color: '#64748b' }}
            >
              {DAY_LABELS[dayIdx]}
            </div>

            {/* Hour cells */}
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
    </div>
  )
}
