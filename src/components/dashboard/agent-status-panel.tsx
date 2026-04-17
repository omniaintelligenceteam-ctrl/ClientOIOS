'use client'

import { useEffect, useState } from 'react'
import { Phone, MessageSquare, Briefcase, Code } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AgentKey = 'sarah' | 'g' | 'cowork' | 'claude_code'
type AgentStatus = 'active' | 'idle' | 'issue' | 'initializing'

interface AgentRow {
  key: AgentKey
  name: string
  role: string
  icon: React.ElementType
  accent: string // tailwind text color
  bg: string // background/ring color
  status: AgentStatus
  lastAction: string
  lastActionAt?: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_AGENTS: AgentRow[] = [
  {
    key: 'sarah',
    name: 'Sarah',
    role: 'Voice agent',
    icon: Phone,
    accent: 'text-[#2DD4BF]',
    bg: 'bg-[rgba(45,212,191,0.1)]',
    status: 'initializing',
    lastAction: 'Booting up',
  },
  {
    key: 'g',
    name: 'G',
    role: 'Field agent',
    icon: MessageSquare,
    accent: 'text-purple-400',
    bg: 'bg-purple-500/10',
    status: 'initializing',
    lastAction: 'Booting up',
  },
  {
    key: 'cowork',
    name: 'Cowork',
    role: 'COO',
    icon: Briefcase,
    accent: 'text-[#f97316]',
    bg: 'bg-[rgba(249,115,22,0.1)]',
    status: 'initializing',
    lastAction: 'Booting up',
  },
  {
    key: 'claude_code',
    name: 'Claude Code',
    role: 'Builder',
    icon: Code,
    accent: 'text-blue-400',
    bg: 'bg-blue-500/10',
    status: 'initializing',
    lastAction: 'Booting up',
  },
]

function statusDotClass(status: AgentStatus): string {
  switch (status) {
    case 'active': return 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]'
    case 'idle':   return 'bg-amber-400'
    case 'issue':  return 'bg-red-400'
    default:       return 'bg-slate-500'
  }
}

function statusLabel(status: AgentStatus): string {
  switch (status) {
    case 'active':       return 'Active'
    case 'idle':         return 'Idle'
    case 'issue':        return 'Issue'
    default:             return 'Initializing'
  }
}

function relTime(iso?: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function normalizeKey(raw: string): AgentKey | null {
  const k = (raw || '').toLowerCase().replace(/[^a-z]/g, '_')
  if (k.includes('sarah')) return 'sarah'
  if (k === 'g' || k.includes('openclaw') || k.includes('discord')) return 'g'
  if (k.includes('cowork')) return 'cowork'
  if (k.includes('claude') || k.includes('code') || k.includes('builder')) return 'claude_code'
  return null
}

function normalizeStatus(raw: string): AgentStatus {
  const s = (raw || '').toLowerCase()
  if (['active', 'online', 'running', 'healthy', 'ok'].includes(s)) return 'active'
  if (['idle', 'standby', 'waiting'].includes(s)) return 'idle'
  if (['issue', 'error', 'down', 'failed', 'offline'].includes(s)) return 'issue'
  return 'initializing'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AgentStatusPanelProps {
  organizationId?: string
}

export function AgentStatusPanel({ organizationId }: AgentStatusPanelProps) {
  const [agents, setAgents] = useState<AgentRow[]>(DEFAULT_AGENTS)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const supabase = createSupabaseBrowserClient()
      if (!supabase) return
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any = (supabase as any).from('agent_status').select('*')
        if (organizationId) {
          query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`)
        }
        const { data, error } = await query
        if (error || !data || cancelled) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = data as any[]
        setAgents(prev =>
          prev.map(a => {
            const match = rows.find(r => {
              const nameKey = normalizeKey(r.agent_name || r.name || r.agent || '')
              return nameKey === a.key
            })
            if (!match) return a
            const status = normalizeStatus(match.status || match.state || '')
            const lastAction =
              match.last_action ||
              match.last_activity ||
              match.message ||
              match.summary ||
              a.lastAction
            const lastAt =
              match.last_action_at ||
              match.updated_at ||
              match.last_seen_at ||
              null
            return { ...a, status, lastAction, lastActionAt: lastAt }
          })
        )
      } catch {
        // swallow — fall back to defaults
      }
    }
    load()
    return () => { cancelled = true }
  }, [organizationId])

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {agents.map(agent => {
        const Icon = agent.icon
        const timeStr = relTime(agent.lastActionAt)
        return (
          <div
            key={agent.key}
            className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-4 flex flex-col gap-3 hover:border-[rgba(148,163,184,0.2)] transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${agent.bg}`}>
                  <Icon className={`h-4 w-4 ${agent.accent}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#F8FAFC] leading-tight">{agent.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[#64748B]">{agent.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`h-2 w-2 rounded-full ${statusDotClass(agent.status)} ${agent.status === 'active' ? 'animate-pulse' : ''}`} />
                <span className="text-[10px] font-medium text-[#94A3B8]">{statusLabel(agent.status)}</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#94A3B8] leading-snug line-clamp-2">{agent.lastAction}</p>
              {timeStr && (
                <p className="text-[10px] text-[#64748B] mt-1">{timeStr}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
