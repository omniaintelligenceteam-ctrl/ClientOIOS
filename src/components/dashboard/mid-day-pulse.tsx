'use client'

import { useEffect, useState } from 'react'
import { Activity, Phone, Target, CalendarCheck, DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { generateStatInsight } from '@/lib/ai/insight-engine'
import { demoMetrics } from '@/lib/demo-data'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PulseMetrics {
  callsSoFar: number
  callsGoal: number
  leadsSoFar: number
  leadsGoal: number
  jobsSoFar: number
  jobsGoal: number
  revenueSoFar: number
  revenueGoal: number
}

interface MidDayPulseProps {
  organizationId: string
  isDemoMode?: boolean
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({
  label,
  icon: Icon,
  value,
  goal,
  unit = '',
  formatValue,
}: {
  label: string
  icon: React.ElementType
  value: number
  goal: number
  unit?: string
  formatValue?: (v: number) => string
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0
  const display = formatValue ? formatValue(value) : `${value}`
  const goalDisplay = formatValue ? formatValue(goal) : `${goal}${unit}`

  const barColor =
    pct >= 100 ? 'bg-green-500' :
    pct >= 75  ? 'bg-teal-500' :
    pct >= 50  ? 'bg-teal-400' :
    pct >= 25  ? 'bg-amber-400' :
                 'bg-amber-500'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-200">{display}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-500">{goalDisplay}</span>
          <span className={`text-[10px] font-bold ml-1 ${pct >= 100 ? 'text-green-400' : 'text-slate-500'}`}>
            {pct}%
          </span>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[rgba(148,163,184,0.08)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Trend icon
// ---------------------------------------------------------------------------

function TrendIcon({ pct }: { pct: number }) {
  if (pct >= 5) return <TrendingUp className="h-4 w-4 text-green-400" />
  if (pct <= -5) return <TrendingDown className="h-4 w-4 text-amber-400" />
  return <Minus className="h-4 w-4 text-slate-500" />
}

// ---------------------------------------------------------------------------
// Main component — only renders after 12pm
// ---------------------------------------------------------------------------

export function MidDayPulse({ organizationId, isDemoMode }: MidDayPulseProps) {
  const [metrics, setMetrics] = useState<PulseMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  const hour = new Date().getHours()
  // Only show after 12pm (always show in demo mode)
  if (hour < 12 && !isDemoMode) return null

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    // In demo mode, use static demo metrics instead of querying DB
    if (isDemoMode) {
      setMetrics({
        callsSoFar:   demoMetrics.callsToday,
        callsGoal:    20,
        leadsSoFar:   demoMetrics.leadsToday,
        leadsGoal:    8,
        jobsSoFar:    demoMetrics.jobsBookedToday,
        jobsGoal:     5,
        revenueSoFar: demoMetrics.revenueThisMonth,
        revenueGoal:  15000,
      })
      setLoading(false)
      return
    }

    if (!organizationId) {
      setLoading(false)
      return
    }

    async function load() {
      const supabase = createSupabaseBrowserClient()
      const now = new Date()
      const todayStart = now.toISOString().split('T')[0]
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

      const [callsRes, leadsRes, jobsRes, revenueRes, metricsRes] = await Promise.all([
        supabase
          .from('calls')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .gte('started_at', todayStart),

        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .gte('created_at', todayStart),

        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .gte('created_at', todayStart)
          .in('status', ['scheduled', 'confirmed', 'completed']),

        supabase
          .from('invoices')
          .select('amount')
          .eq('organization_id', organizationId)
          .eq('status', 'paid')
          .gte('paid_at', monthStart)
          .lt('paid_at', monthEnd),

        // Try to get business_metrics_daily for goals
        supabase
          .from('business_metrics_daily')
          .select('*')
          .eq('organization_id', organizationId)
          .order('date', { ascending: false })
          .limit(30),
      ])

      // Calculate rolling average from recent metrics for goals
      const recentMetrics: Array<Record<string, number>> = (metricsRes.data as Array<Record<string, number>>) || []
      function avgMetric(key: string, fallback: number): number {
        const vals = recentMetrics.map((m) => m[key]).filter(Boolean) as number[]
        if (!vals.length) return fallback
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      }

      const revenueSoFar = ((revenueRes.data as Array<{ amount: number }>) || []).reduce(
        (s, inv) => s + (inv.amount || 0),
        0
      )

      setMetrics({
        callsSoFar:   callsRes.count  || 0,
        callsGoal:    avgMetric('total_calls', 20),
        leadsSoFar:   leadsRes.count  || 0,
        leadsGoal:    avgMetric('new_leads', 8),
        jobsSoFar:    jobsRes.count   || 0,
        jobsGoal:     avgMetric('appointments_booked', 5),
        revenueSoFar,
        revenueGoal:  avgMetric('revenue_collected', 5000),
      })
      setLoading(false)
    }

    load()
  }, [organizationId, isDemoMode])

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 animate-pulse">
        <div className="h-4 w-40 rounded bg-[rgba(148,163,184,0.1)] mb-4" />
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-8 rounded bg-[rgba(148,163,184,0.06)]" />)}
        </div>
      </div>
    )
  }

  if (!metrics) return null

  // Trending summary
  const overallPct = metrics.callsGoal > 0
    ? Math.round(
        (
          (metrics.callsSoFar  / metrics.callsGoal) +
          (metrics.leadsSoFar  / metrics.leadsGoal) +
          (metrics.jobsSoFar   / metrics.jobsGoal) +
          (metrics.revenueSoFar / metrics.revenueGoal)
        ) / 4 * 100
      )
    : 0

  const trending =
    overallPct >= 90 ? { label: 'Crushing it today', color: 'text-green-400' } :
    overallPct >= 70 ? { label: 'On track', color: 'text-teal-400' } :
    overallPct >= 50 ? { label: 'Mid-pack pace', color: 'text-amber-400' } :
                       { label: 'Behind pace — push harder', color: 'text-amber-400' }

  const revenueInsight = generateStatInsight('Revenue', metrics.revenueSoFar, 0, { goal: metrics.revenueGoal })

  return (
    <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-teal-400" />
          <h2 className="text-sm font-semibold text-slate-200">Mid-Day Pulse</h2>
          <span className="text-[10px] text-slate-500 ml-1">so far today</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-medium ${trending.color}`}>
          <TrendIcon pct={overallPct - 75} />
          {trending.label}
        </div>
      </div>

      {/* Progress bars */}
      <div className="space-y-3.5">
        <ProgressBar
          label="Calls handled"
          icon={Phone}
          value={metrics.callsSoFar}
          goal={metrics.callsGoal}
        />
        <ProgressBar
          label="New leads"
          icon={Target}
          value={metrics.leadsSoFar}
          goal={metrics.leadsGoal}
        />
        <ProgressBar
          label="Jobs booked"
          icon={CalendarCheck}
          value={metrics.jobsSoFar}
          goal={metrics.jobsGoal}
        />
        <ProgressBar
          label="Revenue collected"
          icon={DollarSign}
          value={metrics.revenueSoFar}
          goal={metrics.revenueGoal}
          formatValue={(v) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`}
        />
      </div>

      {/* Insight footer */}
      <div className="mt-4 pt-4 border-t border-[rgba(148,163,184,0.06)] flex items-center gap-2">
        <span className={`text-xs font-medium ${
          revenueInsight.type === 'positive' ? 'text-green-400' :
          revenueInsight.type === 'warning'  ? 'text-amber-400' :
          revenueInsight.type === 'info'     ? 'text-teal-400' :
          'text-slate-400'
        }`}>
          ✨ {revenueInsight.text}
        </span>
      </div>
    </div>
  )
}
