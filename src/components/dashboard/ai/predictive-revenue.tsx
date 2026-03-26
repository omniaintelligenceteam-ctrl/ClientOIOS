'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Lead, Invoice } from '@/lib/types'

interface PredictiveRevenueProps {
  organizationId: string
}

interface Forecast {
  days: number
  amount: number
  label: string
}

const STAGE_PROBABILITY: Record<string, number> = {
  new: 0.1,
  contacted: 0.2,
  qualified: 0.4,
  proposal_sent: 0.7,
  won: 1.0,
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)
}

function calcForecast(leads: Lead[], days: number): number {
  const now = new Date()
  return leads
    .filter((l) => l.status !== 'won' && l.status !== 'lost' && l.status !== 'dormant')
    .reduce((sum, lead) => {
      const prob = STAGE_PROBABILITY[lead.status] ?? 0.1
      // Scale probability with time horizon
      const scalar = days === 30 ? 0.3 : days === 60 ? 0.6 : 1.0
      return sum + (lead.estimated_value ?? 0) * prob * scalar
    }, 0)
}

export function PredictiveRevenue({ organizationId }: PredictiveRevenueProps) {
  const [forecasts, setForecasts] = useState<Forecast[]>([])
  const [historicalRevenue, setHistoricalRevenue] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) return
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return

    async function load() {
      try {
        // Fetch pipeline leads
        const { data: leads } = await supabase
          .from('leads')
          .select('status, estimated_value, won_at, created_at')
          .eq('organization_id', organizationId)

        const allLeads = (leads ?? []) as Lead[]

        // Historical: won leads in last 90 days
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        const historicalWon = allLeads
          .filter((l) => l.status === 'won' && l.won_at && l.won_at >= ninetyDaysAgo)
          .reduce((sum, l) => sum + (l.estimated_value ?? 0), 0)
        setHistoricalRevenue(historicalWon)

        setForecasts([
          { days: 30, amount: calcForecast(allLeads, 30), label: '30-Day' },
          { days: 60, amount: calcForecast(allLeads, 60), label: '60-Day' },
          { days: 90, amount: calcForecast(allLeads, 90), label: '90-Day' },
        ])
      } catch {
        // noop
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [organizationId])

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[30, 60, 90].map((d) => (
          <div key={d} className="h-28 animate-pulse rounded-xl bg-[#1E293B]" />
        ))}
      </div>
    )
  }

  const historical30 = historicalRevenue / 3 // avg monthly

  return (
    <div className="grid grid-cols-3 gap-3">
      {forecasts.map(({ days, amount, label }) => {
        const diff = amount - historical30
        const pct = historical30 > 0 ? (diff / historical30) * 100 : 0
        const isUp = diff >= 0
        const isFlat = Math.abs(pct) < 2

        return (
          <div
            key={days}
            className="flex flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              {label} Forecast
            </span>
            <span className="text-2xl font-bold text-[#F8FAFC]">{formatCurrency(amount)}</span>
            <div className="flex items-center gap-1 text-xs">
              {isFlat ? (
                <Minus size={12} className="text-[#64748B]" />
              ) : isUp ? (
                <TrendingUp size={12} className="text-[#2DD4BF]" />
              ) : (
                <TrendingDown size={12} className="text-[#EF4444]" />
              )}
              <span className={isFlat ? 'text-[#64748B]' : isUp ? 'text-[#2DD4BF]' : 'text-[#EF4444]'}>
                {isFlat ? 'Stable' : `${isUp ? '+' : ''}${pct.toFixed(0)}% vs last period`}
              </span>
            </div>
            <p className="text-[10px] text-[#475569]">
              Weighted by stage probability
            </p>
          </div>
        )
      })}
    </div>
  )
}
