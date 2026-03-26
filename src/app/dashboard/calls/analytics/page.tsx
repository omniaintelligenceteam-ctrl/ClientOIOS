'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { BarChart3, ArrowLeft, Phone } from 'lucide-react'
import { SentimentTrendChart } from '@/components/dashboard/calls/sentiment-trend-chart'
import { TopIntents } from '@/components/dashboard/calls/top-intents'
import { AgentPerformance } from '@/components/dashboard/calls/agent-performance'
import { PeakHoursChart } from '@/components/dashboard/calls/peak-hours-chart'
import { MissedCallQueue } from '@/components/dashboard/calls/missed-call-queue'

type DateRange = 'today' | '7d' | '30d' | '90d' | 'all'

const dateRangeLabels: Record<DateRange, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
}

export default function CallAnalyticsPage() {
  const { profile } = useAuth()
  const organizationId = profile?.organization_id ?? ''
  const [dateRange, setDateRange] = useState<DateRange>('30d')

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Loading analytics...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/calls" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Call Log
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[#2DD4BF]" />
            Call Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-400">Deep insights into your call center performance</p>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['today', '7d', '30d', '90d', 'all'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                dateRange === range
                  ? 'bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/30'
                  : 'border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {dateRangeLabels[range]}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Sentiment Trend + Top Intents */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-300 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[#2DD4BF]" />
            Sentiment Trend (30 Days)
          </h2>
          <SentimentTrendChart organizationId={organizationId} />
        </div>

        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-300 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-f97316" />
            Top Call Intents (90 Days)
          </h2>
          <TopIntents organizationId={organizationId} />
        </div>
      </div>

      {/* Row 2: Agent Performance + Peak Hours */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-300 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-purple-500" />
            AI vs Human Performance (30 Days)
          </h2>
          <AgentPerformance organizationId={organizationId} />
        </div>

        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-300 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            Peak Call Hours (90 Days)
          </h2>
          <PeakHoursChart organizationId={organizationId} />
        </div>
      </div>

      {/* Row 3: Missed Call Queue (full width) */}
      <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Phone className="h-4 w-4 text-red-400" />
          Missed Call Queue (Last 7 Days)
        </h2>
        <MissedCallQueue organizationId={organizationId} />
      </div>
    </div>
  )
}
