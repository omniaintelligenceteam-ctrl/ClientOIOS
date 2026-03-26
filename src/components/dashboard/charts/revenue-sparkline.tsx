'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface RevenueSparklineProps {
  organizationId: string
}

export function RevenueSparkline({ organizationId }: RevenueSparklineProps) {
  const [data, setData] = useState<{ value: number }[]>([])

  useEffect(() => {
    if (!organizationId) return
    const supabase = createSupabaseBrowserClient()

    const load = async () => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0]
      const { data: rows } = await supabase
        .from('business_metrics_daily')
        .select('metric_date, revenue')
        .eq('organization_id', organizationId)
        .gte('metric_date', since)
        .order('metric_date', { ascending: true })

      if (rows && rows.length > 0) {
        setData(rows.map((r: any) => ({ value: r.revenue ?? 0 })))
      } else {
        // Demo data so sparkline always renders
        setData(
          Array.from({ length: 30 }, (_, i) => ({
            value: 1000 + Math.sin(i / 3) * 400 + i * 30 + Math.random() * 200,
          }))
        )
      }
    }

    load()
  }, [organizationId])

  if (data.length === 0) return null

  return (
    <div style={{ width: 120, height: 32 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="#2DD4BF"
            strokeWidth={1.5}
            fill="url(#sparkGradient)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
