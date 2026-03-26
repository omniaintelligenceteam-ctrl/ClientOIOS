'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Lead } from '@/lib/types'

interface FunnelStage {
  stage: string
  count: number
  totalValue: number
  rate: number
}

const STAGES = ['new', 'contacted', 'qualified', 'proposal_sent', 'won'] as const

const STAGE_COLORS = [
  '#2DD4BF', // teal
  '#34d399', // emerald
  '#60a5fa', // blue
  '#a78bfa', // violet
  '#f59e0b', // amber/won
]

function formatStageName(stage: string): string {
  return stage
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`
  return `$${value.toLocaleString()}`
}

interface PipelineFunnelProps {
  organizationId: string
}

export function PipelineFunnel({ organizationId }: PipelineFunnelProps) {
  const [stages, setStages] = useState<FunnelStage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) return
    const supabase = createSupabaseBrowserClient()

    supabase
      .from('leads')
      .select('status, estimated_value')
      .eq('organization_id', organizationId)
      .then(({ data }: { data: Lead[] | null }) => {
        if (!data) { setLoading(false); return }

        const stageData: Record<string, { count: number; totalValue: number }> = {}
        for (const s of STAGES) {
          stageData[s] = { count: 0, totalValue: 0 }
        }

        for (const lead of data) {
          if (lead.status in stageData) {
            stageData[lead.status].count++
            stageData[lead.status].totalValue += lead.estimated_value || 0
          }
        }

        const built: FunnelStage[] = STAGES.map((stage, idx) => {
          const { count, totalValue } = stageData[stage]
          const prevCount = idx === 0 ? count : stageData[STAGES[idx - 1]].count
          const rate = prevCount > 0 ? (count / prevCount) * 100 : 0
          return { stage, count, totalValue, rate }
        })

        setStages(built)
        setLoading(false)
      })
  }, [organizationId])

  if (loading) {
    return (
      <div className="space-y-3">
        {STAGES.map((s) => (
          <div key={s} className="animate-pulse space-y-1">
            <div className="h-3 bg-[rgba(148,163,184,0.08)] rounded w-1/3" />
            <div className="h-2 bg-[rgba(148,163,184,0.08)] rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  if (stages.length === 0 || stages.every((s) => s.count === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-slate-500">No pipeline data yet.</p>
        <p className="text-xs text-slate-600 mt-1">Leads will appear as they come in.</p>
      </div>
    )
  }

  const maxCount = stages[0]?.count || 1

  return (
    <div className="space-y-4">
      {stages.map((item, idx) => {
        const widthPct = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0
        const color = STAGE_COLORS[idx % STAGE_COLORS.length]

        return (
          <div key={item.stage} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">
                {formatStageName(item.stage)}
              </span>
              <div className="flex items-center gap-2 sm:gap-4 text-right">
                <span className="text-sm font-semibold text-slate-200 tabular-nums w-8 text-right">
                  {item.count.toLocaleString()}
                </span>
                <span className="hidden sm:block text-xs text-teal-400 tabular-nums w-20 text-right font-medium">
                  {item.totalValue > 0 ? formatCurrency(item.totalValue) : '—'}
                </span>
                {idx > 0 && (
                  <span className="text-xs text-slate-500 tabular-nums w-14 text-right">
                    {item.rate.toFixed(0)}%
                  </span>
                )}
                {idx === 0 && <span className="w-14" />}
              </div>
            </div>
            <div className="h-2.5 bg-[rgba(148,163,184,0.06)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${widthPct}%`, backgroundColor: color }}
              />
            </div>
            {idx < stages.length - 1 && (
              <div className="flex items-center gap-1 ml-2">
                <span className="text-[10px] text-slate-600">
                  {item.count > 0 ? `${((stages[idx + 1].count / item.count) * 100).toFixed(0)}%` : '—'} pass-through
                </span>
              </div>
            )}
          </div>
        )
      })}
      <div className="flex items-center gap-4 pt-2 border-t border-[rgba(148,163,184,0.06)]">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-teal-400" />Count
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-[rgba(45,212,191,0.3)]" />Est. Value
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="text-slate-600">%</span>Pass-through
        </div>
      </div>
    </div>
  )
}
