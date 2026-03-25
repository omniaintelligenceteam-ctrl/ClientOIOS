'use client'

import { useEffect, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  CalendarPlus,
  Mail,
  FileBarChart,
  AlertTriangle,
  CircleDot,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import { useRealtimeFeed } from '@/hooks/useRealtimeFeed'
import { LiveActivityFeed } from '@/components/dashboard/live-activity-feed'

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
  const orgId = profile?.organization_id || ''
  const [metrics, setMetrics] = useState<Metrics>({
    callsToday: 0, callsYesterday: 0, leadsToday: 0, conversionRate: 0,
    jobsBookedToday: 0, pipelineValue: 0, revenueThisMonth: 0, revenueLastMonth: 0,
  })

  // Realtime feed hook — also increments metrics on call/lead inserts
  const { activities, connected } = useRealtimeFeed(orgId, {
    onCallInsert: () => setMetrics((prev) => ({ ...prev, callsToday: prev.callsToday + 1 })),
    onLeadInsert: () => setMetrics((prev) => ({ ...prev, leadsToday: prev.leadsToday + 1 })),
  })

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const load = async () => {
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

      // Parallel queries
      const [callsRes, yesterdayCallsRes, leadsRes, leadsAllRes, appointmentsRes] = await Promise.all([
        supabase.from('calls').select('id', { count: 'exact', head: true }).gte('started_at', today),
        supabase.from('calls').select('id', { count: 'exact', head: true }).gte('started_at', yesterday).lt('started_at', today),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('leads').select('id, status, estimated_value'),
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
          <LiveActivityFeed activities={activities} connected={connected} />

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
