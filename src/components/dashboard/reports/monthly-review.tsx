'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DailyRevenue {
  day: number
  thisMonth: number
  lastMonth: number
}

interface MonthlyStats {
  revenueChange: number
  leadCountChange: number
  callVolumeChange: number
  thisMonthRevenue: number
  lastMonthRevenue: number
  thisMonthLeads: number
  lastMonthLeads: number
  thisMonthCalls: number
  lastMonthCalls: number
}

interface MonthlyReviewProps {
  organizationId: string
  isDemoMode: boolean
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const cardClass =
  'backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6'

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#111827',
    border: '1px solid rgba(148,163,184,0.1)',
    borderRadius: '12px',
  },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#e2e8f0' },
}

const COLORS = {
  primary: '#2DD4BF',
  secondary: '#818cf8',
  accent: '#f97316',
}

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

function generateDemoData(): { daily: DailyRevenue[]; stats: MonthlyStats } {
  const daily: DailyRevenue[] = Array.from({ length: 28 }, (_, i) => ({
    day: i + 1,
    thisMonth: Math.floor(Math.random() * 2500) + 500,
    lastMonth: Math.floor(Math.random() * 2000) + 400,
  }))

  const thisTotal = daily.reduce((s, d) => s + d.thisMonth, 0)
  const lastTotal = daily.reduce((s, d) => s + d.lastMonth, 0)

  return {
    daily,
    stats: {
      revenueChange:
        lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : 0,
      leadCountChange: 14,
      callVolumeChange: -3,
      thisMonthRevenue: thisTotal,
      lastMonthRevenue: lastTotal,
      thisMonthLeads: 87,
      lastMonthLeads: 76,
      thisMonthCalls: 312,
      lastMonthCalls: 322,
    },
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 100)
}

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="h-4 w-4 text-emerald-400" />
  if (value < 0) return <TrendingDown className="h-4 w-4 text-red-400" />
  return <Minus className="h-4 w-4 text-slate-500" />
}

