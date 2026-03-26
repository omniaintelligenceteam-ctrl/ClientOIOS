'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { TrendingUp } from 'lucide-react'

interface RevenueTrendProps {
  data: { metric_date: string; revenue: number }[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toLocaleString()}`
}

export function RevenueTrend({ data }: RevenueTrendProps) {
  // Graceful empty state
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[220px] gap-3 text-center">
        <TrendingUp className="h-8 w-8 text-slate-700" />
        <p className="text-sm text-slate-500">No revenue data yet</p>
        <p className="text-xs text-slate-600">Revenue trend will appear once invoices are paid.</p>
      </div>
    )
  }

  const chartData = data.map((d) => ({
    date: formatDate(d.metric_date),
    revenue: d.revenue,
    rawDate: d.metric_date,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="#1e293b"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          stroke="#1e293b"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
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
          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#2DD4BF"
          strokeWidth={2}
          fill="url(#revenueGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#2DD4BF', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
