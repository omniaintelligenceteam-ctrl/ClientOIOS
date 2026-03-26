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

interface QueueItemPayload {
  customer_name?: string
  customer_email?: string
  [key: string]: unknown
}

interface QueueItem {
  id: string
  organization_id: string
  action_type: ActionType
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
}

const ACTION_CONFIGS: Record<ActionType, ActionConfig> = {
  follow_up_email: {
    label: 'Follow-Up Email',
    description: 'Send thank-you email after service completion',
    icon: Mail,
  },
  review_request: {
    label: 'Review Request',
    description: 'Ask satisfied customer for a Google review',
    icon: Star,
  },
  invoice_reminder: {
    label: 'Invoice Reminder',
    description: 'Remind customer about overdue payment',
    icon: Receipt,
  },
  lead_nurture: {
    label: 'Lead Nurture',
    description: 'Follow up with lead that hasn\'t converted',
    icon: Target,
  },
  appointment_reminder: {
    label: 'Appointment Reminder',
    description: 'Remind customer about upcoming appointment',
    icon: Calendar,
  },
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
/*  Queue item row                                                      */
/* ------------------------------------------------------------------ */

interface QueueItemRowProps {
  item: QueueItem
  onApprove: (id: string) => void
  onReject: (id: string) => void
  isActing: boolean
}

function QueueItemRow({ item, onApprove, onReject, isActing }: QueueItemRowProps) {
  const config = ACTION_CONFIGS[item.action_type] ?? {
    label: item.action_type,
    description: '',
    icon: Mail,
  }
  const Icon = config.icon
  const customerName = item.payload?.customer_name ?? 'Unknown Customer'
  const customerEmail = item.payload?.customer_email ?? ''

  return (
    <div className="flex items-center gap-4 py-4 border-b border-[rgba(148,163,184,0.07)] last:border-0">
      {/* Icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
        <Icon size={18} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-medium text-slate-200 text-sm">{customerName}</span>
          <span className="text-xs text-slate-500 truncate max-w-[100px] sm:max-w-none">{customerEmail}</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
          <span className="font-medium text-teal-400">{config.label}</span>
          {config.description ? ` — ${config.description}` : ''}
        </p>
        <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
          <Clock size={11} />
          {relativeTime(item.created_at)}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          title="Approve"
          onClick={() => onApprove(item.id)}
          disabled={isActing}
          className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 transition-colors hover:bg-green-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check size={15} />
        </button>
        <button
          type="button"
          title="Reject"
          onClick={() => onReject(item.id)}
          disabled={isActing}
          className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={15} />
        </button>
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

  return (
    <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-4 sm:p-6">
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
            <QueueItemRow
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
