'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  Mail,
  Star,
  Receipt,
  Target,
  Calendar,
  Check,
  X,
  Bot,
  Clock,
  ChevronDown,
  ChevronUp,
  Building2,
  Phone,
  FileText,
  Tag,
  Send,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type ActionType =
  | 'follow_up_email'
  | 'review_request'
  | 'invoice_reminder'
  | 'lead_nurture'
  | 'appointment_reminder'
  | 'prospect_outreach'

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
  [key: string]: unknown
}

interface QueueItem {
  id: string
  organization_id: string
  action_type: string
  payload: QueueItemPayload
  status: 'pending' | 'approved' | 'rejected' | 'sent'
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Static config                                                       */
/* ------------------------------------------------------------------ */

interface ActionConfig {
  label: string
  description: string
  icon: React.ElementType
  color: string
}

const ACTION_CONFIGS: Record<string, ActionConfig> = {
  follow_up_email: {
    label: 'Follow-Up Email',
    description: 'Thank-you email after service',
    icon: Mail,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  review_request: {
    label: 'Review Request',
    description: 'Ask for a Google review',
    icon: Star,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  invoice_reminder: {
    label: 'Invoice Reminder',
    description: 'Overdue payment reminder',
    icon: Receipt,
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  },
  lead_nurture: {
    label: 'Lead Nurture',
    description: 'Re-engage dormant lead',
    icon: Target,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
  appointment_reminder: {
    label: 'Appointment Reminder',
    description: 'Upcoming appointment notice',
    icon: Calendar,
    color: 'text-green-400 bg-green-500/10 border-green-500/20',
  },
  prospect_outreach: {
    label: 'Prospect Outreach',
    description: 'Cold email to new prospect',
    icon: Send,
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  },
}

const DEFAULT_CONFIG: ActionConfig = {
  label: 'Automation',
  description: '',
  icon: Mail,
  color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
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

/* ------------------------------------------------------------------ */
/*  Detail row                                                          */
/* ------------------------------------------------------------------ */

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={13} className="text-slate-500 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <span className="text-[11px] uppercase tracking-wider text-slate-600 block">{label}</span>
        <span className="text-sm text-slate-300 break-words">{value}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Queue item card                                                     */
/* ------------------------------------------------------------------ */

interface QueueItemCardProps {
  item: QueueItem
  onApprove: (id: string) => void
  onReject: (id: string) => void
  isActing: boolean
}

function QueueItemCard({ item, onApprove, onReject, isActing }: QueueItemCardProps) {
  const [expanded, setExpanded] = useState(false)
  const config = ACTION_CONFIGS[item.action_type] ?? DEFAULT_CONFIG
  const Icon = config.icon
  const p = item.payload ?? {}
  const customerName = p.customer_name ?? 'Unknown'
  const customerEmail = p.customer_email ?? ''
  const hasEmail = !!customerEmail

  return (
    <div className={`border rounded-xl transition-all mb-2 ${expanded ? 'border-[rgba(148,163,184,0.15)] bg-white/[0.02]' : 'border-[rgba(148,163,184,0.07)] hover:border-[rgba(148,163,184,0.12)]'}`}>
      {/* Clickable header row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 sm:p-4 text-left"
      >
        {/* Type badge */}
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${config.color}`}>
          <Icon size={18} />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold text-slate-200 text-sm">{customerName}</span>
            {p.company && <span className="text-xs text-slate-500">({p.company})</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            <span className={`text-xs font-medium ${config.color.split(' ')[0]}`}>{config.label}</span>
            {customerEmail && <span className="text-xs text-slate-500 truncate">{customerEmail}</span>}
            {!hasEmail && <span className="text-xs text-red-400/70">No email</span>}
          </div>
        </div>

        {/* Time + expand icon */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-600 hidden sm:inline">{relativeTime(item.created_at)}</span>
          {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[rgba(148,163,184,0.07)]">
          {/* Payload details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0 mt-3">
            <DetailRow icon={Mail} label="Email" value={customerEmail} />
            <DetailRow icon={Phone} label="Phone" value={p.customer_phone || ''} />
            <DetailRow icon={Building2} label="Company" value={p.company || ''} />
            <DetailRow icon={Tag} label="Source" value={p.source || ''} />
            <DetailRow icon={Tag} label="Priority" value={p.lead_priority || ''} />
            <DetailRow icon={Tag} label="Status" value={p.lead_status || p.invoice_status || p.appointment_status || ''} />
            {p.total != null && <DetailRow icon={Receipt} label="Amount" value={`$${Number(p.total).toLocaleString()}`} />}
            {p.due_date && <DetailRow icon={Calendar} label="Due Date" value={p.due_date} />}
            {p.scheduled_date && <DetailRow icon={Calendar} label="Scheduled" value={`${p.scheduled_date}${p.scheduled_time ? ' at ' + p.scheduled_time : ''}`} />}
            {p.follow_up_date && <DetailRow icon={Calendar} label="Follow-up" value={p.follow_up_date} />}
          </div>

          {/* Notes — full width */}
          {p.notes && (
            <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-[rgba(148,163,184,0.06)]">
              <div className="flex items-center gap-1.5 mb-1">
                <FileText size={12} className="text-slate-500" />
                <span className="text-[11px] uppercase tracking-wider text-slate-600">Notes / Intel</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{p.notes}</p>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-1 mt-3 text-xs text-slate-600">
            <Clock size={11} />
            Queued {relativeTime(item.created_at)}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-4">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onApprove(item.id) }}
              disabled={isActing || !hasEmail}
              title={!hasEmail ? 'No email address — cannot send' : 'Approve and send'}
              className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check size={14} />
              {hasEmail ? 'Approve & Send' : 'No Email'}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onReject(item.id) }}
              disabled={isActing}
              className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X size={14} />
              Reject
            </button>
          </div>
        </div>
      )}
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

  /* Initial fetch */
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const res = await fetch('/api/automations/queue?status=pending')
        if (!res.ok) throw new Error('Failed to load queue')
        const data: QueueItem[] = await res.json()
        setItems(data)
      } catch {
        /* silently fail — component shows empty state */
      } finally {
        setLoading(false)
      }
    }
    fetchQueue()
  }, [])

  /* Realtime subscription for new inserts */
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
        }
      )
      .subscribe()

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase as any).removeChannel(channel)
    }
  }, [organizationId])

  /* Optimistic approve/reject */
  const handleAction = useCallback(
    async (id: string, action: 'approve' | 'reject') => {
      setActingIds((prev) => new Set(prev).add(id))
      /* Optimistic removal */
      setItems((prev) => prev.filter((item) => item.id !== id))

      try {
        const res = await fetch('/api/automations/queue', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action }),
        })
        if (!res.ok) throw new Error('Action failed')
      } catch {
        /* On failure, re-fetch to restore state */
        try {
          const res = await fetch('/api/automations/queue?status=pending')
          if (res.ok) {
            const data: QueueItem[] = await res.json()
            setItems(data)
          }
        } catch {
          /* ignore */
        }
      } finally {
        setActingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    []
  )

  const handleApprove = useCallback(
    (id: string) => handleAction(id, 'approve'),
    [handleAction]
  )

  const handleReject = useCallback(
    (id: string) => handleAction(id, 'reject'),
    [handleAction]
  )

  /* Count items with emails vs without */
  const withEmail = items.filter((i) => !!i.payload?.customer_email).length
  const withoutEmail = items.length - withEmail

  return (
    <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          Approval Queue
          {items.length > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500/15 px-1.5 text-xs font-semibold text-amber-400">
              {items.length}
            </span>
          )}
        </h2>
        {items.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="text-green-400">{withEmail} sendable</span>
            {withoutEmail > 0 && <span className="text-slate-600">{withoutEmail} no email</span>}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-800/50" />
          ))}
        </div>
      ) : items.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-700/50">
            <Bot size={22} className="text-slate-500" />
          </div>
          <p className="text-sm text-slate-400">No actions awaiting approval</p>
          <p className="text-xs text-slate-500">
            Items in &quot;Approve&quot; mode will appear here
          </p>
        </div>
      ) : (
        <div>
          {items.map((item) => (
            <QueueItemCard
              key={item.id}
              item={item}
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
