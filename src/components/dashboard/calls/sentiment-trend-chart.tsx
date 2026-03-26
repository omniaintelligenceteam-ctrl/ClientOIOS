'use client'

import { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Loader2 } from 'lucide-react'
import type { Call, Sentiment } from '@/lib/types'

interface SentimentTrendChartProps {
  organizationId: string
}

interface DailySentiment {
  date: string
  positive: number
  neutral: number
  negative: number
  urgent: number
}

const tooltipStyle = {
  backgroundColor: '#111827',
  border: '1px solid rgba(148,163,184,0.1)',
  borderRadius: '0.75rem',
  color: '#e2e8f0',
  fontSize: 12,
  padding: '8px 12px',
}

export function SentimentTrendChart({ organizationId }: SentimentTrendChartProps) {
  const [data, setData] = useState<DailySentiment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createSupabaseBrowserClient()
      const since = new Date()
      since.setDate(since.getDate() - 30)
      since.setHours(0, 0, 0, 0)

      const { data: calls } = await supabase
        .from('calls')
        .select('sentiment, started_at')
        .eq('organization_id', organizationId)
        .gte('started_at', since.toISOString())

      // Build 30-day map
      const map: Record<string, DailySentiment> = {}
      for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        map[key] = { date: key, positive: 0, neutral: 0, negative: 0, urgent: 0 }
      }

      ;(calls as unknown as Pick<Call, 'sentiment' | 'started_at'>[] | null)?.forEach((call) => {
        const key = call.started_at.split('T')[0]
        if (map[key]) {
          map[key][call.sentiment as Sentiment]++
        }
      })

      const result = Object.values(map).map((d) => ({
        ...d,
        date: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }))

      setData(result)
      setLoading(false)
    }

    fetchData()
  }, [organizationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-[#2DD4BF]" />
      </div>
    )
  }

  const hasData = data.some((d) => d.positive + d.neutral + d.negative + d.urgent > 0)

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">
        No call data in the last 30 days
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#64748b', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        <Line
          type="monotone"
          dataKey="positive"
          stroke="#34d399"
          strokeWidth={2}
          dot={false}
          name="Positive"
        />
        <Line
          type="monotone"
          dataKey="neutral"
          stroke="#94a3b8"
          strokeWidth={2}
          dot={false}
          name="Neutral"
        />
        <Line
          type="monotone"
          dataKey="negative"
          stroke="#f87171"
          strokeWidth={2}
          dot={false}
          name="Negative"
        />
        <Line
          type="monotone"
          dataKey="urgent"
          stroke="#fb923c"
          strokeWidth={2}
          dot={false}
          name="Urgent"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
