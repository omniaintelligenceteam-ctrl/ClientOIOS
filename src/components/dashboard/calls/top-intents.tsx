'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Loader2, Tag } from 'lucide-react'
import type { Call } from '@/lib/types'

interface TopIntentsProps {
  organizationId: string
}

interface IntentCount {
  intent: string
  count: number
}

export function TopIntents({ organizationId }: TopIntentsProps) {
  const [intents, setIntents] = useState<IntentCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchIntents = async () => {
      const supabase = createSupabaseBrowserClient()
      const since = new Date()
      since.setDate(since.getDate() - 90)

      const { data: calls } = await supabase
        .from('calls')
        .select('intent')
        .eq('organization_id', organizationId)
        .not('intent', 'is', null)
        .gte('started_at', since.toISOString())

      const counts: Record<string, number> = {}
      ;(calls as unknown as Pick<Call, 'intent'>[] | null)?.forEach((call) => {
        if (call.intent) {
          counts[call.intent] = (counts[call.intent] ?? 0) + 1
        }
      })

      const sorted = Object.entries(counts)
        .map(([intent, count]) => ({ intent, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      setIntents(sorted)
      setLoading(false)
    }

    fetchIntents()
  }, [organizationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-[#2DD4BF]" />
      </div>
    )
  }

  if (intents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-500 text-sm">
        <Tag className="h-6 w-6 opacity-50" />
        <span>No intent data yet</span>
      </div>
    )
  }

  const maxCount = intents[0]?.count ?? 1

  return (
    <div className="space-y-2">
      {intents.map(({ intent, count }) => {
        const weight = count / maxCount
        const fontSize = 12 + weight * 10
        return (
          <div key={intent} className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-slate-300 transition-colors hover:border-[#2DD4BF]/40"
              style={{ fontSize: Math.round(fontSize) }}
            >
              <Tag className="h-3 w-3 flex-shrink-0" style={{ opacity: 0.6 }} />
              <span className="truncate max-w-[160px]">{intent}</span>
            </div>
            <span className="text-xs font-medium text-slate-500 flex-shrink-0 w-8 text-right">
              {count}
            </span>
            {/* Bar */}
            <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#2DD4BF] transition-all"
                style={{ width: `${weight * 100}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
