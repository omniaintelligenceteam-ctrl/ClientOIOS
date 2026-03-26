'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  ListTodo,
  Heart,
  CheckCircle2,
  ArrowUpRight,
  Server,
  Terminal,
  Circle,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const cardClass = 'bg-[rgba(15,23,42,0.6)] border border-[rgba(148,163,184,0.1)] rounded-xl p-6'

const PLATFORM_STYLES: Record<string, { bg: string; text: string; label: string; barColor: string }> = {
  openclaw: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'OpenClaw', barColor: 'bg-purple-400' },
  'claude-code': { bg: 'bg-teal-500/20', text: 'text-teal-400', label: 'Claude Code', barColor: 'bg-teal-400' },
  'claude-cowork': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Cowork', barColor: 'bg-blue-400' },
  wes: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Wes', barColor: 'bg-amber-400' },
}

const ONBOARDING_STYLES: Record<string, { bg: string; text: string }> = {
  live: { bg: 'bg-green-500/20', text: 'text-green-400' },
  testing: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  configuring: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  pending: { bg: 'bg-slate-500/20', text: 'text-slate-300' },
  paused: { bg: 'bg-red-500/20', text: 'text-red-400' },
}

interface Org {
  id: string
  name: string
  tier: string
  onboarding_status: string
  healthScore: number
  activeTaskCount: number
}

