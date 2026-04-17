'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  Mail,
  Star,
  Receipt,
  Target,
  Calendar,
  Check,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
  Shield,
  User,
  Send,
  Bot,
  Building2,
  Phone,
  FileText,
  Tag,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types — preserved from prior version                                */
/* ------------------------------------------------------------------ */

interface QueueItemPayload {
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  company?: string
  notes?: string
  source?: string
  lead_status?: string
  lead_priority?: string
  total?: number
  due_date?: string
  invoice_status?: string
  scheduled_date?: string
  scheduled_time?: string
  appointment_status?: string
  follow_up_date?: string
  created_at?: string
  // Optional fields our UI will use if present — fall back to derived values
  subject?: string
  body?: string
  message?: string
  preview_text?: string
  confidence?: number
  agent?: string
  scheduled_for?: string
  [key: string]: unknown
}

interface QueueItem {
  id: string
  organization_id: string
  action_type: string
  payload: QueueItemPayload
  status: 'pending' | 'approved' | 'rejected' | 'sent'
  created_at: string
  scheduled_for?: string | null
}

/* ------------------------------------------------------------------ */
/*  Action + Agent configs                                              */
/* ------------------------------------------------------------------ */

interface ActionConfig {
  label: string
  icon: React.ElementType
  accent: string // text color class for the action label
}

const ACTION_CONFIGS: Record<string, ActionConfig> = {
  follow_up_email: { label: 'Follow-Up Email', icon: Mail, accent: 'text-blue-400' },
  review_request: { label: 'Review Request', icon: Star, accent: 'text-amber-400' },
  invoice_reminder: { label: 'Invoice Reminder', icon: Receipt, accent: 'text-orange-400' },
  lead_nurture: { label: 'Lead Nurture', icon: Target, accent: 'text-purple-400' },
  appointment_reminder: { label: 'Appointment Reminder', icon: Calendar, accent: 'text-green-400' },
  prospect_outreach: { label: 'Prospect Outreach', icon: Send, accent: 'text-teal-400' },
}

const DEFAULT_ACTION: ActionConfig = { label: 'Automation', icon: Mail, accent: 'text-slate-400' }

type AgentName = 'Sarah' | 'G' | 'Cowork' | 'Claude Code'

interface AgentConfig {
  name: AgentName
  pill: string // tailwind classes for the agent pill
}

