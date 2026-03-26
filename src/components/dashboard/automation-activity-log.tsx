'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  Mail,
  Star,
  Receipt,
  Target,
  Calendar,
  Clock,
  Inbox,
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

type LogStatus = 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked' | string

interface AutomationLogEntry {
  id: string
  organization_id: string
  action_type: ActionType
  status: LogStatus
  target_name?: string
  target_contact?: string
  details?: string
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Static config                                                       */
/* ------------------------------------------------------------------ */

interface ActionConfig {
  label: string
  icon: React.ElementType
}

const ACTION_CONFIGS: Record<ActionType, ActionConfig> = {
  follow_up_email: { label: 'Follow-Up Email', icon: Mail },
  review_request: { label: 'Review Request', icon: Star },
  invoice_reminder: { label: 'Invoice Reminder', icon: Receipt },
  lead_nurture: { label: 'Lead Nurture', icon: Target },
  appointment_reminder: { label: 'Appointment Reminder', icon: Calendar },
}

const FALLBACK_CONFIG: ActionConfig = { label: 'Automation', icon: Mail }

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

interface StatusDotConfig {
  dot: string
  badge: string
  label: string
}

function statusConfig(status: LogStatus): StatusDotConfig {
  switch (status) {
    case 'sent':
    case 'delivered':
      return {
        dot: 'bg-green-400',
        badge: 'text-green-400 bg-green-400/10',
        label: status.charAt(0).toUpperCase() + status.slice(1),
      }
    case 'failed':
      return {
        dot: 'bg-red-400',
        badge: 'text-red-400 bg-red-400/10',
        label: 'Failed',
      }
    case 'opened':
      return {
        dot: 'bg-blue-400',
        badge: 'text-blue-400 bg-blue-400/10',
        label: 'Opened',
      }
    case 'clicked':
      return {
        dot: 'bg-purple-400',
        badge: 'text-purple-400 bg-purple-400/10',
        label: 'Clicked',
      }
    default:
      return {
        dot: 'bg-slate-400',
        badge: 'text-slate-400 bg-slate-400/10',
        label: status,
      }
  }
}

/* ------------------------------------------------------------------ */
/*  Log row                                                             */
/* ------------------------------------------------------------------ */

function LogRow({ entry }: { entry: AutomationLogEntry }) {
  const config = ACTION_CONFIGS[entry.action_type] ?? FALLBACK_CONFIG
  const Icon = config.icon
  const sc = statusConfig(entry.status)

  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-[rgba(148,163,184,0.07)] last:border-0">
      {/* Status dot + action icon */}
      <div className="relative flex-shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-700/40 text-slate-400">
          <Icon size={16} />
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#111827] ${sc.dot}`}
        />
      </div>

      {/* Action label + target */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-slate-200">{config.label}</span>
          {entry.target_name && (
            <span className="text-xs text-slate-400 truncate">
              {entry.target_name}
            </span>
          )}
          {entry.target_contact && (
            <span className="text-xs text-slate-500 truncate">
              {entry.target_contact}
            </span>
          )}
        </div>
        {entry.details && (
          <p className="mt-0.5 text-xs text-slate-500 truncate">{entry.details}</p>
        )}
      </div>

      {/* Status badge */}
      <span
        className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.badge}`}
      >
        {sc.label}
      </span>

      {/* Time */}
      <span className="flex-shrink-0 flex items-center gap-1 text-xs text-slate-500">
        <Clock size={11} />
        {relativeTime(entry.created_at)}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

interface AutomationActivityLogProps {
  organizationId: string
}

export function AutomationActivityLog({ organizationId }: AutomationActivityLogProps) {
  const [entries, setEntries] = useState<AutomationLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLog = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data } = await (supabase as any)
          .from('automation_log')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (data) setEntries(data as AutomationLogEntry[])
      } catch {
        /* silently fail */
      } finally {
        setLoading(false)
      }
    }
    fetchLog()
  }, [organizationId])

  return (
    <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
      {/* Header */}
      <h2 className="text-lg font-semibold text-slate-200 mb-4">
        Automation Activity
      </h2>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-xl bg-slate-800/50"
            />
          ))}
        </div>
      ) : entries.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-700/50">
            <Inbox size={22} className="text-slate-500" />
          </div>
          <p className="text-sm text-slate-400">No automation activity yet</p>
          <p className="text-xs text-slate-500">
            Sent, opened, and failed automations will appear here
          </p>
        </div>
      ) : (
        <div>
          {entries.map((entry) => (
            <LogRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
