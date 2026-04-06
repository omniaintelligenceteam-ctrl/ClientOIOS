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
  Legend,
} from 'recharts'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  PhoneCall,
  Users,
  CalendarCheck,
  DollarSign,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DailyRow {
  day: string
  calls: number
  leads: number
  revenue: number
}

interface Stats {
  totalCalls: number
  newLeads: number
  jobsBooked: number
  revenue: number
}

interface WeeklyPerformanceProps {
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

function generateDemoData(): { daily: DailyRow[]; stats: Stats } {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const daily: DailyRow[] = days.map((day) => ({
    day,
    calls: Math.floor(Math.random() * 30) + 10,
    leads: Math.floor(Math.random() * 12) + 3,
    revenue: Math.floor(Math.random() * 4000) + 800,
  }))

  return {
    daily,
    stats: {
      totalCalls: daily.reduce((s, d) => s + d.calls, 0),
      newLeads: daily.reduce((s, d) => s + d.leads, 0),
      jobsBooked: Math.floor(Math.random() * 18) + 5,
      revenue: daily.reduce((s, d) => s + d.revenue, 0),
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

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
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

export function WeeklyPerformance({
  organizationId,
  isDemoMode,
}: WeeklyPerformanceProps) {
  const [daily, setDaily] = useState<DailyRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
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
        const weekAgo = new Date(now.getTime() - 7 * 86_400_000)
        const isoStart = weekAgo.toISOString()

        const [callsRes, leadsRes, appointmentsRes, invoicesRes] =
          await Promise.all([
            supabase
              .from('calls')
              .select('id, created_at')
              .eq('organization_id', organizationId)
              .gte('created_at', isoStart),
            supabase
              .from('leads')
              .select('id, created_at')
              .eq('organization_id', organizationId)
              .gte('created_at', isoStart),
            supabase
              .from('appointments')
              .select('id')
              .eq('organization_id', organizationId)
              .gte('created_at', isoStart),
            supabase
              .from('invoices')
              .select('amount, created_at')
              .eq('organization_id', organizationId)
              .gte('created_at', isoStart),
          ])

        const calls = callsRes.data ?? []
        const leads = leadsRes.data ?? []
        const appointments = appointmentsRes.data ?? []
        const invoices = invoicesRes.data ?? []

        // Build daily buckets
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const buckets: Record<string, DailyRow> = {}
        for (let i = 0; i < 7; i++) {
          const d = new Date(weekAgo.getTime() + i * 86_400_000)
          const key = d.toISOString().slice(0, 10)
          buckets[key] = { day: dayNames[d.getDay()], calls: 0, leads: 0, revenue: 0 }
        }

        for (const c of calls) {
          const key = c.created_at?.slice(0, 10)
          if (key && buckets[key]) buckets[key].calls++
        }
        for (const l of leads) {
          const key = l.created_at?.slice(0, 10)
          if (key && buckets[key]) buckets[key].leads++
        }
        for (const inv of invoices) {
          const key = inv.created_at?.slice(0, 10)
          if (key && buckets[key]) buckets[key].revenue += Number(inv.amount) || 0
        }

        const dailyArr = Object.values(buckets)
        setDaily(dailyArr)
        setStats({
          totalCalls: calls.length,
          newLeads: leads.length,
          jobsBooked: appointments.length,
          revenue: invoices.reduce((s: number, inv: any) => s + (Number(inv.amount) || 0), 0),
        })
      } catch {
        // Fail silently -- empty state will show
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
          No performance data available for this period.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={PhoneCall}
          label="Total Calls"
          value={stats.totalCalls.toLocaleString()}
          color={COLORS.primary}
        />
        <StatCard
          icon={Users}
          label="New Leads"
          value={stats.newLeads.toLocaleString()}
          color={COLORS.secondary}
        />
        <StatCard
          icon={CalendarCheck}
          label="Jobs Booked"
          value={stats.jobsBooked.toLocaleString()}
          color={COLORS.accent}
        />
        <StatCard
          icon={DollarSign}
          label="Revenue"
          value={fmt(stats.revenue)}
          color={COLORS.primary}
        />
      </div>

      {/* Bar chart */}
      <div className={cardClass}>
        <h3 className="text-sm font-medium text-slate-400 mb-4">
          Daily Performance (Last 7 Days)
        </h3>
        {daily.length === 0 ? (
          <p className="text-center text-slate-500 py-12">No data to chart.</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={daily} barCategoryGap="20%">
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
              />
              <Tooltip {...tooltipStyle} />
              <Legend
                wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
              />
              <Bar
                dataKey="calls"
                name="Calls"
                fill={COLORS.primary}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="leads"
                name="Leads"
                fill={COLORS.secondary}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill={COLORS.accent}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
