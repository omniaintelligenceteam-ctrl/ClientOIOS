'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart3, TrendingUp, Phone, DollarSign, Users } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import { RevenueTrend } from '@/components/dashboard/charts/revenue-trend'
import { LeadFunnel } from '@/components/dashboard/charts/lead-funnel'
import { CallHeatmap } from '@/components/dashboard/charts/call-heatmap'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const cardClass = 'bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6'

const PIE_COLORS = ['#2DD4BF', '#818cf8', '#f59e0b', '#f472b6', '#34d399', '#60a5fa']

const PERIOD_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoiData {
  roi_percentage: number
  total_revenue: number
  revenue_per_call: number
  net_value: number
  conversion_rate: number
  total_calls: number
  total_leads: number
  lead_funnel: { stage: string; count: number; rate: number }[]
  revenue_by_source: { source: string; revenue: number }[]
}

interface TrendPoint {
  metric_date: string
  revenue: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toLocaleString()}`
}

function buildHeatmap(rows: { started_at: string }[]): number[][] {
  // 7 days (Sun=0 … Sat=6) × 24 hours
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0))
  for (const row of rows) {
    const d = new Date(row.started_at)
    const day = d.getDay()
    const hour = d.getHours()
    grid[day][hour] = (grid[day][hour] || 0) + 1
  }
  return grid
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatPill({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  icon?: React.ElementType
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${accent ? 'text-[#2DD4BF]' : 'text-slate-200'}`}>
        {Icon && <Icon className="inline h-4 w-4 mr-1 mb-0.5 opacity-60" />}
        {value}
      </p>
    </div>
  )
}

function EmptyState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
      <BarChart3 className="h-8 w-8 text-slate-600" />
      <p className="text-sm text-slate-500 max-w-xs">
        {message ?? 'No data yet — metrics will appear as your business generates activity.'}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id || ''

  const [period, setPeriod] = useState(30)
  const [roi, setRoi] = useState<RoiData | null>(null)
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [heatmap, setHeatmap] = useState<number[][]>(
    Array.from({ length: 7 }, () => new Array(24).fill(0))
  )
  const [loading, setLoading] = useState(true)
  const [heatmapLoading, setHeatmapLoading] = useState(true)

  // Fetch ROI + trends together when period/org changes
  const loadAnalytics = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const [roiRes, trendRes] = await Promise.all([
        fetch(`/api/analytics/roi?period=${period}&orgId=${orgId}`),
        fetch(`/api/analytics/trends?period=${period}&grouping=daily&orgId=${orgId}`),
      ])
      if (roiRes.ok) setRoi(await roiRes.json())
      if (trendRes.ok) {
        const json = await trendRes.json()
        setTrends(Array.isArray(json) ? json : json.data ?? [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [orgId, period])

  // Fetch heatmap call data (always 30 days)
  const loadHeatmap = useCallback(async () => {
    if (!orgId) return
    setHeatmapLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await (supabase as any)
        .from('calls')
        .select('started_at')
        .eq('organization_id', orgId)
        .gte('started_at', thirtyDaysAgo)
      if (data) setHeatmap(buildHeatmap(data))
    } catch {
      // silently fail
    } finally {
      setHeatmapLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  useEffect(() => {
    loadHeatmap()
  }, [loadHeatmap])

  const hasRoi = roi && (roi.total_calls > 0 || roi.total_revenue > 0)
  const hasTrends = trends.length > 0
  const hasFunnel = roi?.lead_funnel && roi.lead_funnel.length > 0
  const hasRevBySource = roi?.revenue_by_source && roi.revenue_by_source.length > 0
  const hasHeatmapData = heatmap.some((row) => row.some((v) => v > 0))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Business Intelligence</h1>
        <p className="text-slate-400 mt-1">
          ROI, revenue trends, and call patterns for your business.
        </p>
      </div>

      {/* Hero ROI Card */}
      <div className={cardClass}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-slate-200">Return on Investment</h2>
          </div>
          {/* Period selector */}
          <div className="flex gap-1 bg-[rgba(148,163,184,0.06)] rounded-xl p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  period === opt.value
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-[rgba(148,163,184,0.06)] rounded-xl w-48" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-[rgba(148,163,184,0.06)] rounded-xl" />
              ))}
            </div>
          </div>
        ) : hasRoi ? (
          <>
            {/* Big ROI number */}
            <div className="mb-6">
              <p className="text-5xl font-extrabold text-[#2DD4BF] tabular-nums">
                {(roi.roi_percentage ?? 0) >= 0 ? '+' : ''}{(roi.roi_percentage ?? 0).toFixed(0)}%
              </p>
              <p className="text-sm text-slate-500 mt-1">ROI over last {period} days</p>
            </div>

            {/* Secondary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 border-t border-[rgba(148,163,184,0.08)]">
              <StatPill
                label="Total Revenue"
                value={formatCurrency(roi.total_revenue)}
                icon={DollarSign}
              />
              <StatPill
                label="Revenue Per Call"
                value={formatCurrency(roi.revenue_per_call)}
                icon={Phone}
              />
              <StatPill
                label="Net Value"
                value={formatCurrency(roi.net_value)}
                icon={TrendingUp}
              />
              <StatPill
                label="Conversion Rate"
                value={`${(roi.conversion_rate ?? 0).toFixed(1)}%`}
                icon={Users}
              />
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Revenue Trend + Lead Funnel */}
      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-6">
        {/* Revenue Trend */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-5">
            <DollarSign className="h-4 w-4 text-teal-400" />
            <h2 className="text-base font-semibold text-slate-200">Revenue Trend</h2>
          </div>
          {loading ? (
            <div className="animate-pulse h-52 bg-[rgba(148,163,184,0.04)] rounded-xl" />
          ) : hasTrends ? (
            <RevenueTrend data={trends} />
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Lead Funnel */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-5">
            <Users className="h-4 w-4 text-teal-400" />
            <h2 className="text-base font-semibold text-slate-200">Lead Funnel</h2>
          </div>
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 bg-[rgba(148,163,184,0.04)] rounded-xl" />
              ))}
            </div>
          ) : hasFunnel ? (
            <LeadFunnel data={roi.lead_funnel} />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      {/* Call Heatmap + Revenue by Source */}
      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-6">
        {/* Call Heatmap */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-5">
            <Phone className="h-4 w-4 text-teal-400" />
            <h2 className="text-base font-semibold text-slate-200">Call Activity Heatmap</h2>
            <span className="text-xs text-slate-500 ml-1">(last 30 days)</span>
          </div>
          {heatmapLoading ? (
            <div className="animate-pulse h-36 bg-[rgba(148,163,184,0.04)] rounded-xl" />
          ) : hasHeatmapData ? (
            <CallHeatmap data={heatmap} />
          ) : (
            <EmptyState />
          )}
        </div>

        {/* Revenue by Source */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="h-4 w-4 text-teal-400" />
            <h2 className="text-base font-semibold text-slate-200">Revenue by Source</h2>
          </div>
          {loading ? (
            <div className="animate-pulse h-52 bg-[rgba(148,163,184,0.04)] rounded-xl" />
          ) : hasRevBySource ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={roi.revenue_by_source}
                  dataKey="revenue"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  paddingAngle={3}
                >
                  {roi.revenue_by_source.map((_entry, idx) => (
                    <Cell
                      key={idx}
                      fill={PIE_COLORS[idx % PIE_COLORS.length]}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid rgba(148,163,184,0.1)',
                    borderRadius: '12px',
                  }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#94a3b8' }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => (
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  )
}
