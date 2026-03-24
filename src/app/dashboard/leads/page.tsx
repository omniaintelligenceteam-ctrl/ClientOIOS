'use client'

import { useState, useMemo } from 'react'
import {
  Phone,
  Globe,
  Users,
  Share2,
  Megaphone,
  UserPlus,
  PenTool,
  LayoutGrid,
  List,
  TrendingUp,
  Flame,
  BarChart3,
  Target,
} from 'lucide-react'
import { demoLeads } from '@/lib/demo-data'
import type { Lead, LeadSource, LeadStatus } from '@/lib/types'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ASSIGNED_NAMES: Record<string, string> = {
  'user-mike': 'Mike R.',
  'user-jake': 'Jake T.',
  'user-carlos': 'Carlos M.',
}

interface PipelineColumn {
  status: LeadStatus
  label: string
  color: string          // tailwind border color
  bgColor: string        // header bg accent
  textColor: string      // header text
  dotColor: string       // count badge bg
}

const COLUMNS: PipelineColumn[] = [
  {
    status: 'new',
    label: 'New',
    color: 'border-t-blue-400',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    dotColor: 'bg-blue-400',
  },
  {
    status: 'contacted',
    label: 'Contacted',
    color: 'border-t-yellow-400',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-400',
    dotColor: 'bg-yellow-400',
  },
  {
    status: 'qualified',
    label: 'Qualified',
    color: 'border-t-teal-400',
    bgColor: 'bg-teal-500/10',
    textColor: 'text-teal-400',
    dotColor: 'bg-teal-400',
  },
  {
    status: 'proposal_sent',
    label: 'Proposal Sent',
    color: 'border-t-purple-400',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    dotColor: 'bg-purple-400',
  },
  {
    status: 'won',
    label: 'Won',
    color: 'border-t-emerald-400',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
  },
  {
    status: 'lost',
    label: 'Lost',
    color: 'border-t-red-400',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    dotColor: 'bg-red-400',
  },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getSourceIcon(source: LeadSource) {
  switch (source) {
    case 'phone_call':
      return Phone
    case 'web_form':
      return Globe
    case 'referral':
      return Users
    case 'social_media':
      return Share2
    case 'marketing_campaign':
      return Megaphone
    case 'walk_in':
      return UserPlus
    case 'manual':
      return PenTool
    default:
      return Phone
  }
}

function getSourceLabel(source: LeadSource): string {
  switch (source) {
    case 'phone_call':
      return 'Phone'
    case 'web_form':
      return 'Web'
    case 'referral':
      return 'Referral'
    case 'social_media':
      return 'Social'
    case 'marketing_campaign':
      return 'Campaign'
    case 'walk_in':
      return 'Walk-in'
    case 'manual':
      return 'Manual'
    default:
      return source
  }
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`
}

/* ------------------------------------------------------------------ */
/*  Lead Card                                                          */
/* ------------------------------------------------------------------ */

function LeadCard({ lead }: { lead: Lead }) {
  const SourceIcon = getSourceIcon(lead.source)
  const assignedName = lead.assigned_to
    ? ASSIGNED_NAMES[lead.assigned_to] ?? lead.assigned_to
    : null

  // Score color
  let scoreColor = 'bg-red-500/20 text-red-400'
  if (lead.score >= 80) scoreColor = 'bg-emerald-500/20 text-emerald-400'
  else if (lead.score >= 50) scoreColor = 'bg-yellow-500/20 text-yellow-400'

  // Priority dot
  let priorityDot = 'bg-blue-400'
  let priorityLabel = 'Cold'
  if (lead.priority === 'hot') {
    priorityDot = 'bg-red-500'
    priorityLabel = 'Hot'
  } else if (lead.priority === 'warm') {
    priorityDot = 'bg-orange-400'
    priorityLabel = 'Warm'
  }

  return (
    <div className="group rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-4 transition-all duration-200 hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5">
      {/* Top row: name + priority */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-[#F8FAFC] leading-snug">
          {lead.first_name} {lead.last_name}
        </h4>
        <div className="flex items-center gap-1.5 flex-shrink-0" title={priorityLabel}>
          <span className={`h-2.5 w-2.5 rounded-full ${priorityDot} flex-shrink-0`} />
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
            {priorityLabel}
          </span>
        </div>
      </div>

      {/* Service needed */}
      <p className="mb-3 text-sm text-slate-400 leading-relaxed">{lead.service_needed}</p>

      {/* Value + Score badges */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center rounded-md bg-[#2DD4BF]/10 px-2 py-0.5 text-xs font-semibold text-[#2DD4BF]">
          {formatCurrency(lead.estimated_value)}
        </span>
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${scoreColor}`}
        >
          Score: {lead.score}
        </span>
      </div>

      {/* Source + assigned */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-500" title={getSourceLabel(lead.source)}>
          <SourceIcon size={13} />
          <span className="text-xs">{getSourceLabel(lead.source)}</span>
        </div>
        <span className="text-xs text-slate-500">
          {assignedName ? (
            <>Assigned to: <span className="text-slate-300">{assignedName}</span></>
          ) : (
            <span className="text-slate-600 italic">Unassigned</span>
          )}
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Pipeline Column                                                    */
/* ------------------------------------------------------------------ */

function KanbanColumn({
  column,
  leads,
}: {
  column: PipelineColumn
  leads: Lead[]
}) {
  return (
    <div className="flex min-w-[280px] flex-col rounded-xl bg-[#0B1120]">
      {/* Column header */}
      <div
        className={`flex items-center justify-between rounded-t-xl border-t-4 ${column.color} bg-[#111827] px-4 py-3`}
      >
        <div className="flex items-center gap-2">
          <h3 className={`text-sm font-semibold ${column.textColor}`}>{column.label}</h3>
        </div>
        <span
          className={`flex h-5 min-w-[20px] items-center justify-center rounded-full ${column.bgColor} px-1.5 text-[11px] font-bold ${column.textColor}`}
        >
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-1 flex-col gap-3 p-3">
        {leads.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[rgba(148,163,184,0.1)] py-8">
            <p className="text-xs text-slate-600">No leads</p>
          </div>
        ) : (
          leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Summary Bar                                                        */
/* ------------------------------------------------------------------ */

function SummaryBar({ leads }: { leads: Lead[] }) {
  const totalPipelineValue = useMemo(
    () => leads.reduce((sum, l) => sum + l.estimated_value, 0),
    [leads],
  )

  const hotLeads = useMemo(
    () => leads.filter((l) => l.priority === 'hot').length,
    [leads],
  )

  const conversionRate = useMemo(() => {
    const decidedLeads = leads.filter((l) => l.status === 'won' || l.status === 'lost')
    if (decidedLeads.length === 0) return 0
    const won = decidedLeads.filter((l) => l.status === 'won').length
    return Math.round((won / decidedLeads.length) * 100)
  }, [leads])

  const avgScore = useMemo(() => {
    if (leads.length === 0) return 0
    return Math.round(leads.reduce((sum, l) => sum + l.score, 0) / leads.length)
  }, [leads])

  const stats = [
    {
      label: 'Total Pipeline Value',
      value: formatCurrency(totalPipelineValue),
      icon: TrendingUp,
      accent: 'text-[#2DD4BF]',
    },
    {
      label: 'Hot Leads',
      value: String(hotLeads),
      icon: Flame,
      accent: 'text-red-400',
    },
    {
      label: 'Conversion Rate',
      value: `${conversionRate}%`,
      icon: BarChart3,
      accent: 'text-purple-400',
    },
    {
      label: 'Avg Lead Score',
      value: String(avgScore),
      icon: Target,
      accent: 'text-yellow-400',
    },
  ]

  return (
    <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="flex items-center gap-3">
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04] ${stat.accent}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.accent}`}>{stat.value}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function LeadsPipelinePage() {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')

  // Group leads by status
  const leadsByStatus = useMemo(() => {
    const map: Record<string, Lead[]> = {}
    for (const col of COLUMNS) {
      map[col.status] = []
    }
    for (const lead of demoLeads) {
      if (map[lead.status]) {
        map[lead.status].push(lead)
      }
    }
    return map
  }, [])

  return (
    <div className="flex h-full flex-col gap-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Lead Pipeline</h1>
          <p className="mt-1 text-sm text-slate-400">
            {demoLeads.length} total leads
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#111827] p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('board')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === 'board'
                ? 'bg-[#2DD4BF]/10 text-[#2DD4BF]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid size={14} />
            Board
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === 'list'
                ? 'bg-[#2DD4BF]/10 text-[#2DD4BF]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <List size={14} />
            List
          </button>
        </div>
      </div>

      {/* ---- Board View ---- */}
      {viewMode === 'board' && (
        <div className="flex-1 overflow-x-auto pb-2">
          <div className="flex gap-4" style={{ minWidth: COLUMNS.length * 296 }}>
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                column={col}
                leads={leadsByStatus[col.status] ?? []}
              />
            ))}
          </div>
        </div>
      )}

      {/* ---- List View ---- */}
      {viewMode === 'list' && (
        <div className="flex-1 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead>
              <tr className="border-b border-[rgba(148,163,184,0.1)]">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Name
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Service
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Value
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Score
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Priority
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Source
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Assigned
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(148,163,184,0.05)]">
              {demoLeads.map((lead) => {
                const SourceIcon = getSourceIcon(lead.source)
                const assignedName = lead.assigned_to
                  ? ASSIGNED_NAMES[lead.assigned_to] ?? lead.assigned_to
                  : null

                const colDef = COLUMNS.find((c) => c.status === lead.status)

                let scoreColor = 'bg-red-500/20 text-red-400'
                if (lead.score >= 80) scoreColor = 'bg-emerald-500/20 text-emerald-400'
                else if (lead.score >= 50) scoreColor = 'bg-yellow-500/20 text-yellow-400'

                let priorityDot = 'bg-blue-400'
                let priorityLabel = 'Cold'
                if (lead.priority === 'hot') {
                  priorityDot = 'bg-red-500'
                  priorityLabel = 'Hot'
                } else if (lead.priority === 'warm') {
                  priorityDot = 'bg-orange-400'
                  priorityLabel = 'Warm'
                }

                return (
                  <tr
                    key={lead.id}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-[#F8FAFC]">
                        {lead.first_name} {lead.last_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {lead.service_needed}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                          colDef?.bgColor ?? 'bg-slate-500/10'
                        } ${colDef?.textColor ?? 'text-slate-400'}`}
                      >
                        {colDef?.label ?? lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-[#2DD4BF]">
                        {formatCurrency(lead.estimated_value)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${scoreColor}`}
                      >
                        {lead.score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${priorityDot}`} />
                        <span className="text-xs text-slate-400">{priorityLabel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <SourceIcon size={13} />
                        <span className="text-xs">{getSourceLabel(lead.source)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {assignedName ?? (
                        <span className="italic text-slate-600">Unassigned</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- Summary Bar ---- */}
      <SummaryBar leads={demoLeads} />
    </div>
  )
}
