// Phase Delta: Power User Interactions
'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import {
  Phone, Globe, Users, Share2, Megaphone, UserPlus, PenTool,
  LayoutGrid, List, TrendingUp, Flame, BarChart3, Target, Loader2,
  Eye, PhoneCall, UserCheck, Trash2, Tag, Copy,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import type { Lead, LeadSource, LeadStatus } from '@/lib/types'
import { EmptyState } from '@/components/dashboard/empty-state'
import { LeadDetailDrawer } from '@/components/dashboard/lead-detail-drawer'
import { LeadSearch } from '@/components/dashboard/leads/lead-search'
import { BulkActionsBar } from '@/components/dashboard/leads/bulk-actions-bar'
import { InlineEdit } from '@/components/ui/inline-edit'
import { ContextMenu, type ContextMenuItem } from '@/components/ui/context-menu'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

interface PipelineColumn {
  status: LeadStatus
  label: string
  color: string
  bgColor: string
  textColor: string
  dotColor: string
}

const COLUMNS: PipelineColumn[] = [
  { status: 'new', label: 'New', color: 'border-t-blue-400', bgColor: 'bg-blue-500/10', textColor: 'text-blue-400', dotColor: 'bg-blue-400' },
  { status: 'contacted', label: 'Contacted', color: 'border-t-yellow-400', bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-400', dotColor: 'bg-yellow-400' },
  { status: 'qualified', label: 'Qualified', color: 'border-t-teal-400', bgColor: 'bg-teal-500/10', textColor: 'text-teal-400', dotColor: 'bg-teal-400' },
  { status: 'proposal_sent', label: 'Proposal Sent', color: 'border-t-purple-400', bgColor: 'bg-purple-500/10', textColor: 'text-purple-400', dotColor: 'bg-purple-400' },
  { status: 'won', label: 'Won', color: 'border-t-emerald-400', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-400', dotColor: 'bg-emerald-400' },
  { status: 'lost', label: 'Lost', color: 'border-t-red-400', bgColor: 'bg-red-500/10', textColor: 'text-red-400', dotColor: 'bg-red-400' },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getSourceIcon(source: LeadSource) {
  switch (source) {
    case 'phone_call': return Phone
    case 'web_form': return Globe
    case 'referral': return Users
    case 'social_media': return Share2
    case 'marketing_campaign': return Megaphone
    case 'walk_in': return UserPlus
    case 'manual': return PenTool
    default: return Phone
  }
}

function getSourceLabel(source: LeadSource): string {
  const map: Record<LeadSource, string> = {
    phone_call: 'Phone', web_form: 'Web', referral: 'Referral',
    social_media: 'Social', marketing_campaign: 'Campaign', walk_in: 'Walk-in', manual: 'Manual',
  }
  return map[source] ?? source
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`
}

function getPriorityMeta(priority: string) {
  if (priority === 'hot') return { dot: 'bg-red-500', label: 'Hot' }
  if (priority === 'warm') return { dot: 'bg-orange-400', label: 'Warm' }
  return { dot: 'bg-blue-400', label: 'Cold' }
}

function getScoreColor(score: number) {
  if (score >= 80) return 'bg-emerald-500/20 text-emerald-400'
  if (score >= 50) return 'bg-yellow-500/20 text-yellow-400'
  return 'bg-red-500/20 text-red-400'
}

/* ------------------------------------------------------------------ */
/*  Lead Card (Kanban) — with DnD + InlineEdit + ContextMenu         */
/* ------------------------------------------------------------------ */

function LeadCard({
  lead,
  selected,
  onToggle,
  onClick,
  onDragStart,
  onLeadUpdated,
  teamMembers,
}: {
  lead: Lead
  selected: boolean
  onToggle: (id: string) => void
  onClick: (lead: Lead) => void
  onDragStart: (lead: Lead) => void
  onLeadUpdated: (lead: Lead) => void
  teamMembers: Record<string, string>
}) {
  const supabase = createSupabaseBrowserClient()
  const SourceIcon = getSourceIcon(lead.source)
  const assignedName = lead.assigned_to ? teamMembers[lead.assigned_to] || 'Unassigned' : null
  const { dot: priorityDot, label: priorityLabel } = getPriorityMeta(lead.priority)
  const scoreColor = getScoreColor(lead.score)

  const handleSaveValue = async (value: string | number) => {
    const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[$,]/g, ''))
    if (isNaN(num)) return
    const { data } = await supabase
      .from('leads')
      .update({ estimated_value: num })
      .eq('id', lead.id)
      .select()
      .single()
    if (data) onLeadUpdated(data as unknown as Lead)
  }

  const handleSaveService = async (value: string | number) => {
    const { data } = await supabase
      .from('leads')
      .update({ service_needed: String(value) })
      .eq('id', lead.id)
      .select()
      .single()
    if (data) onLeadUpdated(data as unknown as Lead)
  }

  const contextItems: ContextMenuItem[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: Eye,
      onClick: () => onClick(lead),
    },
    {
      id: 'call',
      label: 'Log Call',
      icon: PhoneCall,
      onClick: () => {/* navigate to calls */},
    },
    {
      id: 'assign',
      label: 'Assign Lead',
      icon: UserCheck,
      onClick: () => onClick(lead),
    },
    {
      id: 'copy',
      label: 'Copy Name',
      icon: Copy,
      onClick: () => {
        navigator.clipboard?.writeText(`${lead.first_name} ${lead.last_name}`)
      },
    },
    { id: 'div1', label: '', onClick: () => {}, divider: true },
    {
      id: 'delete',
      label: 'Delete Lead',
      icon: Trash2,
      danger: true,
      onClick: async () => {
        await supabase.from('leads').delete().eq('id', lead.id)
        onLeadUpdated({ ...lead, status: 'lost' as LeadStatus })
      },
    },
  ]

  return (
    <ContextMenu items={contextItems}>
      <div
        draggable
        onDragStart={e => {
          e.dataTransfer.effectAllowed = 'move'
          onDragStart(lead)
        }}
        onClick={() => onClick(lead)}
        className={`group cursor-pointer rounded-xl border bg-white/[0.03] p-4 transition-all duration-200 hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5 ${
          selected ? 'border-[#2DD4BF]/40 ring-1 ring-[#2DD4BF]/20' : 'border-[rgba(148,163,184,0.1)]'
        }`}
      >
        {/* Top row */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Checkbox */}
            <div
              role="checkbox"
              aria-checked={selected}
              onClick={e => { e.stopPropagation(); onToggle(lead.id) }}
              className={`flex h-4 w-4 flex-shrink-0 cursor-pointer items-center justify-center rounded border transition-all ${
                selected
                  ? 'border-[#2DD4BF] bg-[#2DD4BF]'
                  : 'border-[rgba(148,163,184,0.2)] bg-transparent group-hover:border-[rgba(148,163,184,0.4)]'
              }`}
            >
              {selected && (
                <svg className="h-2.5 w-2.5 text-[#0B1120]" fill="none" viewBox="0 0 10 10">
                  <path d="M1.5 5.5L4 8l4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <h4 className="truncate text-sm font-semibold text-[#F8FAFC]">
              {lead.first_name} {lead.last_name}
            </h4>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5" title={priorityLabel}>
            <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${priorityDot}`} />
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{priorityLabel}</span>
          </div>
        </div>

        {/* Service (inline editable) */}
        <div className="mb-3" onClick={e => e.stopPropagation()}>
          <InlineEdit
            value={lead.service_needed}
            type="text"
            onSave={handleSaveService}
            className="text-sm leading-relaxed text-slate-400 hover:text-slate-300"
          />
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {/* Value (inline editable) */}
          <div onClick={e => e.stopPropagation()}>
            <InlineEdit
              value={lead.estimated_value}
              type="currency"
              onSave={handleSaveValue}
              formatDisplay={v => formatCurrency(Number(v))}
              className="inline-flex items-center rounded-md bg-[#2DD4BF]/10 px-2 py-0.5 text-xs font-semibold text-[#2DD4BF]"
            />
          </div>
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${scoreColor}`}>
            Score: {lead.score}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500">
            <SourceIcon size={13} />
            <span className="text-xs">{getSourceLabel(lead.source)}</span>
          </div>
          <span className="text-xs text-slate-500">
            {assignedName ? (
              <><span className="text-slate-600">→ </span><span className="text-slate-300">{assignedName}</span></>
            ) : (
              <span className="italic text-slate-600">Unassigned</span>
            )}
          </span>
        </div>
      </div>
    </ContextMenu>
  )
}

/* ------------------------------------------------------------------ */
/*  Kanban Column — with DnD drop zone                                */
/* ------------------------------------------------------------------ */

function KanbanColumn({
  column, leads, selectedIds, onToggle, onLeadClick,
  onDragStart, onDrop, onLeadUpdated, teamMembers,
}: {
  column: PipelineColumn
  leads: Lead[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onLeadClick: (lead: Lead) => void
  onDragStart: (lead: Lead) => void
  onDrop: (status: LeadStatus) => void
  onLeadUpdated: (lead: Lead) => void
  teamMembers: Record<string, string>
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div
      className="flex min-w-[280px] flex-col rounded-xl bg-[#0B1120]"
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={e => { e.preventDefault(); setIsDragOver(false); onDrop(column.status) }}
    >
      <div className={`flex items-center justify-between rounded-t-xl border-t-4 ${column.color} bg-white/[0.03] px-4 py-3 transition-colors ${isDragOver ? 'bg-teal-500/5' : ''}`}>
        <h3 className={`text-sm font-semibold ${column.textColor}`}>{column.label}</h3>
        <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full ${column.bgColor} px-1.5 text-[11px] font-bold ${column.textColor}`}>
          {leads.length}
        </span>
      </div>
      <div className={`flex flex-1 flex-col gap-3 p-3 rounded-b-xl transition-all duration-150 ${
        isDragOver ? 'border-2 border-dashed border-teal-500/50 bg-teal-500/5' : 'border-2 border-transparent'
      }`}>
        {leads.length === 0 ? (
          <div className={`flex flex-1 items-center justify-center rounded-lg border border-dashed py-8 transition-colors ${
            isDragOver ? 'border-teal-500/40 bg-teal-500/5' : 'border-[rgba(148,163,184,0.1)]'
          }`}>
            <p className="text-xs text-slate-600">{isDragOver ? 'Drop here' : 'No leads'}</p>
          </div>
        ) : (
          leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              selected={selectedIds.has(lead.id)}
              onToggle={onToggle}
              onClick={onLeadClick}
              onDragStart={onDragStart}
              onLeadUpdated={onLeadUpdated}
              teamMembers={teamMembers}
            />
          ))
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Summary Bar                                                        */
/* ------------------------------------------------------------------ */

function SummaryBar({ leads }: { leads: Lead[] }) {
  const totalPipelineValue = useMemo(() => leads.reduce((sum, l) => sum + l.estimated_value, 0), [leads])
  const hotLeads = useMemo(() => leads.filter(l => l.priority === 'hot').length, [leads])
  const conversionRate = useMemo(() => {
    const decided = leads.filter(l => l.status === 'won' || l.status === 'lost')
    if (decided.length === 0) return 0
    return Math.round((decided.filter(l => l.status === 'won').length / decided.length) * 100)
  }, [leads])
  const avgScore = useMemo(() => {
    if (leads.length === 0) return 0
    return Math.round(leads.reduce((sum, l) => sum + l.score, 0) / leads.length)
  }, [leads])

  const stats = [
    { label: 'Total Pipeline Value', value: formatCurrency(totalPipelineValue), icon: TrendingUp, accent: 'text-[#2DD4BF]' },
    { label: 'Hot Leads', value: String(hotLeads), icon: Flame, accent: 'text-red-400' },
    { label: 'Conversion Rate', value: `${conversionRate}%`, icon: BarChart3, accent: 'text-purple-400' },
    { label: 'Avg Lead Score', value: String(avgScore), icon: Target, accent: 'text-yellow-400' },
  ]

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(stat => {
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
/*  Floating Bulk Actions Bar                                          */
/* ------------------------------------------------------------------ */

function FloatingBulkBar({
  selectedCount,
  onClear,
  onDelete,
  onAssign,
  onExport,
}: {
  selectedCount: number
  onClear: () => void
  onDelete: () => void
  onAssign: () => void
  onExport: () => void
}) {
  if (selectedCount === 0) return null
  return (
    <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-3 rounded-2xl border border-[#2DD4BF]/20 bg-black/[0.7] px-5 py-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2DD4BF] text-[11px] font-bold text-[#0B1120]">
            {selectedCount}
          </div>
          <span className="text-sm font-medium text-[#F8FAFC]">
            {selectedCount === 1 ? 'lead' : 'leads'} selected
          </span>
        </div>

        <div className="h-4 w-px bg-[rgba(148,163,184,0.15)]" />

        <div className="flex items-center gap-2">
          <button
            onClick={onAssign}
            className="flex items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-[#2DD4BF]/30 hover:text-[#2DD4BF]"
          >
            <UserCheck size={13} />
            Assign
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(255,255,255,0.04)] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-[#2DD4BF]/30 hover:text-[#2DD4BF]"
          >
            <Tag size={13} />
            Export
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>

        <div className="h-4 w-px bg-[rgba(148,163,184,0.15)]" />

        <button
          onClick={onClear}
          className="text-xs text-slate-500 transition-colors hover:text-slate-300"
        >
          Clear
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LeadsPipelinePage() {
  const { profile } = useAuth()
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const dragLeadRef = useRef<Lead | null>(null)
  const [teamMembers, setTeamMembers] = useState<Record<string, string>>({})
  const supabase = createSupabaseBrowserClient()

  const orgId = profile?.organization_id ?? ''

  // Fetch team members for assigned-to display
  useEffect(() => {
    if (!orgId) return
    supabase
      .from('users')
      .select('id, full_name')
      .eq('organization_id', orgId)
      .then(({ data }: { data: { id: string; full_name: string | null }[] | null }) => {
        if (data) {
          const map: Record<string, string> = {}
          for (const u of data as { id: string; full_name: string | null }[]) {
            if (u.full_name) map[u.id] = u.full_name
          }
          setTeamMembers(map)
        }
      })
  }, [orgId])

  const fetchLeads = useCallback(async () => {
    const query = supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (orgId) query.eq('organization_id', orgId)
    const { data } = await query
    if (data) setLeads(data as unknown as Lead[])
    setLoading(false)
  }, [orgId])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const leadsByStatus = useMemo(() => {
    const map: Record<string, Lead[]> = {}
    for (const col of COLUMNS) map[col.status] = []
    for (const lead of leads) {
      if (map[lead.status]) map[lead.status].push(lead)
    }
    return map
  }, [leads])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(leads.map(l => l.id)))
    }
  }

  const handleLeadUpdated = useCallback((updated: Lead) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
    if (activeLead?.id === updated.id) setActiveLead(updated)
  }, [activeLead])

  /* DnD handlers */
  const handleDragStart = useCallback((lead: Lead) => {
    dragLeadRef.current = lead
  }, [])

  const handleDrop = useCallback(async (targetStatus: LeadStatus) => {
    const dragged = dragLeadRef.current
    if (!dragged || dragged.status === targetStatus) return

    // Optimistic update
    const updated = { ...dragged, status: targetStatus }
    setLeads(prev => prev.map(l => l.id === dragged.id ? updated : l))
    if (activeLead?.id === dragged.id) setActiveLead(updated)

    // Persist to Supabase
    const { error } = await supabase
      .from('leads')
      .update({ status: targetStatus })
      .eq('id', dragged.id)

    if (error) {
      // Rollback on failure
      setLeads(prev => prev.map(l => l.id === dragged.id ? dragged : l))
    }

    dragLeadRef.current = null
  }, [activeLead, supabase])

  /* Bulk delete */
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    setLeads(prev => prev.filter(l => !ids.includes(l.id)))
    setSelectedIds(new Set())
    await supabase.from('leads').delete().in('id', ids)
  }

  /* Bulk export */
  const handleBulkExport = () => {
    const selectedLeads = leads.filter(l => selectedIds.has(l.id))
    const headers = ['First Name', 'Last Name', 'Phone', 'Status', 'Value', 'Service']
    const rows = selectedLeads.map(l => [l.first_name, l.last_name, l.phone, l.status, l.estimated_value, l.service_needed])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#F8FAFC]">Lead Pipeline</h1>
            <p className="mt-1 text-sm text-slate-400">{leads.length} total leads</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            {orgId && (
              <LeadSearch organizationId={orgId} onSelect={lead => setActiveLead(lead)} />
            )}
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5">
              <button type="button" onClick={() => setViewMode('board')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${viewMode === 'board' ? 'bg-[#2DD4BF]/10 text-[#2DD4BF]' : 'text-slate-400 hover:text-slate-200'}`}>
                <LayoutGrid size={14} /> Board
              </button>
              <button type="button" onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-[#2DD4BF]/10 text-[#2DD4BF]' : 'text-slate-400 hover:text-slate-200'}`}>
                <List size={14} /> List
              </button>
            </div>
          </div>
        </div>

        {/* Inline bulk actions bar (for list view / detailed controls) */}
        {selectedIds.size > 0 && orgId && viewMode === 'list' && (
          <BulkActionsBar
            selectedIds={Array.from(selectedIds)}
            allLeads={leads}
            organizationId={orgId}
            onClear={() => setSelectedIds(new Set())}
            onRefresh={fetchLeads}
          />
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
        </div>
      )}

      {/* Empty */}
      {!loading && leads.length === 0 && (
        <EmptyState icon={Target} title="No leads yet"
          description="Leads are automatically created when callers express interest. They'll appear here." />
      )}

      {/* Board View with DnD */}
      {!loading && viewMode === 'board' && leads.length > 0 && (
        <div className="flex-1 overflow-x-auto pb-2">
          <div className="flex gap-4" style={{ minWidth: COLUMNS.length * 296 }}>
            {COLUMNS.map(col => (
              <KanbanColumn
                key={col.status}
                column={col}
                leads={leadsByStatus[col.status] ?? []}
                selectedIds={selectedIds}
                onToggle={toggleSelect}
                onLeadClick={setActiveLead}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onLeadUpdated={handleLeadUpdated}
                teamMembers={teamMembers}
              />
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === 'list' && leads.length > 0 && (
        <div className="flex-1 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead>
              <tr className="border-b border-[rgba(148,163,184,0.1)]">
                <th className="px-4 py-3 w-10">
                  <div
                    role="checkbox"
                    aria-checked={selectedIds.size === leads.length && leads.length > 0}
                    onClick={toggleAll}
                    className={`flex h-4 w-4 cursor-pointer items-center justify-center rounded border transition-all ${
                      selectedIds.size === leads.length && leads.length > 0
                        ? 'border-[#2DD4BF] bg-[#2DD4BF]'
                        : 'border-[rgba(148,163,184,0.2)] hover:border-[rgba(148,163,184,0.4)]'
                    }`}
                  >
                    {selectedIds.size === leads.length && leads.length > 0 && (
                      <svg className="h-2.5 w-2.5 text-[#0B1120]" fill="none" viewBox="0 0 10 10">
                        <path d="M1.5 5.5L4 8l4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </th>
                {['Name', 'Service', 'Status', 'Value', 'Score', 'Priority', 'Source', 'Assigned'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(148,163,184,0.05)]">
              {leads.map(lead => {
                const SourceIcon = getSourceIcon(lead.source)
                const assignedName = lead.assigned_to ? teamMembers[lead.assigned_to] || 'Unassigned' : null
                const colDef = COLUMNS.find(c => c.status === lead.status)
                const scoreColor = getScoreColor(lead.score)
                const { dot: priorityDot, label: priorityLabel } = getPriorityMeta(lead.priority)

                const rowContextItems: ContextMenuItem[] = [
                  { id: 'view', label: 'View Details', icon: Eye, onClick: () => setActiveLead(lead) },
                  { id: 'copy', label: 'Copy Name', icon: Copy, onClick: () => navigator.clipboard?.writeText(`${lead.first_name} ${lead.last_name}`) },
                  { id: 'div', label: '', onClick: () => {}, divider: true },
                  { id: 'delete', label: 'Delete Lead', icon: Trash2, danger: true, onClick: async () => {
                    setLeads(prev => prev.filter(l => l.id !== lead.id))
                    await supabase.from('leads').delete().eq('id', lead.id)
                  }},
                ]

                return (
                  <ContextMenu key={lead.id} items={rowContextItems}>
                    <tr
                      onClick={() => setActiveLead(lead)}
                      className={`cursor-pointer transition-colors hover:bg-white/[0.02] ${
                        selectedIds.has(lead.id) ? 'bg-[#2DD4BF]/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div
                          role="checkbox"
                          aria-checked={selectedIds.has(lead.id)}
                          onClick={() => toggleSelect(lead.id)}
                          className={`flex h-4 w-4 cursor-pointer items-center justify-center rounded border transition-all ${
                            selectedIds.has(lead.id)
                              ? 'border-[#2DD4BF] bg-[#2DD4BF]'
                              : 'border-[rgba(148,163,184,0.2)] hover:border-[rgba(148,163,184,0.4)]'
                          }`}
                        >
                          {selectedIds.has(lead.id) && (
                            <svg className="h-2.5 w-2.5 text-[#0B1120]" fill="none" viewBox="0 0 10 10">
                              <path d="M1.5 5.5L4 8l4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-[#F8FAFC]">{lead.first_name} {lead.last_name}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400" onClick={e => e.stopPropagation()}>
                        <InlineEdit
                          value={lead.service_needed}
                          type="text"
                          onSave={async (v) => {
                            const { data } = await supabase.from('leads').update({ service_needed: String(v) }).eq('id', lead.id).select().single()
                            if (data) handleLeadUpdated(data as unknown as Lead)
                          }}
                          className="text-sm text-slate-400 hover:text-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${colDef?.bgColor ?? 'bg-slate-500/10'} ${colDef?.textColor ?? 'text-slate-400'}`}>
                          {colDef?.label ?? lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <InlineEdit
                          value={lead.estimated_value}
                          type="currency"
                          onSave={async (v) => {
                            const num = parseFloat(String(v).replace(/[$,]/g, ''))
                            if (isNaN(num)) return
                            const { data } = await supabase.from('leads').update({ estimated_value: num }).eq('id', lead.id).select().single()
                            if (data) handleLeadUpdated(data as unknown as Lead)
                          }}
                          formatDisplay={v => formatCurrency(Number(v))}
                          className="text-sm font-semibold text-[#2DD4BF]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${scoreColor}`}>{lead.score}</span>
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
                        {assignedName ?? <span className="italic text-slate-600">Unassigned</span>}
                      </td>
                    </tr>
                  </ContextMenu>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Bar */}
      {!loading && <SummaryBar leads={leads} />}

      {/* Floating bulk actions (board view) */}
      {viewMode === 'board' && (
        <FloatingBulkBar
          selectedCount={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          onDelete={handleBulkDelete}
          onAssign={() => {/* open assign modal */}}
          onExport={handleBulkExport}
        />
      )}

      {/* Lead Detail Drawer */}
      {activeLead && (
        <LeadDetailDrawer
          lead={activeLead}
          customer={null}
          onClose={() => setActiveLead(null)}
          onLeadUpdated={handleLeadUpdated}
        />
      )}
    </div>
  )
}
