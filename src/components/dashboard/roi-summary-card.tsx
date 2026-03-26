'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface RoiSummaryCardProps {
  organizationId: string
}

interface RoiData {
  roi_percentage: number
  total_revenue: number
  total_calls: number
  total_leads: number
  conversion_rate: number
  revenue_per_call: number
}

const cardClass = 'bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-4 sm:p-6'

function Pill({
  label,
  value,
  trend,
}: {
  label: string
  value: string
  trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="flex items-center gap-1.5 bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.08)] rounded-lg px-3 py-1.5">
      {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-green-400 flex-shrink-0" />}
      {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-red-400 flex-shrink-0" />}
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-200">{value}</span>
    </div>
  )
}

export function RoiSummaryCard({ organizationId }: RoiSummaryCardProps) {
  const [data, setData] = useState<RoiData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) return
    const load = async () => {
      try {
        const res = await fetch(`/api/analytics/roi?period=30&orgId=${organizationId}`)
        if (!res.ok) throw new Error('Failed to fetch ROI')
        const json = await res.json()
        setData(json)
      } catch {
        // silently fail — empty state shown below
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [organizationId])

  if (loading) {
    return (
      <div className={cardClass}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-[rgba(148,163,184,0.08)] rounded w-1/3" />
          <div className="h-6 bg-[rgba(148,163,184,0.08)] rounded w-2/3" />
          <div className="flex gap-2">
            <div className="h-7 bg-[rgba(148,163,184,0.08)] rounded-lg w-24" />
            <div className="h-7 bg-[rgba(148,163,184,0.08)] rounded-lg w-28" />
            <div className="h-7 bg-[rgba(148,163,184,0.08)] rounded-lg w-28" />
          </div>
        </div>
      </div>
    )
  }

  const hasData =
    data &&
    (data.total_calls > 0 || data.total_leads > 0 || data.total_revenue > 0)

  if (!hasData) {
    return (
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-teal-400" />
          <h2 className="text-sm font-semibold text-slate-200">This Month&apos;s Impact</h2>
        </div>
        <p className="text-sm text-slate-500">
          Metrics will appear once calls start flowing.
        </p>
      </div>
    )
  }

  const revenueStr = data.total_revenue >= 1000
    ? `$${(data.total_revenue / 1000).toFixed(1)}k`
    : `$${data.total_revenue.toLocaleString()}`

  const revenuePerCallStr = data.revenue_per_call >= 1000
    ? `$${(data.revenue_per_call / 1000).toFixed(1)}k`
    : `$${Math.round(data.revenue_per_call).toLocaleString()}`

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-teal-400" />
          <h2 className="text-sm font-semibold text-slate-200">This Month&apos;s Impact</h2>
        </div>
        <Link
          href="/dashboard/analytics"
          className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
        >
          View full analytics →
        </Link>
      </div>

      <p className="text-sm text-slate-300 mb-3">
        OIOS handled{' '}
        <span className="text-slate-100 font-semibold">{data.total_calls.toLocaleString()} call{data.total_calls !== 1 ? 's' : ''}</span>
        , created{' '}
        <span className="text-slate-100 font-semibold">{data.total_leads.toLocaleString()} lead{data.total_leads !== 1 ? 's' : ''}</span>
        {data.total_revenue > 0 && (
          <> worth <span className="text-teal-400 font-semibold">{revenueStr}</span></>
        )}.
      </p>

      <div className="flex flex-wrap gap-2">
        <Pill
          label="ROI"
          value={`${data.roi_percentage.toFixed(0)}%`}
          trend={data.roi_percentage >= 0 ? 'up' : 'down'}
        />
        <Pill
          label="Conversion"
          value={`${data.conversion_rate.toFixed(1)}%`}
          trend={data.conversion_rate > 0 ? 'up' : 'neutral'}
        />
        <Pill
          label="Rev / Call"
          value={revenuePerCallStr}
          trend={data.revenue_per_call > 0 ? 'up' : 'neutral'}
        />
      </div>
    </div>
  )
}
