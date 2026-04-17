'use client'

import { Phone, Target, Calendar, Receipt, Star, Send, Zap, Clock, MessageSquare, Briefcase, Code, Sparkles } from 'lucide-react'
import type { ActivityFeedItem } from '@/lib/types'

// ---------------------------------------------------------------------------
// Agent attribution
// ---------------------------------------------------------------------------

type AgentKey = 'sarah' | 'g' | 'cowork' | 'claude_code' | 'oios'

interface AgentMeta {
  name: string
  icon: React.ElementType
  pill: string      // bg + border + text
  iconColor: string
}

const AGENTS: Record<AgentKey, AgentMeta> = {
  sarah: {
    name: 'Sarah',
    icon: Phone,
    pill: 'bg-[rgba(45,212,191,0.12)] border-[rgba(45,212,191,0.3)] text-[#2DD4BF]',
    iconColor: 'text-[#2DD4BF]',
  },
  g: {
    name: 'G',
    icon: MessageSquare,
    pill: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
    iconColor: 'text-purple-400',
  },
  cowork: {
    name: 'Cowork',
    icon: Briefcase,
    pill: 'bg-[rgba(249,115,22,0.12)] border-[rgba(249,115,22,0.3)] text-[#f97316]',
    iconColor: 'text-[#f97316]',
  },
  claude_code: {
    name: 'Claude Code',
    icon: Code,
    pill: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    iconColor: 'text-blue-400',
  },
  oios: {
    name: 'OIOS',
    icon: Sparkles,
    pill: 'bg-[rgba(148,163,184,0.08)] border-[rgba(148,163,184,0.15)] text-slate-300',
    iconColor: 'text-slate-400',
  },
}

function agentFor(item: ActivityFeedItem): AgentKey {
  // 1) Try explicit attribution from metadata.agent
  const meta = (item.metadata ?? {}) as Record<string, unknown>
  const rawAgent = typeof meta.agent === 'string' ? meta.agent.toLowerCase() : ''
  if (rawAgent) {
    if (rawAgent.includes('sarah')) return 'sarah'
    if (rawAgent === 'g' || rawAgent.includes('openclaw') || rawAgent.includes('discord')) return 'g'
    if (rawAgent.includes('cowork')) return 'cowork'
    if (rawAgent.includes('claude') || rawAgent.includes('code')) return 'claude_code'
  }

  // 2) Try the actor field
  const actor = (item.actor || '').toLowerCase()
  if (actor.includes('sarah')) return 'sarah'
  if (actor === 'g' || actor.includes('openclaw')) return 'g'
  if (actor.includes('cowork')) return 'cowork'
  if (actor.includes('claude')) return 'claude_code'

  // 3) Map by entity/action
  const action = (item.action || '').toLowerCase()
  const entity = (item.entity_type || '').toLowerCase()

  if (entity === 'call' || action.includes('call_answered') || action.includes('answered')) return 'sarah'
  if (action.includes('deploy') || action.includes('deployed') || action.includes('build')) return 'claude_code'
  if (action.includes('task_completed') || action.includes('task complete')) return 'cowork'
  if (action.includes('lead_engaged') || action.includes('engaged') || action.includes('message') || entity === 'follow_up') return 'g'

  return 'oios'
}

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
// AgentBadge
// ---------------------------------------------------------------------------

function AgentBadge({ agentKey }: { agentKey: AgentKey }) {
  const a = AGENTS[agentKey]
  const Icon = a.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${a.pill}`}>
      <Icon className={`h-2.5 w-2.5 ${a.iconColor}`} />
      {a.name}
    </span>
  )
}

// ---------------------------------------------------------------------------
// ActivityRow
// ---------------------------------------------------------------------------

function ActivityRow({ item }: { item: ActivityFeedItem }) {
  const Icon = entityIcon(item.entity_type)
  const agentKey = agentFor(item)
  const agent = AGENTS[agentKey]

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[rgba(148,163,184,0.06)] last:border-0">
      <div className={`mt-0.5 flex-shrink-0 rounded-lg p-2 ${agent.pill.replace(/text-[^ ]+/, '')}`}>
        <Icon className={`h-4 w-4 ${agent.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <AgentBadge agentKey={agentKey} />
          <span className="text-xs text-[#64748B]">·</span>
          <span className="text-xs text-slate-400">{item.actor}</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{item.action}</p>
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
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[#F8FAFC]">
        <Zap className="h-5 w-5 text-[#2DD4BF]" />
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
