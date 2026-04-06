'use client'

import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { UserPlus, DollarSign, Heart } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SourceRow {
  source: string
  count: number
}

interface AcquisitionStats {
  newCustomers: number
  avgCAC: number
  estimatedLTV: number
}

interface CustomerAcquisitionProps {
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

function generateDemoData(): { sources: SourceRow[]; stats: AcquisitionStats } {
  return {
    sources: [
      { source: 'Google Ads', count: 34 },
      { source: 'Referral', count: 28 },
      { source: 'Organic Search', count: 22 },
      { source: 'Social Media', count: 16 },
      { source: 'Direct/Walk-in', count: 11 },
      { source: 'Phone Book', count: 5 },
    ],
    stats: {
      newCustomers: 116,
      avgCAC: 47,
      estimatedLTV: 2340,
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
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
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
          {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
        </div>
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
            <div className="h-16 rounded-lg bg-white/[0.04]" />
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

export function CustomerAcquisition({
  organizationId,
  isDemoMode,
}: CustomerAcquisitionProps) {
  const [sources, setSources] = useState<SourceRow[]>([])
  const [stats, setStats] = useState<AcquisitionStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemoMode) {
      const demo = generateDemoData()
      setSources(demo.sources)
      setStats(demo.stats)
      setLoading(false)
      return
    }

    if (!organizationId) return

    const load = async () => {
      try {
        const supabase = createSupabaseBrowserClient()

        const [customersRes, leadsRes, invoicesRes] = await Promise.all([
          supabase
            .from('customers')
            .select('id, created_at')
            .eq('organization_id', organizationId),
          supabase
            .from('leads')
            .select('id, source, status')
            .eq('organization_id', organizationId),
          supabase
            .from('invoices')
            .select('amount')
            .eq('organization_id', organizationId),
        ])

        const customers = customersRes.data ?? []
        const leads = leadsRes.data ?? []
        const invoices = invoicesRes.data ?? []

        // New customers this month
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const newCustomers = customers.filter(
          (c: any) => c.created_at && c.created_at >= monthStart
        ).length

        // Revenue totals for LTV estimate
        const totalRevenue = invoices.reduce((s: number, inv: any) => s + (Number(inv.amount) || 0), 0)
        const customerCount = customers.length || 1
        const estimatedLTV = Math.round(totalRevenue / customerCount)

        // Rough CAC: assume marketing spend is ~30% of revenue (heuristic when no cost data)
        const avgCAC =
          newCustomers > 0
            ? Math.round((totalRevenue * 0.15) / customerCount)
            : 0

        // Group leads by source
        const sourceCounts: Record<string, number> = {}
        for (const lead of leads) {
          const src = lead.source || 'Unknown'
          sourceCounts[src] = (sourceCounts[src] || 0) + 1
        }

        const sourceRows: SourceRow[] = Object.entries(sourceCounts)
          .map(([source, count]) => ({ source: formatSource(source), count }))
          .sort((a, b) => b.count - a.count)

        setSources(sourceRows)
        setStats({ newCustomers, avgCAC, estimatedLTV })
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
          No customer acquisition data available.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={UserPlus}
          label="New Customers"
          value={stats.newCustomers.toLocaleString()}
          sub="this month"
          color={COLORS.primary}
        />
        <StatCard
          icon={DollarSign}
          label="Avg CAC"
          value={fmt(stats.avgCAC)}
          sub="estimated"
          color={COLORS.accent}
        />
        <StatCard
          icon={Heart}
          label="LTV Estimate"
          value={fmt(stats.estimatedLTV)}
          sub="per customer"
          color={COLORS.secondary}
        />
      </div>

      {/* Bar chart by source */}
      <div className={cardClass}>
        <h3 className="text-sm font-medium text-slate-400 mb-4">
          New Customers by Lead Source
        </h3>
        {sources.length === 0 ? (
          <p className="text-center text-slate-500 py-12">No source data.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={sources}
              layout="vertical"
              margin={{ left: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.08)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="source"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={120}
              />
              <Tooltip {...tooltipStyle} />
              <Bar
                dataKey="count"
                name="Customers"
                fill={COLORS.primary}
                radius={[0, 6, 6, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Utility                                                            */
/* ------------------------------------------------------------------ */

function formatSource(raw: string): string {
  const map: Record<string, string> = {
    phone_call: 'Phone Call',
    web_form: 'Web Form',
    referral: 'Referral',
    social_media: 'Social Media',
    walk_in: 'Walk-in',
    marketing_campaign: 'Marketing Campaign',
    google_ads: 'Google Ads',
    organic: 'Organic Search',
    manual: 'Manual Entry',
  }
  return map[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