const AGENT_CONFIGS: Record<AgentName, AgentConfig> = {
  Sarah: { name: 'Sarah', pill: 'bg-pink-500/10 text-pink-300 border-pink-500/20' },
  G: { name: 'G', pill: 'bg-teal-500/10 text-teal-300 border-teal-500/20' },
  Cowork: { name: 'Cowork', pill: 'bg-purple-500/10 text-purple-300 border-purple-500/20' },
  'Claude Code': { name: 'Claude Code', pill: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
}

function inferAgent(item: QueueItem): AgentConfig {
  const explicit = item.payload?.agent as AgentName | undefined
  if (explicit && AGENT_CONFIGS[explicit]) return AGENT_CONFIGS[explicit]
  switch (item.action_type) {
    case 'prospect_outreach':
      return AGENT_CONFIGS['G']
    case 'appointment_reminder':
      return AGENT_CONFIGS['Sarah']
    case 'follow_up_email':
    case 'review_request':
    case 'lead_nurture':
    case 'invoice_reminder':
      return AGENT_CONFIGS['Cowork']
    default:
      return AGENT_CONFIGS['Claude Code']
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface SlaInfo {
  label: string
  critical: boolean
  warn: boolean
}

function slaCountdown(item: QueueItem): SlaInfo {
  const deadlineIso =
    (item.payload?.scheduled_for as string | undefined) ||
    item.scheduled_for ||
    new Date(new Date(item.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString()
  const diffMs = new Date(deadlineIso).getTime() - Date.now()
  if (diffMs <= 0) return { label: 'SLA overdue', critical: true, warn: false }
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 60) return { label: `Needs action in ${mins}m`, critical: mins < 120, warn: false }
  const hours = Math.floor(mins / 60)
  if (hours < 24)
    return {
      label: `Needs action in ${hours}h`,
      critical: hours < 2,
      warn: hours < 6,
    }
  const days = Math.floor(hours / 24)
  return { label: `Needs action in ${days}d`, critical: false, warn: false }
}

// Derive a confidence score 0-100. Uses payload.confidence if present,
// otherwise a deterministic blend of recency + action_type bias.
function deriveConfidence(item: QueueItem): number {
  const raw = item.payload?.confidence
  if (typeof raw === 'number' && raw >= 0 && raw <= 100) return Math.round(raw)
  if (typeof raw === 'number' && raw > 0 && raw <= 1) return Math.round(raw * 100)

  const bias: Record<string, number> = {
    appointment_reminder: 95,
    review_request: 88,
    follow_up_email: 85,
    invoice_reminder: 82,
    lead_nurture: 74,
    prospect_outreach: 68,
  }
  const base = bias[item.action_type] ?? 75
  // nudge by recency — fresher items score slightly higher
  const ageHours = (Date.now() - new Date(item.created_at).getTime()) / 3_600_000
  const freshness = Math.max(-10, Math.min(5, 5 - ageHours / 3))
  return Math.max(40, Math.min(99, Math.round(base + freshness)))
}

function confidenceTone(score: number): { bar: string; text: string } {
  if (score >= 85) return { bar: 'bg-[#2DD4BF]', text: 'text-[#2DD4BF]' }
  if (score >= 70) return { bar: 'bg-amber-400', text: 'text-amber-400' }
  return { bar: 'bg-orange-400', text: 'text-orange-400' }
}

function bodyPreview(p: QueueItemPayload): string {
  const src = p.preview_text || p.body || p.message || p.notes || ''
  const trimmed = src.replace(/\s+/g, ' ').trim()
  if (!trimmed) return ''
  return trimmed.length > 120 ? trimmed.slice(0, 120).trimEnd() + '…' : trimmed
}

function fullBody(p: QueueItemPayload): string {
  return (p.body || p.message || p.notes || p.preview_text || '').trim()
}

/* ------------------------------------------------------------------ */
/*  Row                                                                 */
/* ------------------------------------------------------------------ */

interface RowProps {
  item: QueueItem
  selected: boolean
  onToggle: (id: string) => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  isActing: boolean
}

function QueueRow({ item, selected, onToggle, onApprove, onReject, isActing }: RowProps) {
  const [expanded, setExpanded] = useState(false)
  const action = ACTION_CONFIGS[item.action_type] ?? DEFAULT_ACTION
  const ActionIcon = action.icon
  const agent = inferAgent(item)
  const p = item.payload ?? {}
  const customerName = p.customer_name?.trim() || 'Unknown recipient'
  const customerEmail = p.customer_email?.trim() || ''
  const hasEmail = !!customerEmail
  const confidence = deriveConfidence(item)
  const tone = confidenceTone(confidence)
  const sla = slaCountdown(item)
  const preview = bodyPreview(p)
  const full = fullBody(p)
  const subject = p.subject?.trim() || ''

  return (
    <div
      className={`rounded-xl border transition-all mb-2 ${
        expanded
          ? 'border-[rgba(45,212,191,0.25)] bg-white/[0.03]'
          : selected
            ? 'border-[rgba(45,212,191,0.35)] bg-[rgba(45,212,191,0.04)]'
            : 'border-[rgba(148,163,184,0.08)] hover:border-[rgba(148,163,184,0.18)]'
      }`}
    >
      <div className="flex items-start gap-3 p-3 sm:p-4">
        {/* Checkbox */}
        <label
          className="flex-shrink-0 mt-1 cursor-pointer select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(item.id)}
            className="peer sr-only"
          />
          <span
            className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
              selected
                ? 'bg-[#2DD4BF] border-[#2DD4BF]'
                : 'border-[rgba(148,163,184,0.3)] hover:border-[#2DD4BF]/60'
            }`}
          >
            {selected && <Check size={11} className="text-[#0B1120]" strokeWidth={3} />}
          </span>
        </label>

        {/* Main content — clickable to expand */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 text-left"
        >
          {/* Top row: agent pill + action label + SLA */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${agent.pill}`}
            >
              <Shield size={9} />
              {agent.name}
            </span>
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${action.accent}`}>
              <ActionIcon size={12} />
              {action.label}
            </span>
            <span
              className={`ml-auto inline-flex items-center gap-1 text-[11px] font-medium ${
                sla.critical
                  ? 'text-red-400'
                  : sla.warn
                    ? 'text-amber-400'
                    : 'text-slate-500'
              }`}
            >
              <Clock size={11} />
              {sla.label}
            </span>
          </div>

          {/* Title row: recipient */}
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold text-[#F8FAFC]">
              {subject || `${action.label} → ${customerName}`}
            </span>
            {subject && (
              <span className="text-xs text-slate-500">→ {customerName}</span>
            )}
          </div>

          {/* Recipient email */}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <User size={11} className="text-slate-600" />
            {hasEmail ? (
              <span className="text-xs text-slate-400 truncate">{customerEmail}</span>
            ) : (
              <span className="text-xs text-red-400/70">No email on file</span>
            )}
            <span className="text-xs text-slate-600">· queued {relativeTime(item.created_at)}</span>
          </div>

          {/* Preview snippet */}
          {preview && !expanded && (
            <p className="mt-2 text-xs leading-relaxed text-slate-400 line-clamp-2">{preview}</p>
          )}

          {/* Confidence bar */}
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full ${tone.bar} transition-all`}
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className={`text-[10px] font-semibold tabular-nums ${tone.text}`}>
              {confidence}% confidence
            </span>
            <ChevronDown
              size={14}
              className={`ml-auto text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {/* One-tap actions (always visible on md+) */}
        <div className="hidden md:flex flex-col gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => onApprove(item.id)}
            disabled={isActing || !hasEmail}
            title={!hasEmail ? 'No email address' : 'Approve'}
            className="flex items-center gap-1.5 rounded-lg bg-[#2DD4BF] px-3 py-1.5 text-xs font-semibold text-[#0B1120] transition-all hover:bg-[#2DD4BF]/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check size={12} strokeWidth={3} />
            Approve
          </button>
          <button
            type="button"
            onClick={() => onReject(item.id)}
            disabled={isActing}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-transparent px-3 py-1.5 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={12} strokeWidth={3} />
            Reject
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[rgba(148,163,184,0.07)]">
          {/* Full message preview */}
          {(full || subject) && (
            <div className="mt-3 rounded-lg border border-[rgba(148,163,184,0.08)] bg-[#0B1120] p-4">
              {subject && (
                <div className="mb-2 pb-2 border-b border-[rgba(148,163,184,0.08)]">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">Subject</span>
                  <p className="text-sm font-medium text-[#F8FAFC]">{subject}</p>
                </div>
              )}
              {full ? (
                <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">{full}</p>
              ) : (
                <p className="text-xs italic text-slate-500">
                  No inline body — full content rendered at send time.
                </p>
              )}
            </div>
          )}

          {/* Meta grid */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {p.company && (
              <MetaCell icon={Building2} label="Company" value={p.company} />
            )}
            {p.customer_phone && (
              <MetaCell icon={Phone} label="Phone" value={p.customer_phone} />
            )}
            {p.source && <MetaCell icon={Tag} label="Source" value={p.source} />}
            {(p.lead_status || p.invoice_status || p.appointment_status) && (
              <MetaCell
                icon={Tag}
                label="Status"
                value={p.lead_status || p.invoice_status || p.appointment_status || ''}
              />
            )}
            {p.total != null && (
              <MetaCell
                icon={Receipt}
                label="Amount"
                value={`$${Number(p.total).toLocaleString()}`}
              />
            )}
            {p.due_date && <MetaCell icon={Calendar} label="Due" value={p.due_date} />}
            {p.scheduled_date && (
              <MetaCell
                icon={Calendar}
                label="Scheduled"
                value={`${p.scheduled_date}${p.scheduled_time ? ' at ' + p.scheduled_time : ''}`}
              />
            )}
            {p.follow_up_date && (
              <MetaCell icon={Calendar} label="Follow-up" value={p.follow_up_date} />
            )}
          </div>

          {/* Notes */}
          {p.notes && !full && (
            <div className="mt-3 rounded-lg border border-[rgba(148,163,184,0.08)] bg-white/[0.02] p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <FileText size={11} className="text-slate-500" />
                <span className="text-[10px] uppercase tracking-wider text-slate-500">Notes</span>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{p.notes}</p>
            </div>
          )}

          {/* Mobile action buttons */}
          <div className="md:hidden mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => onApprove(item.id)}
              disabled={isActing || !hasEmail}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#2DD4BF] px-3 py-2 text-xs font-semibold text-[#0B1120] transition-all hover:bg-[#2DD4BF]/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={12} strokeWidth={3} />
              Approve
            </button>
            <button
              type="button"
              onClick={() => onReject(item.id)}
              disabled={isActing}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-500/40 bg-transparent px-3 py-2 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X size={12} strokeWidth={3} />
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MetaCell({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={12} className="text-slate-500 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <span className="block text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
        <span className="text-sm text-slate-300 break-words">{value}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

interface ApprovalQueueProps {
  organizationId: string
}

export function ApprovalQueue({ organizationId }: ApprovalQueueProps) {
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actingIds, setActingIds] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())

  /* Initial fetch — preserved shape */
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const res = await fetch('/api/automations/queue?status=pending')
        if (!res.ok) throw new Error('Failed to load queue')
        const data: QueueItem[] = await res.json()
        setItems(data)
      } catch {
        /* silent */
      } finally {
        setLoading(false)
      }
    }
    fetchQueue()
  }, [])

  /* Realtime subscription — preserved */
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel = (supabase as any)
      .channel(`approval-queue-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'automation_queue',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload: { new: QueueItem }) => {
          const newItem = payload.new
          if (newItem.status === 'pending') {
            setItems((prev) => [newItem, ...prev])
          }
        },
      )
      .subscribe()

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase as any).removeChannel(channel)
    }
  }, [organizationId])

  /* Mutation — preserved PATCH contract */
  const runAction = useCallback(
    async (ids: string[], action: 'approve' | 'reject') => {
      const idSet = new Set(ids)
      setActingIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })
      // Optimistic remove
      setItems((prev) => prev.filter((i) => !idSet.has(i.id)))
      setSelected((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })

      try {
        await Promise.all(
          ids.map((id) =>
            fetch('/api/automations/queue', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, action }),
            }),
          ),
        )
      } catch {
        // Restore from server on failure
        try {
          const res = await fetch('/api/automations/queue?status=pending')
          if (res.ok) setItems(await res.json())
        } catch {
          /* ignore */
        }
      } finally {
        setActingIds((prev) => {
          const next = new Set(prev)
          ids.forEach((id) => next.delete(id))
          return next
        })
      }
    },
    [],
  )

  const handleApprove = useCallback((id: string) => runAction([id], 'approve'), [runAction])
  const handleReject = useCallback((id: string) => runAction([id], 'reject'), [runAction])

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === items.length) return new Set()
      return new Set(items.map((i) => i.id))
    })
  }, [items])

  const bulkApprove = useCallback(() => {
    const ids = Array.from(selected).filter((id) => {
      const it = items.find((i) => i.id === id)
      return it && !!it.payload?.customer_email
    })
    if (ids.length) runAction(ids, 'approve')
  }, [selected, items, runAction])

  const bulkReject = useCallback(() => {
    const ids = Array.from(selected)
    if (ids.length) runAction(ids, 'reject')
  }, [selected, runAction])

  const selectedCount = selected.size
  const allSelected = items.length > 0 && selected.size === items.length

  const stats = useMemo(() => {
    let sendable = 0
    let critical = 0
    for (const it of items) {
      if (it.payload?.customer_email) sendable++
      const sla = slaCountdown(it)
      if (sla.critical) critical++
    }
    return { sendable, critical }
  }, [items])

  return (
    <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(45,212,191,0.1)] border border-[rgba(45,212,191,0.2)]">
            <Shield size={16} className="text-[#2DD4BF]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#F8FAFC] flex items-center gap-2">
              Approval Queue
              {items.length > 0 && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#2DD4BF]/15 px-1.5 text-xs font-semibold text-[#2DD4BF]">
                  {items.length}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">Actions your AI team staged for your sign-off</p>
          </div>
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-3 text-xs">
            {stats.critical > 0 && (
              <span className="inline-flex items-center gap-1 text-red-400 font-medium">
                <Clock size={11} />
                {stats.critical} urgent
              </span>
            )}
            <span className="text-slate-500">
              <span className="text-[#2DD4BF]">{stats.sendable}</span> sendable
            </span>
            {items.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                {allSelected ? 'Clear all' : 'Select all'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sticky bulk action bar */}
      {selectedCount > 0 && (
        <div className="sticky top-2 z-10 mb-3 flex items-center justify-between gap-3 rounded-xl border border-[rgba(45,212,191,0.25)] bg-[#0B1120]/95 backdrop-blur px-4 py-2.5 shadow-lg shadow-black/20">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-[#2DD4BF] px-1.5 text-xs font-bold text-[#0B1120]">
              {selectedCount}
            </span>
            <span className="text-slate-300 font-medium">selected</span>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-2 text-xs text-slate-500 hover:text-slate-300"
            >
              Clear
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={bulkReject}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/10"
            >
              <X size={12} strokeWidth={3} />
              Reject {selectedCount}
            </button>
            <button
              type="button"
              onClick={bulkApprove}
              className="flex items-center gap-1.5 rounded-lg bg-[#2DD4BF] px-3 py-1.5 text-xs font-semibold text-[#0B1120] transition-all hover:bg-[#2DD4BF]/90"
            >
              <Check size={12} strokeWidth={3} />
              Approve {selectedCount}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-white/[0.03]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#2DD4BF]/20 blur-xl" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.12)] border border-[rgba(45,212,191,0.3)]">
              <Check size={26} className="text-[#2DD4BF]" strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#F8FAFC]">
              No actions waiting — your AI team is on autopilot
            </p>
            <p className="mt-1 text-xs text-slate-500 flex items-center justify-center gap-1.5">
              <Bot size={11} />
              Sarah, G, and Cowork are standing by
            </p>
          </div>
        </div>
      ) : (
        <div>
          {items.map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onToggle={toggleSelect}
              onApprove={handleApprove}
              onReject={handleReject}
              isActing={actingIds.has(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Silence unused-import warning for ChevronUp (kept in allowed-icon list)
void ChevronUp
