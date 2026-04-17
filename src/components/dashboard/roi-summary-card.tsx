'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, DollarSign, Clock, Gauge } from 'lucide-react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface RoiSummaryCardProps {
  organizationId: string
}

interface RoiNumbers {
  earned: number        // revenue this month
  saved: number         // hours saved × hourly cost
  roiMultiple: number   // ROI as a multiple (e.g. 4.2x)
  isDemo: boolean
}

const HOURLY_COST = 28 // $ per hour — assumed blended cost of CSR / dispatcher time
const OIOS_MONTHLY_COST = 2500 // $ — used to express ROI as a multiple. Placeholder; swap for real billing later.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `$${Math.round(n / 1000)}k`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${Math.round(n).toLocaleString()}`
}

function formatMultiple(n: number): string {
  if (!isFinite(n) || n <= 0) return '—'
  if (n >= 10) return `${Math.round(n)}×`
  return `${n.toFixed(1)}×`
}

// ---------------------------------------------------------------------------
// Big number block
// ---------------------------------------------------------------------------

interface BigNumberProps {
  icon: React.ElementType
  label: string
  value: string
  sublabel?: string
  accent: string
}

function BigNumber({ icon: Icon, label, value, sublabel, accent }: BigNumberProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-[rgba(148,163,184,0.04)] border border-[rgba(148,163,184,0.08)] px-5 py-5">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${accent}`} />
        <span className="text-[10px] uppercase tracking-widest text-[#64748B] font-semibold">{label}</span>
      </div>
      <span className={`text-[2.75rem] sm:text-[3rem] font-bold leading-none ${accent}`}>
        {value}
      </span>
      {sublabel && (
        <span className="text-xs text-[#94A3B8]">{sublabel}</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RoiSummaryCard({ organizationId }: RoiSummaryCardProps) {
  const [numbers, setNumbers] = useState<RoiNumbers | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) return
    let cancelled = false

    const load = async () => {
      const supabase = createSupabaseBrowserClient()
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0]

      try {
        if (!supabase) throw new Error('No supabase client')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('business_metrics_daily')
          .select('revenue, hours_saved, automation_count')
          .eq('organization_id', organizationId)
          .gte('metric_date', monthStart)
          .lt('metric_date', monthEnd)

        if (error || !data || data.length === 0) throw new Error('No metrics')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = data as any[]
        const earned = rows.reduce((s, r) => s + (Number(r.revenue) || 0), 0)
        const hoursSaved = rows.reduce((s, r) => s + (Number(r.hours_saved) || 0), 0)
        const saved = hoursSaved * HOURLY_COST
        const totalValue = earned + saved
        const roiMultiple = OIOS_MONTHLY_COST > 0 ? totalValue / OIOS_MONTHLY_COST : 0

        if (!cancelled) {
          setNumbers({ earned, saved, roiMultiple, isDemo: false })
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          // Demo values — representative for a mid-sized home services biz
          setNumbers({
            earned: 48_200,
            saved: 6_720, // ~240 hrs × $28
            roiMultiple: 22,
            isDemo: true,
          })
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [organizationId])

  if (loading || !numbers) {
    return (
      <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-40 bg-[rgba(148,163,184,0.08)] rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="h-28 bg-[rgba(148,163,184,0.06)] rounded-xl" />
            <div className="h-28 bg-[rgba(148,163,184,0.06)] rounded-xl" />
            <div className="h-28 bg-[rgba(148,163,184,0.06)] rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#2DD4BF]" />
          <h2 className="text-sm font-semibold text-[#F8FAFC] uppercase tracking-wider">
            This Month&apos;s Impact
          </h2>
          {numbers.isDemo && (
            <span className="text-[10px] uppercase tracking-wider text-[#64748B] bg-[rgba(148,163,184,0.08)] border border-[rgba(148,163,184,0.1)] px-2 py-0.5 rounded-full">
              demo
            </span>
          )}
        </div>
        <Link
          href="/dashboard/analytics"
          className="text-xs text-[#2DD4BF] hover:text-teal-300 transition-colors"
        >
          Full analytics →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <BigNumber
          icon={DollarSign}
          label="Earned"
          value={formatCurrency(numbers.earned)}
          sublabel="Revenue this month"
          accent="text-[#2DD4BF]"
        />
        <BigNumber
          icon={Clock}
          label="Saved"
          value={formatCurrency(numbers.saved)}
          sublabel={`${Math.round(numbers.saved / HOURLY_COST)} hrs of CSR time`}
          accent="text-[#f97316]"
        />
        <BigNumber
          icon={Gauge}
          label="ROI"
          value={formatMultiple(numbers.roiMultiple)}
          sublabel="Value vs spend"
          accent="text-[#2DD4BF]"
        />
      </div>
    </div>
  )
}