function ChangeCard({
  label,
  change,
  current,
  previous,
}: {
  label: string
  change: number
  current: string
  previous: string
}) {
  const color = change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-slate-400'
  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500">{label}</p>
        <TrendIcon value={change} />
      </div>
      <p
        className={`text-2xl font-bold ${color}`}
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        {change > 0 ? '+' : ''}
        {change}%
      </p>
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        <span>{current} this mo</span>
        <span className="text-slate-600">vs</span>
        <span>{previous} last mo</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={cardClass}>
            <div className="h-20 rounded-lg bg-white/[0.04]" />
          </div>
        ))}
      </div>
      <div className={cardClass}>
        <div className="h-72 rounded-lg bg-white/[0.04]" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MonthlyReview({
  organizationId,
  isDemoMode,
}: MonthlyReviewProps) {
  const [daily, setDaily] = useState<DailyRevenue[]>([])
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemoMode) {
      const demo = generateDemoData()
      setDaily(demo.daily)
      setStats(demo.stats)
      setLoading(false)
      return
    }

    if (!organizationId) return

    const load = async () => {
      try {
        const supabase = createSupabaseBrowserClient()

        const now = new Date()
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

        const [
          thisCallsRes,
          lastCallsRes,
          thisLeadsRes,
          lastLeadsRes,
          thisInvRes,
          lastInvRes,
        ] = await Promise.all([
          supabase
            .from('calls')
            .select('id, created_at')
            .eq('organization_id', organizationId)
            .gte('created_at', thisMonthStart.toISOString()),
          supabase
            .from('calls')
            .select('id, created_at')
            .eq('organization_id', organizationId)
            .gte('created_at', lastMonthStart.toISOString())
            .lte('created_at', lastMonthEnd.toISOString()),
          supabase
            .from('leads')
            .select('id, created_at')
            .eq('organization_id', organizationId)
            .gte('created_at', thisMonthStart.toISOString()),
          supabase
            .from('leads')
            .select('id, created_at')
            .eq('organization_id', organizationId)
            .gte('created_at', lastMonthStart.toISOString())
            .lte('created_at', lastMonthEnd.toISOString()),
          supabase
            .from('invoices')
            .select('amount, created_at')
            .eq('organization_id', organizationId)
            .gte('created_at', thisMonthStart.toISOString()),
          supabase
            .from('invoices')
            .select('amount, created_at')
            .eq('organization_id', organizationId)
            .gte('created_at', lastMonthStart.toISOString())
            .lte('created_at', lastMonthEnd.toISOString()),
        ])

        const thisCalls = thisCallsRes.data ?? []
        const lastCalls = lastCallsRes.data ?? []
        const thisLeads = thisLeadsRes.data ?? []
        const lastLeads = lastLeadsRes.data ?? []
        const thisInv = thisInvRes.data ?? []
        const lastInv = lastInvRes.data ?? []

        const thisRevenue = thisInv.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0)
        const lastRevenue = lastInv.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0)

        // Build daily comparison
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        const dailyArr: DailyRevenue[] = Array.from({ length: daysInMonth }, (_, idx) => {
          const dayNum = idx + 1
          const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
          const lastKey = `${lastMonthStart.getFullYear()}-${String(lastMonthStart.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`

          const thisDay = thisInv
            .filter((inv: any) => inv.created_at?.startsWith(thisKey))
            .reduce((s: number, inv: any) => s + (Number(inv.amount) || 0), 0)
          const lastDay = lastInv
            .filter((inv: any) => inv.created_at?.startsWith(lastKey))
            .reduce((s: number, inv: any) => s + (Number(inv.amount) || 0), 0)

          return { day: dayNum, thisMonth: thisDay, lastMonth: lastDay }
        })

        setDaily(dailyArr)
        setStats({
          revenueChange: pctChange(thisRevenue, lastRevenue),
          leadCountChange: pctChange(thisLeads.length, lastLeads.length),
          callVolumeChange: pctChange(thisCalls.length, lastCalls.length),
          thisMonthRevenue: thisRevenue,
          lastMonthRevenue: lastRevenue,
          thisMonthLeads: thisLeads.length,
          lastMonthLeads: lastLeads.length,
          thisMonthCalls: thisCalls.length,
          lastMonthCalls: lastCalls.length,
        })
      } catch {
        // Fail silently
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [organizationId, isDemoMode])

  if (loading) return <Skeleton />

  if (!stats) {
    return (
      <div className={cardClass}>
        <p className="text-center text-slate-500 py-12">
          No monthly data available yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Change stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChangeCard
          label="Revenue Change"
          change={stats.revenueChange}
          current={fmt(stats.thisMonthRevenue)}
          previous={fmt(stats.lastMonthRevenue)}
        />
        <ChangeCard
          label="Lead Count Change"
          change={stats.leadCountChange}
          current={stats.thisMonthLeads.toLocaleString()}
          previous={stats.lastMonthLeads.toLocaleString()}
        />
        <ChangeCard
          label="Call Volume Change"
          change={stats.callVolumeChange}
          current={stats.thisMonthCalls.toLocaleString()}
          previous={stats.lastMonthCalls.toLocaleString()}
        />
      </div>

      {/* Area chart: this month vs last month */}
      <div className={cardClass}>
        <h3 className="text-sm font-medium text-slate-400 mb-4">
          Daily Revenue: This Month vs Last Month
        </h3>
        {daily.length === 0 ? (
          <p className="text-center text-slate-500 py-12">No data to chart.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="gradThis" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.secondary} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={COLORS.secondary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.08)"
              />
              <XAxis
                dataKey="day"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => fmt(value)}
              />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="thisMonth"
                name="This Month"
                stroke={COLORS.primary}
                fill="url(#gradThis)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="lastMonth"
                name="Last Month"
                stroke={COLORS.secondary}
                fill="url(#gradLast)"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
