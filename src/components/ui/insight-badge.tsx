'use client'

import { useEffect, useState } from 'react'
import type { InsightType } from '@/lib/ai/insight-engine'

interface InsightBadgeProps {
  text: string
  type: InsightType
  className?: string
}

const colorMap: Record<InsightType, string> = {
  positive: 'bg-green-500/10 border-green-500/20 text-green-400',
  warning:  'bg-amber-500/10 border-amber-500/20 text-amber-400',
  neutral:  'bg-slate-500/10 border-slate-500/20 text-slate-400',
  info:     'bg-teal-500/10 border-teal-500/20 text-teal-400',
}

export function InsightBadge({ text, type, className = '' }: InsightBadgeProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Small delay so it fades in after the parent stat card
    const t = setTimeout(() => setVisible(true), 120)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className={`
        inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium
        transition-all duration-500 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
        ${colorMap[type]}
        ${className}
      `}
    >
      <span>✨</span>
      <span>{text}</span>
    </div>
  )
}
