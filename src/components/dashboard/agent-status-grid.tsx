'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { ActivityFeedItem } from '@/lib/types'

interface Agent {
  id: string
  name: string
  codename: string
  role: string
  currentTask: string
  lastActivity: string | null
  status: 'active' | 'idle' | 'offline'
  color: string
}

const SQUAD: Omit<Agent, 'lastActivity' | 'status'>[] = [
  { id: 'nova', name: 'Nova', codename: 'The Spark', role: 'Marketing', currentTask: 'Running campaign analytics', color: '#f97316' },
  { id: 'cipher', name: 'Cipher', codename: 'The Vault', role: 'Finance', currentTask: 'Reconciling invoices', color: '#2DD4BF' },
  { id: 'atlas', name: 'Atlas', codename: 'The Foundation', role: 'Operations', currentTask: 'Optimizing workflows', color: '#60a5fa' },
  { id: 'pulse', name: 'Pulse', codename: 'The Monitor', role: 'IT / Systems', currentTask: 'Watching server health', color: '#a78bfa' },
  { id: 'echo', name: 'Echo', codename: 'The Finder', role: 'Research', currentTask: 'Scanning job boards', color: '#34d399' },
  { id: 'haven', name: 'Haven', codename: 'The Keeper', role: 'Client Success', currentTask: 'Nurturing accounts', color: '#fb7185' },
  { id: 'scout', name: 'Scout', codename: 'First Contact', role: 'Reception', currentTask: 'Qualifying inbound leads', color: '#fbbf24' },
  { id: 'hunter', name: 'Hunter', codename: 'The Stalker', role: 'Outreach', currentTask: 'Prospecting & emailing', color: '#f87171' },
  { id: 'closer', name: 'Closer', codename: 'The Deal Maker', role: 'Sales', currentTask: 'Running demo calls', color: '#4ade80' },
]

function relativeTime(iso: string | null): string {
  if (!iso) return 'No recent activity'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function getStatus(lastActivity: string | null): 'active' | 'idle' | 'offline' {
  if (!lastActivity) return 'offline'
  const diff = Date.now() - new Date(lastActivity).getTime()
  const mins = diff / 60_000
  if (mins < 15) return 'active'
  if (mins < 60) return 'idle'
  return 'offline'
}

const STATUS_STYLES = {
  active: { dot: 'bg-green-400 animate-pulse', label: 'Active' },
  idle: { dot: 'bg-yellow-400', label: 'Idle' },
  offline: { dot: 'bg-slate-500', label: 'Offline' },
}

interface AgentStatusGridProps {
  organizationId: string
}

export function AgentStatusGrid({ organizationId }: AgentStatusGridProps) {
  const [agents, setAgents] = useState<Agent[]>([])

  useEffect(() => {
    if (!organizationId) return
    const supabase = createSupabaseBrowserClient()

    supabase
      .from('activity_feed')
      .select('created_at, actor')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }: { data: ActivityFeedItem[] | null }) => {
        const lastSeen: Record<string, string> = {}
        if (data) {
          for (const item of data) {
            const key = item.actor.toLowerCase()
            if (!lastSeen[key]) {
              lastSeen[key] = item.created_at
            }
          }
        }

        const built = SQUAD.map((squadMember) => {
          const lastActivity = lastSeen[squadMember.id] || lastSeen[squadMember.name.toLowerCase()] || null
          const status = getStatus(lastActivity)
          return { ...squadMember, lastActivity, status }
        })

        setAgents(built)
      })
  }, [organizationId])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
      {SQUAD.map((squadMember) => {
        const agent = agents.find((a) => a.id === squadMember.id)
        const status = agent?.status || 'offline'
        const lastActivity = agent?.lastActivity || null
        const styles = STATUS_STYLES[status]

        return (
          <div
            key={squadMember.id}
            className="bg-[rgba(148,163,184,0.04)] border border-[rgba(148,163,184,0.08)] rounded-xl p-3 sm:p-4 flex flex-col gap-2"
          >
            <div className="flex items-start justify-between">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: squadMember.color + '33', color: squadMember.color }}
              >
                {squadMember.name[0]}
              </div>
              <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1 ${styles.dot}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">{squadMember.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{squadMember.role}</p>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
              {agent?.currentTask || squadMember.currentTask}
            </p>
            <div className="flex items-center gap-1 mt-auto">
              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${styles.dot}`} />
              <span className="text-[10px] text-slate-500 truncate">{relativeTime(lastActivity)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
