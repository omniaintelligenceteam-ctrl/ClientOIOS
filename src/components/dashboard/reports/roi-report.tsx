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
} from 'recharts'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { TrendingUp, DollarSign, PhoneCall, PiggyBank } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RevenueTrendRow {
  label: string
  revenue: number
}

interface RoiStats {
  roiPercentage: number
  totalRevenue: number
  totalCost: number
  netValue: number
  revenuePerCall: number
}

interface RoiReportProps {
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

function generateDemoData(): { trend: RevenueTrendRow[]; stats: RoiStats } {
  const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12']
  const trend: RevenueTrendRow[] = weeks.map((label, i) => ({
    label,
    revenue: Math.floor(3000 + i * 400 + Math.random() * 1500),
  }))

  const totalRevenue = trend.reduce((s, t) => s + t.revenue, 0)
  const totalCost = Math.round(totalRevenue * 0.22)
  const netValue = totalRevenue - totalCost

  return {
    trend,
    stats: {
      roiPercentage: Math.round((netValue / totalCost) * 100),
      totalRevenue,
      totalCost,
      netValue,
      revenuePerCall: Math.round(totalRevenue / 340),
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

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
}) {
  return (
    <div className={cardClass}>
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p
            className="text-xl font-bold text-white"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className={cardClass}>
        <div className="h-32 rounded-lg bg-white/[0.04]" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={cardClass}>
            <div className="h-14 rounded-lg bg-white/[0.04]" />
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

export function RoiReport({
  organizationId,
  isDemoMode,
}: RoiReportProps) {
  const [trend, setTrend] = useState<RevenueTrendRow[]>([])
  const [stats, setStats] = useState<RoiStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemoMode) {
      const demo = generateDemoData()
      setTrend(demo.trend)
      setStats(demo.stats)
      setLoading(false)
      return
    }

    if (!organizationId) return

    const load = async () => {
      try {
        const supabase = createSupabaseBrowserClient()

        const [invoicesRes, callsRes] = await Promise.all([
          supabase
            .from('invoices')
            .select('amount, created_at')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: true }),
          supabase
            .from('calls')
            .select('id')
            .eq('organization_id', organizationId),
        ])

        const invoices = invoicesRes.data ?? []
        const calls = callsRes.data ?? []

        if (invoices.length === 0) {
          setLoading(false)
          return
        }

        const totalRevenue = invoices.reduce(
          (s: number, inv: any) => s + (Number(inv.amount) || 0),
          0
        )

        // Estimate cost as ~20% of revenue when no explicit cost data
        const totalCost = Math.round(totalRevenue * 0.2)
        const netValue = totalRevenue - totalCost
        const roiPercentage = totalCost > 0 ? Math.round((netValue / totalCost) * 100) : 0
        const revenuePerCall = calls.length > 0 ? Math.round(totalRevenue / calls.length) : 0

        // Build weekly revenue trend
        const weekBuckets: Record<string, number> = {}
        for (const inv of invoices) {
          if (!inv.created_at) continue
          const d = new Date(inv.created_at)
          const dayOfWeek = d.getDay() || 7
          const monday = new Date(d)
          monday.setDate(d.getDate() - dayOfWeek + 1)
          const key = monday.toISOString().slice(0, 10)
          weekBuckets[key] = (weekBuckets[key] || 0) + (Number(inv.amount) || 0)
        }

        const sorted = Object.entries(weekBuckets)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-12)

        const trendData: RevenueTrendRow[] = sorted.map(([, revenue], i) => ({
          label: `W${i + 1}`,
          revenue,
        }))

        setTrend(trendData)
        setStats({ roiPercentage, totalRevenue, totalCost, netValue, revenuePerCall })
      } catch {
        // Fail silently
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [organizationId, isDemoMode])

  if (loading) return <LoadingSkeleton />

  if (!stats) {
    return (
      <div className={cardClass}>
        <p className="text-center text-slate-500 py-12">
          No ROI data available yet.
        </p>
      </div>
    )
  }

  const roiColor =
    stats.roiPercentage >= 200
      ? '#2DD4BF'
      : stats.roiPercentage >= 100
        ? '#34d399'
        : stats.roiPercentage >= 0
          ? '#fbbf24'
          : '#f87171'

  return (
    <div className="space-y-6">
      {/* Big ROI hero */}
      <div className={cardClass}>
        <div className="text-center py-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
            Return on Investment
          </p>
          <p
            className="text-6xl font-extrabold"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              color: roiColor,
            }}
          >
            {stats.roiPercentage > 0 ? '+' : ''}
            {stats.roiPercentage}%
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Based on estimated service delivery cost
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={fmt(stats.totalRevenue)}
          color={COLORS.primary}
        />
        <StatCard
          icon={PiggyBank}
          label="Estimated Cost"
          value={fmt(stats.totalCost)}
          color={COLORS.accent}
        />
        <StatCard
          icon={TrendingUp}
          label="Net Value"
          value={fmt(stats.netValue)}
          color="#34d399"
        />
        <StatCard
          icon={PhoneCall}
          label="Revenue / Call"
          value={fmt(stats.revenuePerCall)}
          color={COLORS.secondary}
        />
      </div>

      {/* Revenue trend area chart */}
      <div className={cardClass}>
        <h3 className="text-sm font-medium text-slate-400 mb-4">
          Revenue Trend (Last 12 Weeks)
        </h3>
        {trend.length === 0 ? (
          <p className="text-center text-slate-500 py-12">
            Not enough data for a trend chart.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.08)"
              />
              <XAxis
                dataKey="label"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(value: number) => fmt(value)}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={COLORS.primary}
                fill="url(#roiGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
