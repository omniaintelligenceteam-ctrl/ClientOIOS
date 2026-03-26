// Phase Gamma: Pipeline Tactical Map
'use client'

import { useEffect, useState, useMemo } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface LeadDot {
  id: string
  name: string
  status: string
  score: number
  value: number
}

const STAGE_COLORS: Record<string, string> = {
  new: '#2DD4BF',
  contacted: '#34d399',
  qualified: '#60a5fa',
  proposal_sent: '#a78bfa',
  won: '#fbbf24',
  lost: '#64748b',
}

interface PipelineTacticalMapProps {
  organizationId: string
}

export function PipelineTacticalMap({ organizationId }: PipelineTacticalMapProps) {
  const [leads, setLeads] = useState<LeadDot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) return
    const supabase = createSupabaseBrowserClient()
    supabase
      .from('leads')
      .select('id, first_name, last_name, status, score, estimated_value')
      .eq('organization_id', organizationId)
      .then(({ data }: { data: any }) => {
        if (data) {
          setLeads(data.map((l: any) => ({
            id: l.id,
            name: `${l.first_name} ${l.last_name}`,
            status: l.status,
            score: l.score || 0,
            value: l.estimated_value || 0,
          })))
        }
        setLoading(false)
      })
  }, [organizationId])

  const maxValue = useMemo(() => Math.max(...leads.map(l => l.value), 1), [leads])

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-4 w-full" />)}
      </div>
    )
  }

  if (leads.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-8">No leads to display.</p>
  }

  return (
    <div className="relative w-full h-[280px] bg-[#0B1120] rounded-xl border border-[rgba(148,163,184,0.06)] overflow-hidden">
      {/* Y axis label */}
      <div className="absolute left-1 top-2 text-[9px] text-slate-600 rotate-0">Score</div>
      {/* X axis label */}
      <div className="absolute bottom-1 right-2 text-[9px] text-slate-600">Value →</div>

      {/* Grid lines */}
      {[20, 40, 60, 80].map(y => (
        <div key={y} className="absolute left-0 right-0 border-t border-slate-800/50" style={{ bottom: `${y}%` }}>
          <span className="text-[8px] text-slate-700 ml-1">{y}</span>
        </div>
      ))}

      {/* Lead dots */}
      {leads.map((lead) => {
        const x = maxValue > 0 ? (lead.value / maxValue) * 85 + 5 : 50
        const y = lead.score
        const color = STAGE_COLORS[lead.status] || '#64748b'
        const isHot = lead.score >= 80
        const isWon = lead.status === 'won'
        const isLost = lead.status === 'lost'

        return (
          <div
            key={lead.id}
            className="absolute group"
            style={{
              left: `${x}%`,
              bottom: `${y}%`,
              transform: 'translate(-50%, 50%)',
            }}
          >
            {/* Pulse ring for hot leads */}
            {isHot && !isLost && (
              <span
                className="absolute inset-0 w-4 h-4 -m-1 rounded-full animate-pulse-ring"
                style={{ backgroundColor: `${color}30` }}
              />
            )}
            <div
              className={`w-3 h-3 rounded-full transition-transform duration-200 hover:scale-150 cursor-pointer ${isWon ? 'ring-2 ring-yellow-400/50' : ''}`}
              style={{ backgroundColor: isLost ? '#4b5563' : color }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 whitespace-nowrap">
              <div className="panel px-2 py-1 text-[10px] shadow-xl">
                <p className="font-semibold text-white">{lead.name}</p>
                <p className="text-slate-400">Score: {lead.score} • ${lead.value.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )
      })}

      {/* Legend */}
      <div className="absolute top-2 right-2 flex flex-wrap gap-2">
        {Object.entries(STAGE_COLORS).map(([stage, color]) => (
          <div key={stage} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[8px] text-slate-500 capitalize">{stage.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
