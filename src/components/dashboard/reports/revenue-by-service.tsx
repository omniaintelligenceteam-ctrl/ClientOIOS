'use client'

import { useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ServiceRow {
  service: string
  revenue: number
  count: number
  percentage: number
}

interface RevenueByServiceProps {
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

const PIE_COLORS = [
  '#2DD4BF',
  '#818cf8',
  '#f97316',
  '#22d3ee',
  '#a78bfa',
  '#fb923c',
  '#34d399',
]

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

function generateDemoData(): ServiceRow[] {
  const services = [
    { service: 'HVAC Repair', revenue: 18400, count: 32 },
    { service: 'Plumbing', revenue: 14200, count: 28 },
    { service: 'Electrical', revenue: 11800, count: 22 },
    { service: 'Roofing', revenue: 9600, count: 14 },
    { service: 'General Maintenance', revenue: 6400, count: 19 },
  ]
  const total = services.reduce((s, r) => s + r.revenue, 0)
  return services.map((s) => ({
    ...s,
    percentage: Math.round((s.revenue / total) * 100),
  }))
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

/* ------------------------------------------------------------------ */
/*  Custom label for pie                                               */
/* ------------------------------------------------------------------ */

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percentage,
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percentage: number
}) {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  if (percentage < 8) return null

  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontFamily="JetBrains Mono, monospace"
    >
      {percentage}%
    </text>
  )
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardClass}>
          <div className="h-72 rounded-lg bg-white/[0.04]" />
        </div>
        <div className={cardClass}>
          <div className="h-72 rounded-lg bg-white/[0.04]" />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function RevenueByService({
  organizationId,
  isDemoMode,
}: RevenueByServiceProps) {
  const [data, setData] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemoMode) {
      setData(generateDemoData())
      setLoading(false)
      return
    }

    if (!organizationId) return

    const load = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: invoices } = await supabase
          .from('invoices')
          .select('service_type, amount')
          .eq('organization_id', organizationId)

        if (!invoices || invoices.length === 0) {
          setLoading(false)
          return
        }

        const grouped: Record<string, { revenue: number; count: number }> = {}
        for (const inv of invoices) {
          const svc = inv.service_type || 'Other'
          if (!grouped[svc]) grouped[svc] = { revenue: 0, count: 0 }
          grouped[svc].revenue += Number(inv.amount) || 0
          grouped[svc].count++
        }

        const total = Object.values(grouped).reduce((s, g) => s + g.revenue, 0)
        const rows: ServiceRow[] = Object.entries(grouped)
          .map(([service, g]) => ({
            service,
            revenue: g.revenue,
            count: g.count,
            percentage: total > 0 ? Math.round((g.revenue / total) * 100) : 0,
          }))
          .sort((a, b) => b.revenue - a.revenue)

        setData(rows)
      } catch {
        // Fail silently
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [organizationId, isDemoMode])

  if (loading) return <Skeleton />

  if (data.length === 0) {
    return (
      <div className={cardClass}>
        <p className="text-center text-slate-500 py-12">
          No revenue data by service available.
        </p>
      </div>
    )
  }

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pie chart */}
      <div className={cardClass}>
        <h3 className="text-sm font-medium text-slate-400 mb-4">
          Revenue by Service
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              dataKey="revenue"
              nameKey="service"
              label={({ cx, cy, midAngle, innerRadius, outerRadius, index }) =>
                renderCustomLabel({
                  cx,
                  cy,
                  midAngle,
                  innerRadius,
                  outerRadius,
                  percentage: data[index].percentage,
                })
              }
              labelLine={false}
              strokeWidth={0}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              {...tooltipStyle}
              formatter={(value: number) => fmt(value)}
            />
            <Legend
              wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
              formatter={(value: string) => (
                <span className="text-slate-300">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className={cardClass}>
        <h3 className="text-sm font-medium text-slate-400 mb-4">
          Service Breakdown
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-xs text-slate-500 pb-3 font-medium">
                  Service
                </th>
                <th className="text-right text-xs text-slate-500 pb-3 font-medium">
                  Revenue
                </th>
                <th className="text-right text-xs text-slate-500 pb-3 font-medium">
                  Count
                </th>
                <th className="text-right text-xs text-slate-500 pb-3 font-medium">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={row.service}
                  className="border-b border-white/[0.04] last:border-0"
                >
                  <td className="py-3 flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                      }}
                    />
                    <span className="text-slate-200">{row.service}</span>
                  </td>
                  <td
                    className="py-3 text-right text-slate-200"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {fmt(row.revenue)}
                  </td>
                  <td
                    className="py-3 text-right text-slate-400"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {row.count}
                  </td>
                  <td
                    className="py-3 text-right text-slate-400"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {row.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/[0.08]">
                <td className="pt-3 text-slate-300 font-medium">Total</td>
                <td
                  className="pt-3 text-right text-white font-bold"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {fmt(totalRevenue)}
                </td>
                <td
                  className="pt-3 text-right text-slate-300"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {data.reduce((s, d) => s + d.count, 0)}
                </td>
                <td className="pt-3 text-right text-slate-300">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
