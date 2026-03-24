'use client'

import { useEffect, useState } from 'react'
import {
  Phone,
  Target,
  Calendar,
  Receipt,
  Star,
  Send,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  CalendarPlus,
  Mail,
  FileBarChart,
  AlertTriangle,
  CircleDot,
  Zap,
  Clock,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
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
    case 'call': return Phone
    case 'lead': return Target
    case 'appointment': return Calendar
    case 'invoice': return Receipt
    case 'review': return Star
    case 'follow_up': return Send
    default: return Zap
  }
}

function importanceBadge(importance: string) {
  switch (importance) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'medium': return 'bg-teal-500/20 text-teal-400 border-teal-500/30'
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

const cardClass = 'bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6'

function StatCard({ label, value, comparison, subtext, trend, animDelay }: {
  label: string; value: string; comparison?: string; subtext?: string; trend?: 'up' | 'down'; animDelay: number
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), animDelay); return () => clearTimeout(t) }, [animDelay])

  return (
    <div className={cardClass}>
      <p className="text-sm text-slate-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>{value}</p>
      {comparison && (
        <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
          {trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-400" />}
          {trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-400" />}
          <span className={trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : ''}>{comparison}</span>
        </p>
      )}
      {subtext && <p className="text-sm text-slate-400 mt-1">{subtext}</p>}
    </div>
  )
}

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
          <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full border ${importanceBadge(item.importance)}`}>
            {item.importance}
          </span>
        </div>
      </div>
    </div>
  )
}

function AgentCard({ name, role, stat }: { name: string; role: string; stat: string }) {
  return (
    <div className="bg-[rgba(148,163,184,0.04)] border border-[rgba(148,163,184,0.08)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <CircleDot className="h-3 w-3 text-green-400 animate-pulse" />
        <span className="text-sm font-semibold text-slate-200">{name}</span>
      </div>
      <p className="text-xs text-slate-500 mb-1">{role}</p>
      <p className="text-xs text-slate-400">{stat}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface Metrics {
  callsToday: number
  callsYesterday: number
  leadsToday: number
  conversionRate: number
  jobsBookedToday: number
  pipelineValue: number
  revenueThisMonth: number
  revenueLastMonth: number
}

export default function CommandCenterPage() {
  const { profile } = useAuth()
  const supabase = createSupabaseBrowserClient()
  const [activity, setActivity] = useState<ActivityFeedItem[]>([])
  const [metrics, setMetrics] = useState<Metrics>({
    callsToday: 0, callsYesterday: 0, leadsToday: 0, conversionRate: 0,
    jobsBookedToday: 0, pipelineValue: 0, revenueThisMonth: 0, revenueLastMonth: 0,
  })

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString()

      // Parallel queries
      const [callsRes, yesterdayCallsRes, leadsRes, leadsAllRes, activityRes, appointmentsRes] = await Promise.all([
        supabase.from('calls').select('id', { count: 'exact', head: true }).gte('started_at', today),
        supabase.from('calls').select('id', { count: 'exact', head: true }).gte('started_at', yesterday).lt('started_at', today),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('leads').select('id, status, estimated_value'),
        supabase.from('activity_feed').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).gte('created_at', today).in('status', ['scheduled', 'confirmed']),
      ])

      const allLeads = leadsAllRes.data || []
      const wonLeads = allLeads.filter((l: any) => l.status === 'won').length
      const totalLeads = allLeads.length
      const pipelineValue = allLeads.filter((l: any) => !['won', 'lost'].includes(l.status)).reduce((s: number, l: any) => s + (l.estimated_value || 0), 0)

      setMetrics({
        callsToday: callsRes.count || 0,
        callsYesterday: yesterdayCallsRes.count || 0,
        leadsToday: leadsRes.count || 0,
        conversionRate: totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0,
        jobsBookedToday: appointmentsRes.count || 0,
        pipelineValue,
        revenueThisMonth: 0,
        revenueLastMonth: 0,
      })

      if (activityRes.data) setActivity(activityRes.data as unknown as ActivityFeedItem[])
    }
    load()
  }, [])

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-slate-400 mt-1">{greeting}, {firstName}. Here&apos;s what&apos;s happening.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Calls Today"
          value={String(metrics.callsToday)}
          comparison={metrics.callsYesterday > 0 ? `vs ${metrics.callsYesterday} yesterday` : undefined}
          trend={metrics.callsToday >= metrics.callsYesterday ? 'up' : 'down'}
          animDelay={0}
        />
        <StatCard label="New Leads" value={String(metrics.leadsToday)} subtext={metrics.conversionRate > 0 ? `${metrics.conversionRate}% conversion rate` : undefined} animDelay={80} />
        <StatCard label="Jobs Booked" value={String(metrics.jobsBookedToday)} subtext={metrics.pipelineValue > 0 ? `$${metrics.pipelineValue.toLocaleString()} pipeline` : undefined} animDelay={160} />
        <StatCard label="Revenue This Month" value={metrics.revenueThisMonth > 0 ? `$${metrics.revenueThisMonth.toLocaleString()}` : '$0'} animDelay={240} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Live Activity Feed */}
          <div className={cardClass}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-teal-400" />Live Activity Feed
            </h2>
            <div className="divide-y divide-[rgba(148,163,184,0.06)]">
              {activity.length > 0 ? (
                activity.map((item) => <ActivityRow key={item.id} item={item} />)
              ) : (
                <p className="text-sm text-slate-500 py-4">No recent activity. Calls will appear here as they come in.</p>
              )}
            </div>
          </div>

          {/* AI Team Status */}
          <div className={cardClass}>
            <h2 className="text-lg font-semibold mb-4">AI Team Status</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AgentCard name="Sarah" role="Receptionist" stat={`Answered ${metrics.callsToday} calls today`} />
              <AgentCard name="Follow-Up Agent" role="Lead Nurturing" stat="Monitoring leads" />
              <AgentCard name="Review Manager" role="Reputation Management" stat="Watching reviews" />
              <AgentCard name="Invoice Agent" role="Billing & Collections" stat="Tracking payments" />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className={cardClass}>
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-400 py-3 text-sm font-medium hover:bg-teal-600/30 transition-colors">
                <Plus className="h-4 w-4" />Add Lead
              </button>
              <button className="flex items-center justify-center gap-2 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-400 py-3 text-sm font-medium hover:bg-teal-600/30 transition-colors">
                <CalendarPlus className="h-4 w-4" />Schedule
              </button>
              <button className="flex items-center justify-center gap-2 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-400 py-3 text-sm font-medium hover:bg-teal-600/30 transition-colors">
                <Mail className="h-4 w-4" />Follow-Up
              </button>
              <button className="flex items-center justify-center gap-2 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-400 py-3 text-sm font-medium hover:bg-teal-600/30 transition-colors">
                <FileBarChart className="h-4 w-4" />Report
              </button>
            </div>
          </div>

          {/* Urgent Items */}
          <div className={cardClass}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />Urgent Items
            </h2>
            <div className="space-y-3">
              {metrics.callsToday === 0 && metrics.leadsToday === 0 ? (
                <p className="text-sm text-slate-500">No urgent items right now.</p>
              ) : (
                <>
                  {metrics.leadsToday > 0 && (
                    <div className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 h-2 w-2 rounded-full bg-orange-400 flex-shrink-0" />
                      <span className="text-orange-400">{metrics.leadsToday} new lead{metrics.leadsToday > 1 ? 's' : ''} need follow-up</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
