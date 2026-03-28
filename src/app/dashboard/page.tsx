'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  CalendarPlus,
  Mail,
  FileBarChart,
  Phone,
  Target,
  CalendarCheck,
  DollarSign,
  Users,
  GitFork,
  TrendingUp,
  Trophy,
  BarChart2,
  Activity,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import { useRealtimeFeed } from '@/hooks/useRealtimeFeed'
import { LiveActivityFeed } from '@/components/dashboard/live-activity-feed'
import { MorningBriefingCard } from '@/components/dashboard/morning-briefing-card'
import { ApprovalQueue } from '@/components/dashboard/approval-queue'
import { RoiSummaryCard } from '@/components/dashboard/roi-summary-card'
import { PipelineFunnel } from '@/components/dashboard/pipeline-funnel'
import { LeadSourceChart } from '@/components/dashboard/lead-source-chart'
import { AtRiskAlerts } from '@/components/dashboard/at-risk-alerts'
import { AgentStatusGrid } from '@/components/dashboard/agent-status-grid'
import { RevenueSparkline } from '@/components/dashboard/charts/revenue-sparkline'
import { GoalProgressRings } from '@/components/dashboard/charts/goal-progress-rings'
import { HeatmapCalendar } from '@/components/dashboard/charts/heatmap-calendar'
import { RevenueForecast } from '@/components/dashboard/charts/revenue-forecast'
import { TeamLeaderboard } from '@/components/dashboard/team-leaderboard'
import { MidDayPulse } from '@/components/dashboard/mid-day-pulse'
import { InsightBadge } from '@/components/ui/insight-badge'
import {
  insightForCalls,
  insightForLeads,
  insightForJobsBooked,
  insightForRevenue,
  insightForConversion,
  insightForPipeline,
} from '@/lib/ai/insight-engine'
import { demoMetrics } from '@/lib/demo-data'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const cardClass = 'backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6'

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  comparison,
  subtext,
  trend,
  icon: Icon,
  animDelay,
  insight,
}: {
  label: string
  value: string
  comparison?: string
  subtext?: string
  trend?: 'up' | 'down'
  icon: React.ElementType
  animDelay: number
  insight?: { text: string; type: 'positive' | 'warning' | 'neutral' | 'info' }
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), animDelay)
    return () => clearTimeout(t)
  }, [animDelay])

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-400">{label}</p>
        <div className="p-2 rounded-lg bg-[rgba(45,212,191,0.08)]">
          <Icon className="h-4 w-4 text-teal-400" />
        </div>
      </div>
      <p
        className={`text-3xl font-bold transition-all duration-700 ease-out ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        {value}
      </p>
      {comparison && (
        <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
          {trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-400" />}
          {trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-400" />}
          <span className={trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : ''}>
            {comparison}
          </span>
        </p>
      )}
      {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
      {insight && visible && (
        <div className="mt-3">
          <InsightBadge text={insight.text} type={insight.type} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Metrics type
// ---------------------------------------------------------------------------

interface Metrics {
  callsToday: number
  callsYesterday: number
  leadsToday: number
  leadsYesterday: number
  conversionRate: number
  jobsBookedToday: number
  jobsBookedYesterday: number
  pipelineValue: number
  revenueThisMonth: number
  revenueLastMonth: number
  projectedNextMonth: number
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CommandCenterPage() {
  const router = useRouter()
  const { profile, isLoading, isDemoMode } = useAuth()
  const orgId = profile?.organization_id || ''

  const [metrics, setMetrics] = useState<Metrics>({
    callsToday: 0,
    callsYesterday: 0,
    leadsToday: 0,
    leadsYesterday: 0,
    conversionRate: 0,
    jobsBookedToday: 0,
    jobsBookedYesterday: 0,
    pipelineValue: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
    projectedNextMonth: 0,
  })

  const { activities, connected } = useRealtimeFeed(orgId, {
    onCallInsert: () => setMetrics((prev) => ({ ...prev, callsToday: prev.callsToday + 1 })),
    onLeadInsert: () => setMetrics((prev) => ({ ...prev, leadsToday: prev.leadsToday + 1 })),
  })

  useEffect(() => {
    if (!orgId) return

    // In demo mode, use static demo metrics instead of querying DB
    if (isDemoMode) {
      setMetrics({
        callsToday: demoMetrics.callsToday,
        callsYesterday: demoMetrics.callsYesterday,
        leadsToday: demoMetrics.leadsToday,
        leadsYesterday: 3,
        conversionRate: demoMetrics.conversionRate,
        jobsBookedToday: demoMetrics.jobsBookedToday,
        jobsBookedYesterday: 2,
        pipelineValue: demoMetrics.pipelineValue,
        revenueThisMonth: demoMetrics.revenueThisMonth,
        revenueLastMonth: demoMetrics.revenueLastMonth,
        projectedNextMonth: Math.round(demoMetrics.revenueThisMonth * 1.15),
      })
      return
    }

    const supabase = createSupabaseBrowserClient()

    const load = async () => {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
      const dayBeforeYesterday = new Date(Date.now() - 2 * 86_400_000).toISOString().split('T')[0]

      // Current month bounds
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

      // Last month bounds
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const lastMonthEnd = monthStart

      const [
        callsRes,
        yesterdayCallsRes,
        leadsRes,
        leadsYesterdayRes,
        leadsAllRes,
        appointmentsRes,
        appointmentsYesterdayRes,
        invoicesThisMonthRes,
        invoicesLastMonthRes,
      ] = await Promise.all([
        supabase
          .from('calls')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .gte('started_at', today),

        supabase
          .from('calls')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .gte('started_at', yesterday)
          .lt('started_at', today),

        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .gte('created_at', today),

        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .gte('created_at', yesterday)
          .lt('created_at', today),

        supabase
          .from('leads')
          .select('id, status, estimated_value')
          .eq('organization_id', orgId),

        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .gte('created_at', today)
          .in('status', ['scheduled', 'confirmed']),

        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .gte('created_at', yesterday)
          .lt('created_at', today)
          .in('status', ['scheduled', 'confirmed', 'completed']),

        supabase
          .from('invoices')
          .select('amount')
          .eq('organization_id', orgId)
          .eq('status', 'paid')
          .gte('paid_at', monthStart)
          .lt('paid_at', monthEnd),

        supabase
          .from('invoices')
          .select('amount')
          .eq('organization_id', orgId)
          .eq('status', 'paid')
          .gte('paid_at', lastMonthStart)
          .lt('paid_at', lastMonthEnd),
      ])

      const allLeads = (leadsAllRes.data as Array<{ status: string; estimated_value?: number }>) || []
      const wonLeads = allLeads.filter((l) => l.status === 'won').length
      const totalLeads = allLeads.length
      const pipelineValue = allLeads
        .filter((l) => !['won', 'lost'].includes(l.status))
        .reduce((s, l) => s + (l.estimated_value || 0), 0)

      const revenueThisMonth = ((invoicesThisMonthRes.data as Array<{ amount: number }>) || []).reduce(
        (s, inv) => s + (inv.amount || 0),
        0
      )
      const revenueLastMonth = ((invoicesLastMonthRes.data as Array<{ amount: number }>) || []).reduce(
        (s, inv) => s + (inv.amount || 0),
        0
      )

      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const dayOfMonth = now.getDate()
      const projectedNextMonth =
        dayOfMonth > 0 ? Math.round((revenueThisMonth / dayOfMonth) * daysInMonth) : 0

      setMetrics({
        callsToday: callsRes.count || 0,
        callsYesterday: yesterdayCallsRes.count || 0,
        leadsToday: leadsRes.count || 0,
        leadsYesterday: leadsYesterdayRes.count || 0,
        conversionRate: totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0,
        jobsBookedToday: appointmentsRes.count || 0,
        jobsBookedYesterday: appointmentsYesterdayRes.count || 0,
        pipelineValue,
        revenueThisMonth,
        revenueLastMonth,
        projectedNextMonth,
      })
    }

    load()
  }, [orgId, isDemoMode])

  // Show loading skeleton while auth is resolving
  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-72 bg-slate-800 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-800 rounded-2xl" />
      </div>
    )
  }

  // If auth loaded but no org, prompt setup
  if (!orgId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="text-xl font-semibold text-slate-200 mb-2">Organization Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">Your account is not linked to an organization yet. Please complete setup or contact support.</p>
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-500 transition-colors cursor-pointer"
        >
          Go to Settings
        </button>
      </div>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Revenue trend comparison
  const revDiff = metrics.revenueThisMonth - metrics.revenueLastMonth
  const revTrend: 'up' | 'down' | undefined =
    metrics.revenueLastMonth > 0 ? (revDiff >= 0 ? 'up' : 'down') : undefined
  const revComparison =
    metrics.revenueLastMonth > 0
      ? `${revDiff >= 0 ? '+' : ''}${Math.round((revDiff / metrics.revenueLastMonth) * 100)}% vs last month`
      : undefined

  // Insights
  const callsInsight   = insightForCalls(metrics.callsToday, metrics.callsYesterday)
  const leadsInsight   = insightForLeads(metrics.leadsToday, metrics.leadsYesterday)
  const jobsInsight    = insightForJobsBooked(metrics.jobsBookedToday, metrics.jobsBookedYesterday)
  const revenueInsight = insightForRevenue(metrics.revenueThisMonth, metrics.revenueLastMonth)

  // Pipeline insight
  const pipelineInsight = insightForPipeline(metrics.pipelineValue)
  // Lead source insight (generic info)
  const leadSourceInsight = insightForConversion(metrics.conversionRate)

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-slate-400 mt-1">
            {greeting}, {firstName}. Here&apos;s what&apos;s happening.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Revenue Sparkline */}
          {orgId && <RevenueSparkline organizationId={orgId} />}
          {/* Connection status */}
          <div className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 border ${
            connected
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
          }`}>
            {connected ? (
              <><Wifi className="h-3.5 w-3.5" /> Live</>
            ) : (
              <><WifiOff className="h-3.5 w-3.5" /> Reconnecting</>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Morning Briefing                                                     */}
      {/* ------------------------------------------------------------------ */}
      <MorningBriefingCard organizationId={orgId} />

      {/* ------------------------------------------------------------------ */}
      {/* Mid-Day Pulse (shows after 12pm)                                    */}
      {/* ------------------------------------------------------------------ */}
      <MidDayPulse organizationId={orgId} isDemoMode={isDemoMode} />

      {/* ------------------------------------------------------------------ */}
      {/* Stat Cards                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Calls Today"
          value={String(metrics.callsToday)}
          comparison={
            metrics.callsYesterday > 0
              ? `vs ${metrics.callsYesterday} yesterday`
              : undefined
          }
          trend={metrics.callsToday >= metrics.callsYesterday ? 'up' : 'down'}
          icon={Phone}
          animDelay={0}
          insight={callsInsight}
        />
        <StatCard
          label="New Leads"
          value={String(metrics.leadsToday)}
          subtext={
            metrics.conversionRate > 0
              ? `${metrics.conversionRate}% all-time conversion`
              : undefined
          }
          icon={Target}
          animDelay={80}
          insight={leadsInsight}
        />
        <StatCard
          label="Jobs Booked Today"
          value={String(metrics.jobsBookedToday)}
          subtext={
            metrics.pipelineValue > 0
              ? `$${metrics.pipelineValue.toLocaleString()} pipeline`
              : undefined
          }
          icon={CalendarCheck}
          animDelay={160}
          insight={jobsInsight}
        />
        <StatCard
          label="Revenue This Month"
          value={
            metrics.revenueThisMonth > 0
              ? `$${metrics.revenueThisMonth.toLocaleString()}`
              : '$0'
          }
          comparison={revComparison}
          trend={revTrend}
          subtext={
            metrics.projectedNextMonth > 0
              ? `~$${metrics.projectedNextMonth.toLocaleString()} projected`
              : undefined
          }
          icon={DollarSign}
          animDelay={240}
          insight={revenueInsight}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* At-Risk Alerts Strip                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-[rgba(148,163,184,0.02)] border border-[rgba(148,163,184,0.07)] rounded-xl px-4 py-3">
        <AtRiskAlerts organizationId={orgId} />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Charts Row — Pipeline Funnel + Lead Source                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GitFork className="h-5 w-5 text-teal-400" />
              <h2 className="text-lg font-semibold">Pipeline Funnel</h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="font-medium text-slate-400">Count</span>
              <span className="font-medium text-teal-400">Value</span>
              <span>Rate</span>
            </div>
          </div>
          {/* Pipeline insight badge */}
          <div className="mb-4">
            <InsightBadge text={pipelineInsight.text} type={pipelineInsight.type} />
          </div>
          <PipelineFunnel organizationId={orgId} />
        </div>

        {/* Lead Source Breakdown */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-semibold">Lead Sources</h2>
          </div>
          {/* Lead source insight badge */}
          <div className="mb-4">
            <InsightBadge text={leadSourceInsight.text} type={leadSourceInsight.type} />
          </div>
          <LeadSourceChart organizationId={orgId} />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ROI Summary                                                          */}
      {/* ------------------------------------------------------------------ */}
      <RoiSummaryCard organizationId={orgId} />

      {/* ------------------------------------------------------------------ */}
      {/* Main two-column layout                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <LiveActivityFeed activities={activities} connected={connected} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <ApprovalQueue organizationId={orgId} />

          {/* Quick Actions */}
          <div className={cardClass}>
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => router.push('/dashboard/leads')} className="cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-400 min-h-[44px] py-2 text-sm font-medium hover:bg-teal-600/30 transition-colors">
                <Plus className="h-4 w-4" />Add Lead
              </button>
              <button onClick={() => router.push('/dashboard/schedule')} className="cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-400 min-h-[44px] py-2 text-sm font-medium hover:bg-teal-600/30 transition-colors">
                <CalendarPlus className="h-4 w-4" />Schedule
              </button>
              <button onClick={() => router.push('/dashboard/leads')} className="cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-400 min-h-[44px] py-2 text-sm font-medium hover:bg-teal-600/30 transition-colors">
                <Mail className="h-4 w-4" />Follow-Up
              </button>
              <button onClick={() => router.push('/dashboard/reports')} className="cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-400 min-h-[44px] py-2 text-sm font-medium hover:bg-teal-600/30 transition-colors">
                <FileBarChart className="h-4 w-4" />Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Analytics 2.0 — Goal Rings + Heatmap                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-6">
        {/* Goal Progress Rings */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-semibold">Monthly Goals</h2>
          </div>
          <GoalProgressRings organizationId={orgId} />
        </div>

        {/* Call Volume Heatmap */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-semibold">Call Volume</h2>
            <span className="ml-auto text-xs text-slate-500">Day × Hour (last 90 days)</span>
          </div>
          <HeatmapCalendar organizationId={orgId} />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Revenue Forecast                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="h-5 w-5 text-teal-400" />
          <h2 className="text-lg font-semibold">Revenue Forecast</h2>
          <span className="ml-2 text-xs text-slate-500">90-day projection</span>
        </div>
        <RevenueForecast organizationId={orgId} />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Team Leaderboard                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-5">
          <Trophy className="h-5 w-5 text-yellow-400" />
          <h2 className="text-lg font-semibold">Team Leaderboard</h2>
          <span className="ml-2 text-xs text-slate-500">Last 90 days</span>
        </div>
        <TeamLeaderboard organizationId={orgId} />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Agent Status Grid                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="h-5 w-5 text-teal-400" />
          <h2 className="text-lg font-semibold">Squad Status</h2>
          <span className="ml-2 text-xs text-slate-500">9 agents</span>
        </div>
        <AgentStatusGrid organizationId={orgId} />
      </div>
    </div>
  )
}
