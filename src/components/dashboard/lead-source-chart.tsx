'use client'

import { useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { LeadSource } from '@/lib/types'

const SOURCE_LABELS: Record<string, string> = {
  phone_call: 'Phone Call',
  web_form: 'Web Form',
  referral: 'Referral',
  social_media: 'Social Media',
  walk_in: 'Walk In',
  marketing_campaign: 'Marketing Campaign',
  manual: 'Manual Entry',
}

const TEAL_COLORS = [
  '#2DD4BF',
  '#14B8A6',
  '#0D9488',
  '#0F766E',
  '#115E59',
  '#134E4A',
  '#042f2e',
]

interface SourceData {
  source: string
  label: string
  count: number
  percentage: number
}

interface LeadSourceChartProps {
  organizationId: string
}

export function LeadSourceChart({ organizationId }: LeadSourceChartProps) {
  const [data, setData] = useState<SourceData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) return
    const supabase = createSupabaseBrowserClient()

    supabase
      .from('leads')
      .select('source')
      .eq('organization_id', organizationId)
      .then(({ data: leads }: { data: { source: LeadSource }[] | null }) => {
        if (!leads) { setLoading(false); return }

        const counts: Record<string, number> = {}
        for (const lead of leads) {
          counts[lead.source] = (counts[lead.source] || 0) + 1
        }

        const total = leads.length
        const sourceData: SourceData[] = Object.entries(counts)
          .map(([source, count]) => ({
            source,
            label: SOURCE_LABELS[source] || source,
            count,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count)

        setData(sourceData)
        setLoading(false)
      })
  }, [organizationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="animate-pulse h-48 bg-[rgba(148,163,184,0.08)] rounded-xl mx-auto w-48" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
        <p className="text-sm text-slate-500">No lead source data yet.</p>
        <p className="text-xs text-slate-600 mt-1">Sources will appear as leads come in.</p>
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="w-full">
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={88}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((_, idx) => (
                <Cell
                  key={idx}
                  fill={TEAL_COLORS[idx % TEAL_COLORS.length]}
                  stroke="none"
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                border: '1px solid rgba(148,163,184,0.15)',
                borderRadius: '12px',
                fontSize: 12,
              }}
              labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
              itemStyle={{ color: '#94a3b8' }}
              formatter={(value: number, name: string) => [
                `${value} lead${value !== 1 ? 's' : ''} (${Math.round((value / total) * 100)}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ height: 200 }}>
          <span className="text-2xl font-bold text-slate-200">{total}</span>
          <span className="text-xs text-slate-500">Total Leads</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-2 mt-4 justify-center">
        {data.map((item, idx) => (
          <div key={item.source} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: TEAL_COLORS[idx % TEAL_COLORS.length] }}
            />
            <span className="text-xs text-slate-400">{item.label}</span>
            <span className="text-xs text-slate-500 tabular-nums">
              {item.count} ({item.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
