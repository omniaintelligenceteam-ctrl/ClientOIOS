'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FunnelStage {
  name: string
  value: number
  color: string
}

interface ConversionRate {
  from: string
  to: string
  rate: number
}

interface LeadConversionProps {
  organizationId: string
  isDemoMode: boolean
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const cardClass =
  'backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6'

const STAGE_ORDER = ['new', 'contacted', 'qualified', 'proposal', 'won']
const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  won: 'Won',
}

const STAGE_COLORS = [
  '#2DD4BF',
  '#818cf8',
  '#22d3ee',
  '#f97316',
  '#34d399',
]

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

function generateDemoData(): FunnelStage[] {
  return [
    { name: 'New', value: 248, color: STAGE_COLORS[0] },
    { name: 'Contacted', value: 186, color: STAGE_COLORS[1] },
    { name: 'Qualified', value: 104, color: STAGE_COLORS[2] },
    { name: 'Proposal', value: 62, color: STAGE_COLORS[3] },
    { name: 'Won', value: 38, color: STAGE_COLORS[4] },
  ]
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getConversionRates(stages: FunnelStage[]): ConversionRate[] {
  const rates: ConversionRate[] = []
  for (let i = 0; i < stages.length - 1; i++) {
    const from = stages[i]
    const to = stages[i + 1]
    rates.push({
      from: from.name,
      to: to.name,
      rate: from.value > 0 ? Math.round((to.value / from.value) * 100) : 0,
    })
  }
  return rates
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className={cardClass}>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-white/[0.04]" />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LeadConversion({
  organizationId,
  isDemoMode,
}: LeadConversionProps) {
  const [stages, setStages] = useState<FunnelStage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemoMode) {
      setStages(generateDemoData())
      setLoading(false)
      return
    }

    if (!organizationId) return

    const load = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: leads } = await supabase
          .from('leads')
          .select('status')
          .eq('organization_id', organizationId)

        if (!leads || leads.length === 0) {
          setLoading(false)
          return
        }

        // Count leads per status
        const statusCounts: Record<string, number> = {}
        for (const lead of leads) {
          const s = (lead.status || 'new').toLowerCase()
          statusCounts[s] = (statusCounts[s] || 0) + 1
        }

        // Build cumulative funnel -- leads at later stages also passed earlier ones
        const cumulative: number[] = new Array(STAGE_ORDER.length).fill(0)
        for (let i = 0; i < STAGE_ORDER.length; i++) {
          for (let j = i; j < STAGE_ORDER.length; j++) {
            cumulative[i] += statusCounts[STAGE_ORDER[j]] || 0
          }
        }

        const funnelData: FunnelStage[] = STAGE_ORDER.map((key, i) => ({
          name: STAGE_LABELS[key],
          value: cumulative[i],
          color: STAGE_COLORS[i],
        }))

        setStages(funnelData)
      } catch {
        // Fail silently
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [organizationId, isDemoMode])

  if (loading) return <LoadingSkeleton />

  if (stages.length === 0) {
    return (
      <div className={cardClass}>
        <p className="text-center text-slate-500 py-12">
          No lead conversion data available.
        </p>
      </div>
    )
  }

  const maxValue = stages[0]?.value || 1
  const conversions = getConversionRates(stages)
  const overallRate =
    stages.length >= 2 && stages[0].value > 0
      ? Math.round((stages[stages.length - 1].value / stages[0].value) * 100)
      : 0

  return (
    <div className="space-y-6">
      {/* Funnel visualization */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-medium text-slate-400">
            Lead Conversion Funnel
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Overall conversion</span>
            <span
              className="text-sm font-bold text-emerald-400"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {overallRate}%
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {stages.map((stage, i) => {
            const widthPct = Math.max((stage.value / maxValue) * 100, 8)
            return (
              <div key={stage.name}>
                {/* Bar row */}
                <div className="flex items-center gap-4">
                  <div className="w-24 flex-shrink-0 text-right">
                    <span className="text-xs text-slate-400">{stage.name}</span>
                  </div>
                  <div className="flex-1 relative">
                    <div
                      className="h-10 rounded-lg flex items-center px-3 transition-all duration-500"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: `${stage.color}20`,
                        border: `1px solid ${stage.color}40`,
                      }}
                    >
                      <span
                        className="text-sm font-bold text-white"
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {stage.value.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Conversion rate connector */}
                {i < stages.length - 1 && conversions[i] && (
                  <div className="flex items-center gap-4 my-1">
                    <div className="w-24" />
                    <div className="flex items-center gap-2 pl-2">
                      <svg
                        className="h-4 w-4 text-slate-600"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M8 2v8m0 0l-3-3m3 3l3-3"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span
                        className="text-xs font-medium"
                        style={{
                          color:
                            conversions[i].rate >= 50
                              ? '#34d399'
                              : conversions[i].rate >= 30
                                ? '#fbbf24'
                                : '#f87171',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        {conversions[i].rate}%
                      </span>
                      <span className="text-[10px] text-slate-600">
                        {conversions[i].from} &rarr; {conversions[i].to}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Conversion rates summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {conversions.map((c) => (
          <div key={`${c.from}-${c.to}`} className={cardClass}>
            <p className="text-[10px] text-slate-500 mb-1">
              {c.from} &rarr; {c.to}
            </p>
            <p
              className="text-lg font-bold"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                color:
                  c.rate >= 50
                    ? '#34d399'
                    : c.rate >= 30
                      ? '#fbbf24'
                      : '#f87171',
              }}
            >
              {c.rate}%
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
