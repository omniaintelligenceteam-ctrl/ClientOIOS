'use client'

import { useState, useEffect, useMemo } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import { LeadDetailDrawer } from '@/components/dashboard/lead-detail-drawer'
import type { Lead, LeadStatus } from '@/lib/types'
import { GitFork, DollarSign, TrendingUp, Filter, Loader2 } from 'lucide-react'

const PIPELINE_STAGES: { status: LeadStatus; label: string; borderColor: string; textColor: string; countColor: string }[] = [
  { status: 'new',           label: 'New',           borderColor: 'border-t-blue-400',   textColor: 'text-blue-400',   countColor: 'bg-blue-500/15' },
  { status: 'contacted',     label: 'Contacted',     borderColor: 'border-t-amber-400',  textColor: 'text-amber-400',  countColor: 'bg-amber-500/15' },
  { status: 'qualified',     label: 'Qualified',     borderColor: 'border-t-teal-400',   textColor: 'text-teal-400',   countColor: 'bg-teal-500/15' },
  { status: 'proposal_sent', label: 'Proposal Sent', borderColor: 'border-t-purple-400', textColor: 'text-purple-400', countColor: 'bg-purple-500/15' },
  { status: 'won',           label: 'Won',           borderColor: 'border-t-green-400',  textColor: 'text-green-400',  countColor: 'bg-green-500/15' },
  { status: 'lost',          label: 'Lost',          borderColor: 'border-t-red-400',    textColor: 'text-red-400',    countColor: 'bg-red-500/15' },
]

const PRIORITY_COLORS: Record<string, string> = {
  hot:  'bg-red-500/15 text-red-400',
  warm: 'bg-amber-500/15 text-amber-400',
  cold: 'bg-blue-500/15 text-blue-400',
}

const SOURCE_EMOJI: Record<string, string> = {
  phone_call: '📞', web_form: '🌐', referral: '👥',
  social_media: '📱', walk_in: '🚶', marketing_campaign: '📣', manual: '✏️',
}

function fmt(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v}`
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function PipelineCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const days = daysSince(lead.updated_at)
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#0B1120] hover:bg-[rgba(45,212,191,0.04)] border border-[rgba(148,163,184,0.08)] hover:border-[rgba(45,212,191,0.25)] rounded-xl p-3 transition-all space-y-2 min-h-[44px]"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-100 leading-tight">{lead.first_name} {lead.last_name}</p>
        <span className="text-base leading-none flex-shrink-0">{SOURCE_EMOJI[lead.source] || '📋'}</span>
      </div>
      <p className="text-xs text-slate-500 truncate">{lead.service_needed}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-green-400">{fmt(lead.estimated_value)}</span>
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_COLORS[lead.priority] || 'bg-slate-500/15 text-slate-400'}`}>
          {lead.priority.toUpperCase()}
        </span>
      </div>
      {days > 7 && <p className="text-[10px] text-amber-400">⚠️ {days}d in stage</p>}
    </button>
  )
}

function PipelineColumn({ stage, leads, onLeadClick }: {
  stage: typeof PIPELINE_STAGES[0]; leads: Lead[]; onLeadClick: (l: Lead) => void
}) {
  const totalValue = leads.reduce((s, l) => s + (l.estimated_value || 0), 0)
  return (
    <div className="flex flex-col min-w-[240px] max-w-[280px] flex-1">
      <div className={`rounded-t-xl border border-b-0 border-[rgba(148,163,184,0.1)] border-t-4 ${stage.borderColor} bg-white/[0.03] px-3 py-3`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold uppercase tracking-wider ${stage.textColor}`}>{stage.label}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${stage.countColor} ${stage.textColor}`}>{leads.length}</span>
        </div>
        {totalValue > 0 && <p className="text-xs text-slate-500 mt-1">{fmt(totalValue)}</p>}
      </div>
      <div className="flex-1 overflow-y-auto rounded-b-xl border border-t-0 border-[rgba(148,163,184,0.1)] bg-white/[0.02] p-2 space-y-2 min-h-[200px]">
        {leads.length === 0 ? (
          <p className="text-xs text-slate-600 py-4 text-center">No leads</p>
        ) : (
          leads.map((lead) => <PipelineCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />)
        )}
      </div>
    </div>
  )
}

function StatsBar({ leads }: { leads: Lead[] }) {
  const active = leads.filter((l) => !['won', 'lost'].includes(l.status))
  const now = new Date()
  const wonMonth = leads.filter((l) => {
    if (l.status !== 'won' || !l.won_at) return false
    const d = new Date(l.won_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const pipeVal = active.reduce((s, l) => s + (l.estimated_value || 0), 0)
  const wonVal = wonMonth.reduce((s, l) => s + (l.estimated_value || 0), 0)
  const wonCount = leads.filter((l) => l.status === 'won').length
  const convRate = leads.length > 0 ? Math.round((wonCount / leads.length) * 100) : 0
  const stats = [
    { label: 'Pipeline Value', value: fmt(pipeVal), Icon: DollarSign, color: 'text-teal-400' },
    { label: 'Won This Month', value: fmt(wonVal), Icon: TrendingUp, color: 'text-green-400' },
    { label: 'Active Leads', value: String(active.length), Icon: GitFork, color: 'text-blue-400' },
    { label: 'Conversion Rate', value: `${convRate}%`, Icon: TrendingUp, color: 'text-amber-400' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(({ label, value, Icon, color }) => (
        <div key={label} className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500">{label}</p>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  )
}

export default function PipelinePage() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id || ''
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const load = async () => {
    if (!orgId) return
    setLoading(true)
    const { data } = await createSupabaseBrowserClient().from('leads').select('*').eq('organization_id', orgId).order('updated_at', { ascending: false })
    setLeads((data as Lead[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [orgId])

  const filtered = useMemo(() => leads.filter((l) => {
    if (sourceFilter !== 'all' && l.source !== sourceFilter) return false
    if (priorityFilter !== 'all' && l.priority !== priorityFilter) return false
    return true
  }), [leads, sourceFilter, priorityFilter])

  const byStage = useMemo(() => {
    const map: Record<string, Lead[]> = {}
    PIPELINE_STAGES.forEach((s) => { map[s.status] = [] })
    filtered.forEach((l) => { if (map[l.status]) map[l.status].push(l) })
    return map
  }, [filtered])

  const sel = 'rounded-lg border border-[rgba(148,163,184,0.12)] bg-[#0B1120] px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-500/40'

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-sm text-slate-400">Full kanban view — click any card for details</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-slate-500" />
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className={sel}>
            <option value="all">All Sources</option>
            <option value="phone_call">Phone Call</option>
            <option value="web_form">Web Form</option>
            <option value="referral">Referral</option>
            <option value="social_media">Social Media</option>
            <option value="marketing_campaign">Campaign</option>
            <option value="manual">Manual</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={sel}>
            <option value="all">All Priorities</option>
            <option value="hot">🔥 Hot</option>
            <option value="warm">⚡ Warm</option>
            <option value="cold">❄️ Cold</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="h-5 w-5 rounded-full border-2 border-teal-400/30 border-t-teal-400 animate-spin"></div></div>
      ) : (
        <>
          <StatsBar leads={filtered} />
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
            {PIPELINE_STAGES.map((stage) => (
              <PipelineColumn key={stage.status} stage={stage} leads={byStage[stage.status] || []} onLeadClick={setActiveLead} />
            ))}
          </div>
        </>
      )}

      {activeLead && <LeadDetailDrawer lead={activeLead} customer={null} onClose={() => setActiveLead(null)} />}
    </div>
  )
}
