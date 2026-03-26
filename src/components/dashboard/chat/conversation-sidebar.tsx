'use client'

import { useEffect, useState } from 'react'
import { useChat } from './chat-provider'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { PredictiveRevenue } from '@/components/dashboard/ai/predictive-revenue'
import {
  Plus,
  MessageSquare,
  Trash2,
  DollarSign,
  BarChart3,
  Target,
  Calendar,
  AlertTriangle,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Live Stats                                                         */
/* ------------------------------------------------------------------ */

function LiveStats({ orgId }: { orgId: string }) {
  const [stats, setStats] = useState({
    revenueThisMonth: 0,
    pipelineValue: 0,
    leadsThisWeek: 0,
    appointmentsToday: 0,
    atRiskCount: 0,
  })

  useEffect(() => {
    if (!orgId) return
    const supabase = createSupabaseBrowserClient()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const weekStart = new Date(now.getTime() - 7 * 86_400_000).toISOString()
    const today = now.toISOString().split('T')[0]
    const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000).toISOString().split('T')[0]
    const tomorrow = new Date(now.getTime() + 86_400_000).toISOString().split('T')[0]

    Promise.all([
      supabase.from('invoices').select('amount').eq('organization_id', orgId).eq('status', 'paid').gte('paid_at', monthStart),
      supabase.from('leads').select('estimated_value, status').eq('organization_id', orgId),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('created_at', weekStart),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('scheduled_date', today).not('status', 'eq', 'cancelled'),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).lt('follow_up_date', twoDaysAgo).not('status', 'eq', 'won').not('status', 'eq', 'lost'),
    ]).then(([invoicesRes, leadsRes, weekLeadsRes, apptRes, atRiskRes]) => {
      const revenue = ((invoicesRes.data as any[]) || []).reduce((s: number, i: any) => s + (i.amount || 0), 0)
      const pipeline = ((leadsRes.data as any[]) || [])
        .filter((l: any) => !['won', 'lost'].includes(l.status))
        .reduce((s: number, l: any) => s + (l.estimated_value || 0), 0)
      setStats({
        revenueThisMonth: revenue,
        pipelineValue: pipeline,
        leadsThisWeek: weekLeadsRes.count || 0,
        appointmentsToday: apptRes.count || 0,
        atRiskCount: atRiskRes.count || 0,
      })
    })
  }, [orgId])

  const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`

  const items = [
    { label: 'Revenue (MTD)', value: fmt(stats.revenueThisMonth), icon: DollarSign, color: 'text-green-400' },
    { label: 'Pipeline', value: fmt(stats.pipelineValue), icon: BarChart3, color: 'text-teal-400' },
    { label: 'Leads/wk', value: String(stats.leadsThisWeek), icon: Target, color: 'text-blue-400' },
    { label: 'Appts today', value: String(stats.appointmentsToday), icon: Calendar, color: 'text-purple-400' },
    { label: 'At-risk', value: String(stats.atRiskCount), icon: AlertTriangle, color: stats.atRiskCount > 0 ? 'text-amber-400' : 'text-slate-500' },
  ]

  return (
    <div className="space-y-1.5">
      {items.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="flex items-center justify-between bg-[rgba(148,163,184,0.04)] border border-[rgba(148,163,184,0.06)] rounded-lg px-2.5 py-2">
          <div className="flex items-center gap-1.5">
            <Icon className={`h-3.5 w-3.5 ${color}`} />
            <span className="text-[11px] text-slate-400">{label}</span>
          </div>
          <span className={`text-xs font-bold ${color}`}>{value}</span>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Conversation Sidebar                                               */
/* ------------------------------------------------------------------ */

export function ConversationSidebar() {
  const {
    conversations,
    activeConversationId,
    loadConversation,
    newConversation,
    deleteConversation,
  } = useChat()

  const { profile } = useAuth()
  const orgId = profile?.organization_id || ''

  return (
    <div className="flex h-full w-64 flex-col border-r border-[rgba(148,163,184,0.1)] bg-white/[0.03] lg:w-72">
      {/* New chat button */}
      <div className="border-b border-[rgba(148,163,184,0.1)] p-3">
        <button
          type="button"
          onClick={newConversation}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2DD4BF]/10 px-4 py-2.5 text-sm font-medium text-[#2DD4BF] transition-colors hover:bg-[#2DD4BF]/20"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <MessageSquare size={24} className="text-[#64748B]" />
            <p className="mt-2 text-sm text-[#64748B]">No conversations yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId
              const timeAgo = formatTimeAgo(conv.updated_at)

              return (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#2DD4BF]/10 text-[#F8FAFC]'
                      : 'text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#F8FAFC]'
                  }`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">
                      {conv.title || 'New chat'}
                    </p>
                    <p className="text-[10px] text-[#64748B]">{timeAgo}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteConversation(conv.id)
                    }}
                    className="flex-shrink-0 rounded p-1 text-[#64748B] opacity-0 transition-all hover:bg-[#EF4444]/10 hover:text-[#EF4444] group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Live Stats section */}
      <div className="border-t border-[rgba(148,163,184,0.1)] p-3 space-y-3">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Live Stats</p>
        <LiveStats orgId={orgId} />
        <PredictiveRevenue organizationId={orgId} />
      </div>
    </div>
  )
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}
