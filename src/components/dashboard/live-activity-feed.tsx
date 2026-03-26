'use client'

import { Phone, Target, Calendar, Receipt, Star, Send, Zap, Clock } from 'lucide-react'
import type { ActivityFeedItem } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

function entityIcon(entityType: string) {
  switch (entityType) {
    case 'call':        return Phone
    case 'lead':        return Target
    case 'appointment': return Calendar
    case 'invoice':     return Receipt
    case 'review':      return Star
    case 'follow_up':   return Send
    default:            return Zap
  }
}

function importanceBadge(importance: string) {
  switch (importance) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'high':     return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'medium':   return 'bg-teal-500/20 text-teal-400 border-teal-500/30'
    default:         return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }
}

// ---------------------------------------------------------------------------
// ActivityRow subcomponent
// ---------------------------------------------------------------------------

function ActivityRow({ item }: { item: ActivityFeedItem }) {
  const Icon = entityIcon(item.entity_type)
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[rgba(148,163,184,0.06)] last:border-0">
      <div className="mt-0.5 flex-shrink-0 rounded-lg bg-[rgba(148,163,184,0.06)] p-2">
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed">
          <span className="font-medium text-teal-400">{item.actor}</span>{' '}
          <span className="text-slate-300">{item.action}</span>
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />{relativeTime(item.created_at)}
          </span>
          <span
            className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full border ${importanceBadge(item.importance)}`}
          >
            {item.importance}
          </span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LiveActivityFeed component
// ---------------------------------------------------------------------------

interface LiveActivityFeedProps {
  activities: ActivityFeedItem[]
  connected: boolean
}

export function LiveActivityFeed({ activities, connected }: LiveActivityFeedProps) {
  return (
    <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-4 sm:p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Zap className="h-5 w-5 text-teal-400" />
        Live Activity Feed
        {connected ? (
          <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-green-400">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        ) : (
          <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-yellow-400">
            <span className="h-2 w-2 rounded-full bg-yellow-400" />
            Reconnecting...
          </span>
        )}
      </h2>
      <div className="divide-y divide-[rgba(148,163,184,0.06)]">
        {activities.length > 0 ? (
          activities.map((item) => <ActivityRow key={item.id} item={item} />)
        ) : (
          <p className="text-sm text-slate-500 py-4">
            No recent activity. Calls will appear here as they come in.
          </p>
        )}
      </div>
    </div>
  )
}
