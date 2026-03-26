'use client'

import { useState, useRef, useEffect } from 'react'
import type { InsightType } from '@/lib/ai/insight-engine'

interface InsightTooltipProps {
  children: React.ReactNode
  text: string
  type?: InsightType
  detail?: string
}

const borderMap: Record<InsightType, string> = {
  positive: 'border-green-500/30',
  warning:  'border-amber-500/30',
  neutral:  'border-slate-500/30',
  info:     'border-teal-500/30',
}

const dotMap: Record<InsightType, string> = {
  positive: 'bg-green-400',
  warning:  'bg-amber-400',
  neutral:  'bg-slate-400',
  info:     'bg-teal-400',
}

export function InsightTooltip({
  children,
  text,
  type = 'neutral',
  detail,
}: InsightTooltipProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<'top' | 'bottom'>('top')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    setPos(rect.top < 120 ? 'bottom' : 'top')
  }, [open])

  return (
    <div
      ref={wrapRef}
      className="relative inline-block cursor-default"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}

      {open && (
        <div
          className={`
            absolute z-50 w-56 rounded-xl border bg-[#0f1a2e] shadow-xl px-3 py-2.5
            pointer-events-none select-none
            ${borderMap[type]}
            ${pos === 'top'
              ? 'bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2'
              : 'top-[calc(100%+6px)] left-1/2 -translate-x-1/2'
            }
          `}
          role="tooltip"
        >
          <div className="flex items-start gap-2">
            <span className={`mt-[3px] h-2 w-2 flex-shrink-0 rounded-full ${dotMap[type]}`} />
            <div>
              <p className="text-xs text-slate-200 leading-snug">✨ {text}</p>
              {detail && (
                <p className="mt-1 text-[10px] text-slate-500 leading-snug">{detail}</p>
              )}
            </div>
          </div>
          {/* Arrow */}
          <div
            className={`
              absolute left-1/2 -translate-x-1/2 h-0 w-0
              border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent
              ${pos === 'top'
                ? 'top-full border-t-[5px] border-t-[#0f1a2e]'
                : 'bottom-full border-b-[5px] border-b-[#0f1a2e]'
              }
            `}
          />
        </div>
      )}
    </div>
  )
}
