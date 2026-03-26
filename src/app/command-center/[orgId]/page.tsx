'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  Activity,
  FileText,
  Heart,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  ListTodo,
  Phone,
  Globe,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  Bell,
} from 'lucide-react'
import {
  useCommandCenterRealtime,
  type CommandCenterTask,
} from '@/hooks/useCommandCenterRealtime'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const cardClass =
  'bg-[rgba(15,23,42,0.6)] border border-[rgba(148,163,184,0.1)] rounded-xl p-6'

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-slate-500/20', text: 'text-slate-300', label: 'Pending' },
  assigned: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Assigned' },
  in_progress: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'In Progress' },
  awaiting_approval: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    label: 'Awaiting Approval',
  },
  completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },
  failed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Failed' },
}

const PRIORITY_COLORS: Record<string, { dot: string; label: string }> = {
  low: { dot: 'bg-slate-400', label: 'Low' },
  normal: { dot: 'bg-blue-400', label: 'Normal' },
  high: { dot: 'bg-orange-400', label: 'High' },
  urgent: { dot: 'bg-red-400', label: 'Urgent' },
}

const PLATFORM_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  openclaw: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'OpenClaw' },
  'claude-code': { bg: 'bg-teal-500/20', text: 'text-teal-400', label: 'Claude Code' },
  'claude-cowork': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Cowork' },
  wes: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Wes' },
}

const MESSAGE_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  request: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Request' },
  response: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Response' },
  notification: { bg: 'bg-slate-500/20', text: 'text-slate-300', label: 'Notification' },
  escalation: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Escalation' },
  handoff: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Handoff' },
}

const TIER_LABELS: Record<string, string> = {
  answering_service: 'Answering Service',
  receptionist: 'Receptionist',
  office_manager: 'Office Manager',
  coo: 'COO',
  growth_engine: 'Growth Engine',
}

const TIER_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  answering_service: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  receptionist: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  office_manager: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  coo: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  growth_engine: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
}

const ONBOARDING_BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-slate-500/20', text: 'text-slate-300', label: 'Pending' },
  configuring: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Configuring' },
  testing: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Testing' },
  live: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Live' },
  paused: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Paused' },
}

type TabKey = 'overview' | 'tasks' | 'health' | 'messages'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: Activity },
  { key: 'tasks', label: 'Tasks', icon: ListTodo },
  { key: 'health', label: 'Health', icon: Heart },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
]

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OrgDetails {
  id: string
  name: string
  tier: string
  onboarding_status: string
  trade: string | null
  phone_number: string | null
  timezone: string | null
  health_score: number | null
  last_health_check_at: string | null
  active_task_count: number | null
  alert_count: number | null
}

interface HealthScore {
  id: string
  organization_id: string
  score_date: string
  overall_score: number
  call_volume_score: number | null
  response_quality_score: number | null
  prompt_health_score: number | null
  alerts: string[] | null
  recommendations: string[] | null
  created_at: string
}

interface AgentMessage {
  id: string
  organization_id: string
  task_id: string | null
  from_platform: string
  to_platform: string
  message_type: string
  subject: string | null
  body: string
  status: string
  metadata: Record<string, unknown> | null
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-400'
  if (score >= 50) return 'bg-yellow-400'
  return 'bg-red-400'
}

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                      */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_COLORS[status] || STATUS_COLORS.pending
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  )
}

function PlatformBadge({ platform }: { platform: string | null }) {
  if (!platform) return <span className="text-[#64748B] text-xs">--</span>
  const style = PLATFORM_STYLES[platform] || {
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
    label: platform,
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  )
}

function PriorityIndicator({ priority }: { priority: string }) {
  const style = PRIORITY_COLORS[priority] || PRIORITY_COLORS.normal
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      <span className="text-xs text-[#94A3B8]">{style.label}</span>
    </div>
  )
}

