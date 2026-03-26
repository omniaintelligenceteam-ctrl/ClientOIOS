'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Loader2, Bot, UserRound } from 'lucide-react'
import type { Call } from '@/lib/types'

interface AgentPerformanceProps {
  organizationId: string
}

interface GroupStats {
  total: number
  avgDuration: number
  escalatedPct: number
  positive: number
  neutral: number
  negative: number
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  )
}

function SentimentBar({ positive, neutral, negative }: { positive: number; neutral: number; negative: number }) {
  const total = positive + neutral + negative
  if (total === 0) return <div className="h-2 rounded-full bg-slate-800" />
  const pPct = (positive / total) * 100
  const nPct = (neutral / total) * 100
  const negPct = (negative / total) * 100
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full">
      <div className="bg-emerald-500" style={{ width: `${pPct}%` }} />
      <div className="bg-slate-500" style={{ width: `${nPct}%` }} />
      <div className="bg-red-500" style={{ width: `${negPct}%` }} />
    </div>
  )
}

export function AgentPerformance({ organizationId }: AgentPerformanceProps) {
  const [aiStats, setAiStats] = useState<GroupStats | null>(null)
  const [humanStats, setHumanStats] = useState<GroupStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createSupabaseBrowserClient()
      const since = new Date()
      since.setDate(since.getDate() - 30)

      const { data: calls } = await supabase
        .from('calls')
        .select('ai_agent_handled, duration_seconds, escalated_to_human, sentiment')
        .eq('organization_id', organizationId)
        .gte('started_at', since.toISOString())

      const typed = (calls as unknown as Pick<Call, 'ai_agent_handled' | 'duration_seconds' | 'escalated_to_human' | 'sentiment'>[] | null) ?? []

      const compute = (group: typeof typed): GroupStats => {
        if (group.length === 0) return { total: 0, avgDuration: 0, escalatedPct: 0, positive: 0, neutral: 0, negative: 0 }
        const totalDur = group.reduce((s, c) => s + c.duration_seconds, 0)
        const escalated = group.filter((c) => c.escalated_to_human).length
        return {
          total: group.length,
          avgDuration: Math.round(totalDur / group.length),
          escalatedPct: Math.round((escalated / group.length) * 100),
          positive: group.filter((c) => c.sentiment === 'positive').length,
          neutral: group.filter((c) => c.sentiment === 'neutral').length,
          negative: group.filter((c) => ['negative', 'urgent'].includes(c.sentiment)).length,
        }
      }

      setAiStats(compute(typed.filter((c) => c.ai_agent_handled)))
      setHumanStats(compute(typed.filter((c) => !c.ai_agent_handled)))
      setLoading(false)
    }

    fetchData()
  }, [organizationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-[#2DD4BF]" />
      </div>
    )
  }

  const cards = [
    { label: 'AI Agents', Icon: Bot, stats: aiStats, accentColor: 'text-[#2DD4BF]', borderColor: 'border-[#2DD4BF]/20' },
    { label: 'Human Agents', Icon: UserRound, stats: humanStats, accentColor: 'text-f97316', borderColor: 'border-orange-500/20' },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {cards.map(({ label, Icon, stats, accentColor, borderColor }) => (
        <div key={label} className={`rounded-xl border ${borderColor} bg-slate-900/50 p-4`}>
          <div className={`mb-3 flex items-center gap-2 ${accentColor}`}>
            <Icon className="h-4 w-4" />
            <span className="text-sm font-semibold">{label}</span>
          </div>
          {stats && stats.total > 0 ? (
            <div className="divide-y divide-slate-800">
              <StatRow label="Total Calls" value={stats.total.toString()} />
              <StatRow label="Avg Duration" value={formatDuration(stats.avgDuration)} />
              <StatRow label="Escalation Rate" value={`${stats.escalatedPct}%`} />
              <div className="pt-2">
                <p className="mb-1.5 text-xs text-slate-400">Sentiment</p>
                <SentimentBar positive={stats.positive} neutral={stats.neutral} negative={stats.negative} />
                <div className="mt-1 flex gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />{stats.positive}+</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-slate-500" />{stats.neutral}~</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" />{stats.negative}−</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No calls in last 30 days</p>
          )}
        </div>
      ))}
    </div>
  )
}
