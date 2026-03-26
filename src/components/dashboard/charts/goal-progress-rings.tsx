'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface GoalConfig {
  revenueTarget: number   // monthly $ target, default 50000
  conversionTarget: number // % target, default 30
  reviewTarget: number    // count/mo target, default 20
}

interface GoalProgressRingsProps {
  organizationId: string
  goals?: Partial<GoalConfig>
}

const DEFAULT_GOALS: GoalConfig = {
  revenueTarget: 50000,
  conversionTarget: 30,
  reviewTarget: 20,
}

interface RingProps {
  label: string
  value: number    // 0-100
  current: string  // display value
  target: string   // display target
  color: string
  delay: number
}

function Ring({ label, value, current, target, color, delay }: RingProps) {
  const [animated, setAnimated] = useState(false)
  const radius = 36
  const stroke = 4
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const pct = Math.min(Math.max(value, 0), 100)
  const offset = circumference - (pct / 100) * circumference

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: radius * 2, height: radius * 2 }}>
        {/* Background ring */}
        <svg width={radius * 2} height={radius * 2} className="rotate-[-90deg]">
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="rgba(148,163,184,0.08)"
            strokeWidth={stroke}
          />
          {/* Progress ring */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={animated ? offset : circumference}
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>
            {Math.round(pct)}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-slate-300">{label}</p>
        <p className="text-xs text-slate-500">
          {current} / {target}
        </p>
      </div>
    </div>
  )
}

export function GoalProgressRings({ organizationId, goals }: GoalProgressRingsProps) {
  const cfg = { ...DEFAULT_GOALS, ...goals }
  const [revenue, setRevenue] = useState(0)
  const [conversion, setConversion] = useState(0)
  const [reviews, setReviews] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) return
    const supabase = createSupabaseBrowserClient()

    const load = async () => {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

      // Revenue this month
      const { data: invRows } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('organization_id', organizationId)
        .eq('status', 'paid')
        .gte('created_at', monthStart)
        .lt('created_at', monthEnd)

      const rev = (invRows ?? []).reduce((sum, r) => sum + (r.total_amount ?? 0), 0)
      setRevenue(rev)

      // Conversion rate (won / total leads this month)
      const { count: total } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', monthStart)
        .lt('created_at', monthEnd)

      const { count: won } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'won')
        .gte('created_at', monthStart)
        .lt('created_at', monthEnd)

      const convRate = total && total > 0 ? ((won ?? 0) / total) * 100 : 0
      setConversion(convRate)

      // Reviews this month
      const { count: revCount } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', monthStart)
        .lt('created_at', monthEnd)

      setReviews(revCount ?? 0)
      setLoading(false)
    }

    load()
  }, [organizationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-8 py-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-[72px] h-[72px] rounded-full bg-slate-800 animate-pulse" />
            <div className="w-16 h-3 rounded bg-slate-800 animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  const formatCurrency = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toLocaleString()}`

  return (
    <div className="flex items-start justify-around gap-4 py-2">
      <Ring
        label="Revenue Target"
        value={(revenue / cfg.revenueTarget) * 100}
        current={formatCurrency(revenue)}
        target={formatCurrency(cfg.revenueTarget)}
        color="#2DD4BF"
        delay={100}
      />
      <Ring
        label="Lead Conversion"
        value={(conversion / cfg.conversionTarget) * 100}
        current={`${conversion.toFixed(1)}%`}
        target={`${cfg.conversionTarget}%`}
        color="#60a5fa"
        delay={250}
      />
      <Ring
        label="Review Count"
        value={(reviews / cfg.reviewTarget) * 100}
        current={String(reviews)}
        target={String(cfg.reviewTarget)}
        color="#a78bfa"
        delay={400}
      />
    </div>
  )
}
