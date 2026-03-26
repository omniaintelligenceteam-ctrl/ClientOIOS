'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { ComparisonToggle, ComparisonPeriod } from '@/components/ui/comparison-toggle'

interface ForecastPoint {
  date: string
  actual: number | null
  forecast: number | null
  upper: number | null
  lower: number | null
  comparison: number | null
}

interface RevenueForecastProps {
  organizationId: string
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toLocaleString()}`
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function dateKey(d: Date): string {
  return d.toISOString().split('T')[0]
}

function formatLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function RevenueForecast({ organizationId }: RevenueForecastProps) {
  const [data, setData] = useState<ForecastPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [comparison, setComparison] = useState<ComparisonPeriod>('off')

  useEffect(() => {
    if (!organizationId) return
    const supabase = createSupabaseBrowserClient()

    const load = async () => {
      const now = new Date()
      const historyStart = addDays(now, -60)
      const forecastEnd = addDays(now, 90)

      // Historical paid invoices (last 60 days)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('paid_at, total_amount')
        .eq('organization_id', organizationId)
        .eq('status', 'paid')
        .gte('paid_at', historyStart.toISOString())
        .lte('paid_at', now.toISOString())

      // Open pipeline
      const { data: openLeads } = await supabase
        .from('leads')
        .select('estimated_value, status')
        .eq('organization_id', organizationId)
        .in('status', ['new', 'contacted', 'qualified', 'proposal_sent'])

      // Build daily actuals map
      const dailyActuals: Record<string, number> = {}
      for (const inv of invoices ?? []) {
        if (!inv.paid_at) continue
        const key = inv.paid_at.split('T')[0]
        dailyActuals[key] = (dailyActuals[key] ?? 0) + (inv.total_amount ?? 0)
      }

      // Compute trailing 30-day average for projection
      const recentDays = 30
      let recentRevenue = 0
      for (let i = 0; i < recentDays; i++) {
        const key = dateKey(addDays(now, -i))
        recentRevenue += dailyActuals[key] ?? 0
      }
      const dailyAvg = recentRevenue / recentDays

      // Pipeline upside: total pipeline * estimated 20% close rate spread over 90 days
      const totalPipeline = (openLeads ?? []).reduce((s, l) => s + (l.estimated_value ?? 0), 0)
      const pipelineDailyContrib = (totalPipeline * 0.2) / 90

      const projectedDaily = dailyAvg + pipelineDailyContrib
      const confidence = 0.25 // ±25%

      // Build full series: actuals for past 60 days, forecast for next 90 days
      const points: ForecastPoint[] = []

      for (let i = -60; i <= 90; i++) {
        const d = addDays(now, i)
        const key = dateKey(d)
        const isPast = i <= 0
        const actual = isPast ? (dailyActuals[key] ?? 0) : null
        const forecast = !isPast ? projectedDaily : null
        const upper = !isPast ? projectedDaily * (1 + confidence) : null
        const lower = !isPast ? projectedDaily * (1 - confidence) : null

        // Comparison data (shifted by offset)
        let comp: number | null = null
        if (comparison !== 'off') {
          const offsetDays = comparison === 'last_week' ? 7 : 30
          const compKey = dateKey(addDays(d, -offsetDays))
          comp = dailyActuals[compKey] ?? 0
        }

        points.push({ date: formatLabel(key), actual, forecast, upper, lower, comparison: comp })
      }

      setData(points)
      setLoading(false)
    }

    load()
  }, [organizationId, comparison])

  if (loading) {
    return <div className="h-[260px] bg-slate-800/30 rounded-xl animate-pulse" />
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[260px] gap-3">
        <TrendingUp className="h-8 w-8 text-slate-700" />
        <p className="text-sm text-slate-500">No forecast data yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-block w-6 h-0.5 bg-teal-400" /> Actual
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="inline-block w-6 border-t-2 border-dashed border-teal-400/50" /> Forecast
          </div>
          {comparison !== 'off' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-block w-6 border-t-2 border-dashed border-orange-400/60" />{' '}
              {comparison === 'last_week' ? 'Last Week' : 'Last Month'}
            </div>
          )}
        </div>
        <ComparisonToggle value={comparison} onChange={setComparison} />
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#1e293b"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={14}
          />
          <YAxis
            stroke="#1e293b"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCurrency}
            width={52}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#111827',
              border: '1px solid rgba(148,163,184,0.1)',
              borderRadius: '12px',
            }}
            labelStyle={{ color: '#e2e8f0' }}
            itemStyle={{ color: '#94a3b8' }}
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === 'upper' || name === 'lower' ? null : name,
            ]}
          />
          {/* Confidence band */}
          <Area
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill="url(#forecastBand)"
            legendType="none"
            name="upper"
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke="none"
            fill="#0B1120"
            legendType="none"
            name="lower"
          />
          {/* Actual line */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#2DD4BF"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#2DD4BF', strokeWidth: 0 }}
            name="Actual"
            connectNulls={false}
          />
          {/* Forecast dashed line */}
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#2DD4BF"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 4, fill: '#2DD4BF', strokeWidth: 0 }}
            name="Forecast"
            connectNulls={false}
          />
          {/* Comparison line */}
          {comparison !== 'off' && (
            <Line
              type="monotone"
              dataKey="comparison"
              stroke="#f97316"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 3, fill: '#f97316', strokeWidth: 0 }}
              name={comparison === 'last_week' ? 'Last Week' : 'Last Month'}
              connectNulls={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