interface Task {
  id: string
  organization_id: string
  title: string
  status: string
  assigned_platform: string | null
  assigned_agent: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  organization?: { id: string; name: string } | null
}

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                      */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  animDelay,
  suffix,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  iconColor: string
  animDelay: number
  suffix?: string
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), animDelay)
    return () => clearTimeout(t)
  }, [animDelay])

  return (
    <div className={cardClass}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-[#94A3B8]">{label}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconColor}/10`}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>
      <p
        className={`text-3xl font-bold text-[#F8FAFC] transition-all duration-700 ease-out ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        {value}{suffix && <span className="text-lg text-[#94A3B8] ml-0.5">{suffix}</span>}
      </p>
    </div>
  )
}

function PlatformBadge({ platform }: { platform: string | null }) {
  if (!platform) return <span className="text-[#64748B] text-xs">--</span>
  const style = PLATFORM_STYLES[platform] || { bg: 'bg-slate-500/20', text: 'text-slate-400', label: platform }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  )
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

function getHealthColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

function getHealthBarColor(score: number): string {
  if (score >= 80) return 'bg-green-400'
  if (score >= 50) return 'bg-yellow-400'
  return 'bg-red-400'
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PipelinePage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/command-center/orgs').then((r) => r.json()),
      fetch('/api/command-center/tasks?limit=100').then((r) => r.json()),
    ])
      .then(([orgsRes, tasksRes]) => {
        setOrgs(orgsRes.orgs || [])
        setTasks(tasksRes.tasks || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Computed stats
  const totalClients = orgs.length
  const activeTasks = tasks.filter(
    (t) => !['completed', 'failed'].includes(t.status)
  ).length
  const avgHealthScore =
    orgs.length > 0
      ? Math.round(orgs.reduce((sum, o) => sum + o.healthScore, 0) / orgs.length)
      : 0

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const completedThisWeek = tasks.filter(
    (t) => t.status === 'completed' && t.completed_at && t.completed_at >= oneWeekAgo
  ).length

  // Sorted orgs by health score ascending (worst first)
  const sortedOrgs = [...orgs].sort((a, b) => a.healthScore - b.healthScore)

  // Build org name map
  const orgMap: Record<string, string> = {}
  orgs.forEach((o) => { orgMap[o.id] = o.name })

  // Task distribution by platform
  const platformDistribution: Record<string, number> = {}
  tasks.forEach((t) => {
    const key = t.assigned_platform || 'unassigned'
    platformDistribution[key] = (platformDistribution[key] || 0) + 1
  })
  const maxPlatformCount = Math.max(...Object.values(platformDistribution), 1)

  // Recent completions
  const recentCompletions = tasks
    .filter((t) => t.status === 'completed')
    .slice(0, 10)

  // Active task counts per org (for the table)
  const orgActiveTaskCounts: Record<string, number> = {}
  tasks.forEach((t) => {
    if (!['completed', 'failed'].includes(t.status) && t.organization_id) {
      orgActiveTaskCounts[t.organization_id] = (orgActiveTaskCounts[t.organization_id] || 0) + 1
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          Pipeline Overview
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Cross-client pipeline view with health scores and task distribution
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2DD4BF] border-t-transparent" />
            <span className="text-[#94A3B8] text-sm">Loading pipeline data...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Clients"
              value={totalClients}
              icon={Users}
              iconColor="text-[#2DD4BF]"
              animDelay={0}
            />
            <StatCard
              label="Active Tasks"
              value={activeTasks}
              icon={ListTodo}
              iconColor="text-blue-400"
              animDelay={80}
            />
            <StatCard
              label="Avg Health Score"
              value={avgHealthScore}
              icon={Heart}
              iconColor="text-pink-400"
              animDelay={160}
            />
            <StatCard
              label="Completed This Week"
              value={completedThisWeek}
              icon={CheckCircle2}
              iconColor="text-green-400"
              animDelay={240}
            />
          </div>

          {/* Client Health Table */}
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#F8FAFC]">Client Health</h2>
              <span className="text-xs text-[#64748B]">{sortedOrgs.length} clients</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[rgba(148,163,184,0.1)]">
                    <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Client Name
                    </th>
                    <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Health Score
                    </th>
                    <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B] hidden sm:table-cell">
                      Active Tasks
                    </th>
                    <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B] hidden md:table-cell">
                      Onboarding
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOrgs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Users size={32} className="text-[#64748B]" />
                          <p className="text-sm text-[#64748B]">No clients yet</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedOrgs.map((org) => {
                      const onbStyle = ONBOARDING_STYLES[org.onboarding_status] || ONBOARDING_STYLES.pending
                      return (
                        <tr
                          key={org.id}
                          className="group border-b border-[rgba(148,163,184,0.05)] transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="py-3 pr-4">
                            <Link
                              href={`/command-center/${org.id}`}
                              className="flex items-center gap-1.5 text-sm text-[#F8FAFC] hover:text-[#2DD4BF] transition-colors"
                            >
                              <span className="truncate max-w-[180px]">{org.name}</span>
                              <ArrowUpRight
                                size={12}
                                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[#2DD4BF]"
                              />
                            </Link>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden max-w-[100px]">
                                <div
                                  className={`h-full rounded-full ${getHealthBarColor(org.healthScore)} transition-all duration-500`}
                                  style={{ width: `${org.healthScore}%` }}
                                />
                              </div>
                              <span className={`text-xs font-semibold ${getHealthColor(org.healthScore)} min-w-[28px] text-right`}>
                                {org.healthScore}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 hidden sm:table-cell">
                            <span className="text-sm text-[#F8FAFC]">
                              {orgActiveTaskCounts[org.id] || 0}
                            </span>
                          </td>
                          <td className="py-3 hidden md:table-cell">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${onbStyle.bg} ${onbStyle.text} capitalize`}>
                              {org.onboarding_status.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Task Distribution + Recent Completions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Task Distribution Chart */}
            <div className={cardClass}>
              <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Task Distribution</h2>

              {Object.keys(platformDistribution).length === 0 ? (
                <p className="text-xs text-[#64748B] py-4 text-center">No tasks to display</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(platformDistribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([platform, count]) => {
                      const style = PLATFORM_STYLES[platform]
                      const barColor = style?.barColor || 'bg-slate-400'
                      const label = style?.label || (platform === 'unassigned' ? 'Unassigned' : platform)
                      const pct = Math.round((count / maxPlatformCount) * 100)

                      return (
                        <div key={platform}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-[#F8FAFC]">{label}</span>
                            <span className="text-xs text-[#94A3B8]">{count} tasks</span>
                          </div>
                          <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColor} transition-all duration-700`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Recent Completions */}
            <div className={cardClass}>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={16} className="text-green-400" />
                <h2 className="text-lg font-semibold text-[#F8FAFC]">Recent Completions</h2>
              </div>

              {recentCompletions.length === 0 ? (
                <p className="text-xs text-[#64748B] py-4 text-center">No completed tasks yet</p>
              ) : (
                <div className="space-y-2">
                  {recentCompletions.map((task) => {
                    const orgName =
                      task.organization && typeof task.organization === 'object'
                        ? task.organization.name
                        : orgMap[task.organization_id] || 'Unknown'

                    return (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 rounded-lg px-3 py-2.5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#F8FAFC] truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-[#94A3B8] truncate">{orgName}</span>
                            <Circle size={3} className="text-[#64748B] flex-shrink-0" />
                            <PlatformBadge platform={task.assigned_platform} />
                          </div>
                        </div>
                        <span className="text-[10px] text-[#64748B] whitespace-nowrap flex-shrink-0">
                          {formatTimeAgo(task.completed_at || task.updated_at)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