function MessageTypeBadge({ type }: { type: string }) {
  const style = MESSAGE_TYPE_COLORS[type] || MESSAGE_TYPE_COLORS.notification
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  )
}

function ScoreBar({
  label,
  score,
  maxWidth = 'max-w-[200px]',
}: {
  label: string
  score: number | null
  maxWidth?: string
}) {
  if (score === null || score === undefined) return null
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#94A3B8] w-32 flex-shrink-0">{label}</span>
      <div className={`flex-1 ${maxWidth}`}>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${getScoreBgColor(score)}`}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
      </div>
      <span className={`text-xs font-semibold w-8 text-right ${getScoreColor(score)}`}>
        {score}
      </span>
    </div>
  )
}

function FadeIn({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div
      className={`transition-all duration-500 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      } ${className}`}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Overview                                                      */
/* ------------------------------------------------------------------ */

function OverviewTab({
  org,
  healthScore,
  tasks,
  messages,
}: {
  org: OrgDetails
  healthScore: HealthScore | null
  tasks: CommandCenterTask[]
  messages: AgentMessage[]
}) {
  const activeTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.status !== 'failed'
  )

  // Interleaved activity feed: recent tasks + messages, sorted by date, max 10
  const activityFeed = [
    ...tasks.slice(0, 15).map((t) => ({
      id: `task-${t.id}`,
      type: 'task' as const,
      title: t.title,
      status: t.status,
      date: t.updated_at || t.created_at,
      icon: ListTodo,
      iconColor: 'text-[#2DD4BF]',
    })),
    ...messages.slice(0, 15).map((m) => ({
      id: `msg-${m.id}`,
      type: 'message' as const,
      title: m.subject || m.body.slice(0, 80),
      status: m.message_type,
      date: m.created_at,
      icon: MessageSquare,
      iconColor: 'text-blue-400',
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  const displayScore = healthScore?.overall_score ?? org.health_score ?? null

  return (
    <div className="space-y-6">
      {/* Top row: Client Info + Health Score */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Info Card */}
        <FadeIn delay={0}>
          <div className={cardClass}>
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">Client Info</h3>
            <div className="space-y-3">
              {/* Name */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#94A3B8]">Organization</span>
                <span className="text-sm font-semibold text-[#F8FAFC]">{org.name}</span>
              </div>

              {/* Trade */}
              {org.trade && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#94A3B8]">Trade</span>
                  <span className="text-sm text-[#F8FAFC] capitalize">{org.trade}</span>
                </div>
              )}

              {/* Tier */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#94A3B8]">Tier</span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    (TIER_BADGE_STYLES[org.tier] || { bg: 'bg-slate-500/20', text: 'text-slate-400' }).bg
                  } ${(TIER_BADGE_STYLES[org.tier] || { bg: 'bg-slate-500/20', text: 'text-slate-400' }).text}`}
                >
                  {TIER_LABELS[org.tier] || org.tier}
                </span>
              </div>

              {/* Onboarding Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#94A3B8]">Status</span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    (
                      ONBOARDING_BADGE_STYLES[org.onboarding_status] || {
                        bg: 'bg-slate-500/20',
                        text: 'text-slate-300',
                        label: org.onboarding_status,
                      }
                    ).bg
                  } ${
                    (
                      ONBOARDING_BADGE_STYLES[org.onboarding_status] || {
                        bg: 'bg-slate-500/20',
                        text: 'text-slate-300',
                        label: org.onboarding_status,
                      }
                    ).text
                  }`}
                >
                  {(
                    ONBOARDING_BADGE_STYLES[org.onboarding_status] || {
                      bg: 'bg-slate-500/20',
                      text: 'text-slate-300',
                      label: org.onboarding_status,
                    }
                  ).label}
                </span>
              </div>

              {/* Phone */}
              {org.phone_number && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#94A3B8]">Phone</span>
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} className="text-[#64748B]" />
                    <span className="text-sm text-[#F8FAFC]">{org.phone_number}</span>
                  </div>
                </div>
              )}

              {/* Timezone */}
              {org.timezone && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#94A3B8]">Timezone</span>
                  <div className="flex items-center gap-1.5">
                    <Globe size={12} className="text-[#64748B]" />
                    <span className="text-sm text-[#F8FAFC]">{org.timezone}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </FadeIn>

        {/* Health Score Card */}
        <FadeIn delay={80}>
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#F8FAFC]">Health Score</h3>
              {healthScore?.score_date && (
                <span className="text-[10px] text-[#64748B]">
                  Last check: {formatDate(healthScore.score_date)}
                </span>
              )}
            </div>

            {displayScore !== null ? (
              <div className="space-y-5">
                {/* Big number */}
                <div className="flex items-end gap-2">
                  <span
                    className={`text-5xl font-bold ${getScoreColor(displayScore)}`}
                  >
                    {displayScore}
                  </span>
                  <span className="text-sm text-[#64748B] mb-1.5">/ 100</span>
                </div>

                {/* Sub-scores */}
                <div className="space-y-2.5">
                  <ScoreBar
                    label="Call Volume"
                    score={healthScore?.call_volume_score ?? null}
                  />
                  <ScoreBar
                    label="Response Quality"
                    score={healthScore?.response_quality_score ?? null}
                  />
                  <ScoreBar
                    label="Prompt Health"
                    score={healthScore?.prompt_health_score ?? null}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8">
                <Heart size={32} className="text-[#64748B]" />
                <p className="text-sm text-[#64748B]">No health score yet</p>
              </div>
            )}
          </div>
        </FadeIn>
      </div>

      {/* Bottom row: Active Tasks + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Tasks */}
        <FadeIn delay={160}>
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#F8FAFC]">Active Tasks</h3>
              <span className="text-xs text-[#64748B]">{activeTasks.length} active</span>
            </div>

            {activeTasks.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <CheckCircle2 size={32} className="text-[#64748B]" />
                <p className="text-sm text-[#64748B]">All tasks completed</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeTasks.slice(0, 8).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.02]"
                  >
                    <PriorityIndicator priority={task.priority} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#F8FAFC] truncate">{task.title}</p>
                    </div>
                    <StatusBadge status={task.status} />
                    <PlatformBadge platform={task.assigned_platform} />
                    <span className="text-[10px] text-[#64748B] whitespace-nowrap hidden sm:inline">
                      {formatTimeAgo(task.created_at)}
                    </span>
                  </div>
                ))}
                {activeTasks.length > 8 && (
                  <p className="text-xs text-[#64748B] text-center pt-2">
                    +{activeTasks.length - 8} more
                  </p>
                )}
              </div>
            )}
          </div>
        </FadeIn>

        {/* Recent Activity Feed */}
        <FadeIn delay={240}>
          <div className={cardClass}>
            <h3 className="text-lg font-semibold text-[#F8FAFC] mb-4">
              Recent Activity
            </h3>

            {activityFeed.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Activity size={32} className="text-[#64748B]" />
                <p className="text-sm text-[#64748B]">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activityFeed.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.02]"
                    >
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04] mt-0.5">
                        <Icon size={14} className={item.iconColor} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#F8FAFC] truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.type === 'task' ? (
                            <StatusBadge status={item.status} />
                          ) : (
                            <MessageTypeBadge type={item.status} />
                          )}
                          <span className="text-[10px] text-[#64748B]">
                            {formatTimeAgo(item.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </FadeIn>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Tasks                                                         */
/* ------------------------------------------------------------------ */

function TasksTab({ tasks }: { tasks: CommandCenterTask[] }) {
  return (
    <FadeIn delay={0}>
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#F8FAFC]">All Tasks</h3>
          <span className="text-xs text-[#64748B]">{tasks.length} total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[rgba(148,163,184,0.1)]">
                <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Task
                </th>
                <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B] hidden sm:table-cell">
                  Type
                </th>
                <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B] hidden md:table-cell">
                  Platform
                </th>
                <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Status
                </th>
                <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B] hidden lg:table-cell">
                  Priority
                </th>
                <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B] hidden md:table-cell">
                  Created
                </th>
                <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B] hidden lg:table-cell">
                  Completed
                </th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ListTodo size={32} className="text-[#64748B]" />
                      <p className="text-sm text-[#64748B]">No tasks yet</p>
                      <p className="text-xs text-[#475569]">
                        Tasks will appear here as they are created
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="group border-b border-[rgba(148,163,184,0.05)] transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="py-3 pr-4">
                      <span className="text-sm text-[#F8FAFC] truncate block max-w-[250px]">
                        {task.title}
                      </span>
                      {task.description && (
                        <span className="text-[10px] text-[#64748B] truncate block max-w-[250px]">
                          {task.description}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 hidden sm:table-cell">
                      <span className="text-xs text-[#94A3B8] capitalize">
                        {task.task_type?.replace(/_/g, ' ') || '--'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 hidden md:table-cell">
                      <PlatformBadge platform={task.assigned_platform} />
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="py-3 pr-4 hidden lg:table-cell">
                      <PriorityIndicator priority={task.priority} />
                    </td>
                    <td className="py-3 pr-4 hidden md:table-cell">
                      <span className="text-xs text-[#64748B] whitespace-nowrap">
                        {formatTimeAgo(task.created_at)}
                      </span>
                    </td>
                    <td className="py-3 hidden lg:table-cell">
                      <span className="text-xs text-[#64748B] whitespace-nowrap">
                        {task.completed_at ? formatTimeAgo(task.completed_at) : '--'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </FadeIn>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Health                                                        */
/* ------------------------------------------------------------------ */

function HealthTab({
  healthScores,
  loading,
}: {
  healthScores: HealthScore[]
  loading: boolean
}) {
  const latestScore = healthScores[0] || null

  return (
    <div className="space-y-6">
      {/* Current Alerts */}
      <FadeIn delay={0}>
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-red-400" />
            <h3 className="text-lg font-semibold text-[#F8FAFC]">Current Alerts</h3>
          </div>

          {latestScore?.alerts && latestScore.alerts.length > 0 ? (
            <div className="space-y-2">
              {latestScore.alerts.map((alert, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg bg-red-500/5 border border-red-500/10 px-4 py-3"
                >
                  <AlertTriangle
                    size={14}
                    className="text-red-400 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-sm text-[#F8FAFC]">{alert}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-4">
              <CheckCircle2 size={16} className="text-green-400" />
              <p className="text-sm text-[#94A3B8]">No active alerts</p>
            </div>
          )}
        </div>
      </FadeIn>

      {/* Recommendations */}
      <FadeIn delay={80}>
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={16} className="text-amber-400" />
            <h3 className="text-lg font-semibold text-[#F8FAFC]">Recommendations</h3>
          </div>

          {latestScore?.recommendations && latestScore.recommendations.length > 0 ? (
            <div className="space-y-2">
              {latestScore.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg bg-amber-500/5 border border-amber-500/10 px-4 py-3"
                >
                  <Lightbulb
                    size={14}
                    className="text-amber-400 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-sm text-[#F8FAFC]">{rec}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-4">
              <CheckCircle2 size={16} className="text-green-400" />
              <p className="text-sm text-[#94A3B8]">No recommendations at this time</p>
            </div>
          )}
        </div>
      </FadeIn>

      {/* Score History */}
      <FadeIn delay={160}>
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#F8FAFC]">
              Health Score History
            </h3>
            <span className="text-xs text-[#64748B]">Last 30 entries</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2DD4BF] border-t-transparent" />
            </div>
          ) : healthScores.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Heart size={32} className="text-[#64748B]" />
              <p className="text-sm text-[#64748B]">No health score history</p>
            </div>
          ) : (
            <div className="space-y-0">
              {/* Header row */}
              <div className="grid grid-cols-6 gap-2 pb-2 border-b border-[rgba(148,163,184,0.1)]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Date
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Overall
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] hidden sm:block">
                  Call Vol.
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] hidden sm:block">
                  Response
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] hidden md:block">
                  Prompts
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Alerts
                </span>
              </div>

              {healthScores.map((score, idx) => {
                // Determine trend from previous score
                const prevScore = healthScores[idx + 1]
                let TrendIcon = Minus
                let trendColor = 'text-[#64748B]'
                if (prevScore) {
                  if (score.overall_score > prevScore.overall_score) {
                    TrendIcon = TrendingUp
                    trendColor = 'text-green-400'
                  } else if (score.overall_score < prevScore.overall_score) {
                    TrendIcon = TrendingDown
                    trendColor = 'text-red-400'
                  }
                }

                return (
                  <div
                    key={score.id}
                    className="grid grid-cols-6 gap-2 py-2.5 border-b border-[rgba(148,163,184,0.05)] transition-colors hover:bg-white/[0.02]"
                  >
                    <span className="text-xs text-[#94A3B8]">
                      {formatDate(score.score_date)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-sm font-bold ${getScoreColor(score.overall_score)}`}
                      >
                        {score.overall_score}
                      </span>
                      <TrendIcon size={12} className={trendColor} />
                    </div>
                    <span className="text-xs text-[#94A3B8] hidden sm:block">
                      {score.call_volume_score ?? '--'}
                    </span>
                    <span className="text-xs text-[#94A3B8] hidden sm:block">
                      {score.response_quality_score ?? '--'}
                    </span>
                    <span className="text-xs text-[#94A3B8] hidden md:block">
                      {score.prompt_health_score ?? '--'}
                    </span>
                    <span className="text-xs text-[#94A3B8]">
                      {score.alerts?.length || 0}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Messages                                                      */
/* ------------------------------------------------------------------ */

function MessagesTab({ messages }: { messages: AgentMessage[] }) {
  if (messages.length === 0) {
    return (
      <FadeIn delay={0}>
        <div className={cardClass}>
          <div className="flex flex-col items-center gap-3 py-12">
            <MessageSquare size={40} className="text-[#64748B]" />
            <p className="text-sm text-[#64748B]">No agent messages yet</p>
            <p className="text-xs text-[#475569]">
              Messages between platforms will appear here
            </p>
          </div>
        </div>
      </FadeIn>
    )
  }

  // Group messages by task_id (or 'unlinked' for messages without a task)
  const grouped: Record<string, AgentMessage[]> = {}
  messages.forEach((msg) => {
    const key = msg.task_id || 'unlinked'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(msg)
  })

  const threadKeys = Object.keys(grouped).sort((a, b) => {
    // Sort threads by most recent message
    const aLatest = grouped[a][0]?.created_at || ''
    const bLatest = grouped[b][0]?.created_at || ''
    return new Date(bLatest).getTime() - new Date(aLatest).getTime()
  })

  return (
    <div className="space-y-4">
      {threadKeys.map((threadKey, idx) => {
        const threadMessages = grouped[threadKey]
        const isUnlinked = threadKey === 'unlinked'
        return (
          <FadeIn key={threadKey} delay={idx * 60}>
            <div className={cardClass}>
              {/* Thread header */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[rgba(148,163,184,0.1)]">
                <FileText size={14} className="text-[#64748B]" />
                <span className="text-xs font-semibold text-[#94A3B8]">
                  {isUnlinked
                    ? 'General Messages'
                    : `Thread: ${threadKey.slice(0, 8)}...`}
                </span>
                <span className="text-[10px] text-[#64748B]">
                  {threadMessages.length} message
                  {threadMessages.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Messages in thread */}
              <div className="space-y-3">
                {threadMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-lg bg-white/[0.02] border border-[rgba(148,163,184,0.05)] px-4 py-3"
                  >
                    {/* Message header */}
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      <PlatformBadge platform={msg.from_platform} />
                      <ArrowRight size={12} className="text-[#64748B]" />
                      <PlatformBadge platform={msg.to_platform} />
                      <MessageTypeBadge type={msg.message_type} />
                      <StatusBadge status={msg.status} />
                      <span className="text-[10px] text-[#64748B] ml-auto whitespace-nowrap">
                        {formatTimeAgo(msg.created_at)}
                      </span>
                    </div>

                    {/* Subject */}
                    {msg.subject && (
                      <p className="text-sm font-semibold text-[#F8FAFC] mb-1">
                        {msg.subject}
                      </p>
                    )}

                    {/* Body */}
                    <p className="text-sm text-[#94A3B8] whitespace-pre-wrap leading-relaxed">
                      {msg.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ClientWorkspacePage() {
  const params = useParams()
  const orgId = params.orgId as string

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<OrgDetails | null>(null)
  const [latestHealth, setLatestHealth] = useState<HealthScore | null>(null)
  const [messages, setMessages] = useState<AgentMessage[]>([])

  // Realtime tasks for this org
  const { tasks, connected } = useCommandCenterRealtime({ organizationId: orgId })

  // Health score history (loaded on-demand for the Health tab)
  const [healthScores, setHealthScores] = useState<HealthScore[]>([])
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthLoaded, setHealthLoaded] = useState(false)

  // Fetch org workspace data
  useEffect(() => {
    if (!orgId) return
    setLoading(true)

    fetch(`/api/command-center/orgs/${orgId}`)
      .then((r) => r.json())
      .then((data) => {
        setOrg(data.org || null)
        setLatestHealth(data.healthScore || null)
        setMessages(data.messages || [])
      })
      .catch((err) => {
        console.error('Failed to fetch org workspace:', err)
      })
      .finally(() => setLoading(false))
  }, [orgId])

  // Lazy-load health history when Health tab is selected
  useEffect(() => {
    if (activeTab !== 'health' || healthLoaded || !orgId) return
    setHealthLoading(true)

    fetch(`/api/command-center/orgs/${orgId}/health`)
      .then((r) => r.json())
      .then((data) => {
        setHealthScores(data.scores || [])
        setHealthLoaded(true)
      })
      .catch((err) => {
        console.error('Failed to fetch health scores:', err)
      })
      .finally(() => setHealthLoading(false))
  }, [activeTab, healthLoaded, orgId])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2DD4BF] border-t-transparent" />
          <span className="text-[#94A3B8] text-sm">Loading workspace...</span>
        </div>
      </div>
    )
  }

  // Not found state
  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle size={40} className="text-[#64748B]" />
        <p className="text-[#94A3B8] text-sm">Organization not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
            {org.name}
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Client workspace and operational overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`}
          />
          <span className="text-xs text-[#64748B]">
            {connected ? 'Live' : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[rgba(148,163,184,0.1)] overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 ${
                isActive
                  ? 'border-[#2DD4BF] text-[#2DD4BF]'
                  : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[rgba(148,163,184,0.2)]'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {tab.key === 'tasks' && tasks.length > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#2DD4BF]/20 px-1.5 text-[10px] font-bold text-[#2DD4BF]">
                  {tasks.length}
                </span>
              )}
              {tab.key === 'messages' && messages.length > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500/20 px-1.5 text-[10px] font-bold text-blue-400">
                  {messages.length}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          org={org}
          healthScore={latestHealth}
          tasks={tasks}
          messages={messages}
        />
      )}

      {activeTab === 'tasks' && <TasksTab tasks={tasks} />}

      {activeTab === 'health' && (
        <HealthTab healthScores={healthScores} loading={healthLoading} />
      )}

      {activeTab === 'messages' && <MessagesTab messages={messages} />}
    </div>
  )
}
