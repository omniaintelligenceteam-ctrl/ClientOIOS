'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ListTodo,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Server,
  Terminal,
  Users,
  ArrowUpRight,
  Circle,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useCommandCenterRealtime, type CommandCenterTask } from '@/hooks/useCommandCenterRealtime'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const cardClass = 'premium-card rounded-xl p-6'

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-slate-500/20', text: 'text-slate-300', label: 'Pending' },
  assigned: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Assigned' },
  in_progress: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'In Progress' },
  awaiting_approval: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Awaiting Approval' },
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

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                      */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  animDelay,
}: {
  label: string
  value: number
  icon: React.ElementType
  iconColor: string
  animDelay: number
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
        {value}
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_COLORS[status] || STATUS_COLORS.pending
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
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

function PriorityIndicator({ priority }: { priority: string }) {
  const style = PRIORITY_COLORS[priority] || PRIORITY_COLORS.normal
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      <span className="text-xs text-[#94A3B8]">{style.label}</span>
    </div>
  )
}

function PlatformStatusCard({
  name,
  icon: Icon,
  iconColor,
  taskCount,
}: {
  name: string
  icon: React.ElementType
  iconColor: string
  taskCount: number
}) {
  return (
    <div className={cardClass}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconColor}/10`}>
          <Icon size={16} className={iconColor} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#F8FAFC]">{name}</p>
          <div className="flex items-center gap-1.5">
            <Circle size={6} className="text-green-400 fill-green-400" />
            <span className="text-[10px] text-[#64748B]">Online</span>
          </div>
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-[#F8FAFC]">{taskCount}</span>
        <span className="text-xs text-[#94A3B8]">active tasks</span>
      </div>
    </div>
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

function getOrgName(task: CommandCenterTask, orgMap: Record<string, string>): string {
  if (task.organization && typeof task.organization === 'object') {
    return (task.organization as any).name || orgMap[task.organization_id] || 'Unknown'
  }
  return orgMap[task.organization_id] || 'Unknown'
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CommandCenterDashboardPage() {
  const { tasks, connected, taskCounts } = useCommandCenterRealtime({})
  const [completedToday, setCompletedToday] = useState(0)
  const [escalationCount, setEscalationCount] = useState(0)
  const [orgMap, setOrgMap] = useState<Record<string, string>>({})
  const [platformCounts, setPlatformCounts] = useState<Record<string, number>>({
    openclaw: 0,
    'claude-code': 0,
    'claude-cowork': 0,
  })

  // Fetch org names for lookup
  useEffect(() => {
    fetch('/api/command-center/orgs')
      .then(r => r.json())
      .then(({ orgs }) => {
        const map: Record<string, string> = {}
        orgs?.forEach((o: { id: string; name: string }) => { map[o.id] = o.name })
        setOrgMap(map)
      })
      .catch(() => {})
  }, [])

  // Compute derived stats when tasks change
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]

    // Completed today
    const doneToday = tasks.filter(
      (t) => t.status === 'completed' && t.completed_at && t.completed_at.startsWith(today)
    ).length
    setCompletedToday(doneToday)

    // Escalations: urgent priority or task_type=escalation, not completed/failed
    const escalations = tasks.filter(
      (t) =>
        (t.priority === 'urgent' || t.task_type === 'escalation') &&
        t.status !== 'completed' &&
        t.status !== 'failed'
    ).length
    setEscalationCount(escalations)

    // Platform counts (active tasks only)
    const pCounts: Record<string, number> = {
      openclaw: 0,
      'claude-code': 0,
      'claude-cowork': 0,
    }
    tasks.forEach((t) => {
      if (
        t.assigned_platform &&
        t.assigned_platform in pCounts &&
        ['pending', 'assigned', 'in_progress', 'awaiting_approval'].includes(t.status)
      ) {
        pCounts[t.assigned_platform] += 1
      }
    })
    setPlatformCounts(pCounts)
  }, [tasks])

  const activeTasks = taskCounts.pending + taskCounts.in_progress
  const recentTasks = tasks.slice(0, 20)

  return (
    <div className="animate-page-enter space-y-6">
      {/* Header */}
      <div className="premium-card flex items-center justify-between rounded-xl p-5">
        <div>
          <p className="premium-kicker mb-1">Network Operations</p>
          <h1 className="gradient-text text-2xl font-bold tracking-tight">
            Command Center Overview
          </h1>
          <p className="mt-1 text-sm text-[#a6b4cf]">
            Real-time task management across all platforms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`}
          />
            <span className="text-xs text-[#6f7f9d]">
              {connected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Tasks"
          value={activeTasks}
          icon={ListTodo}
          iconColor="text-[#2DD4BF]"
          animDelay={0}
        />
        <StatCard
          label="Awaiting Approval"
          value={taskCounts.awaiting_approval}
          icon={Clock}
          iconColor="text-orange-400"
          animDelay={80}
        />
        <StatCard
          label="Completed Today"
          value={completedToday}
          icon={CheckCircle2}
          iconColor="text-green-400"
          animDelay={160}
        />
        <StatCard
          label="Escalations"
          value={escalationCount}
          icon={AlertTriangle}
          iconColor="text-red-400"
          animDelay={240}
        />
      </div>

      {/* Recent Tasks Table */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#F8FAFC]">Recent Tasks</h2>
          <span className="text-xs text-[#64748B]">{tasks.length} total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[rgba(148,163,184,0.1)]">
                <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Client
                </th>
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
              </tr>
            </thead>
            <tbody>
              {recentTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ListTodo size={32} className="text-[#64748B]" />
                      <p className="text-sm text-[#64748B]">No tasks yet</p>
                      <p className="text-xs text-[#475569]">
                        Tasks from OpenClaw, Claude Code, and Cowork will appear here
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                recentTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="group border-b border-[rgba(148,163,184,0.05)] transition-colors hover:bg-white/[0.02] cursor-pointer"
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/command-center/${task.organization_id}`}
                        className="flex items-center gap-1.5 text-sm text-[#F8FAFC] hover:text-[#2DD4BF] transition-colors"
                      >
                        <span className="truncate max-w-[120px]">{getOrgName(task, orgMap)}</span>
                        <ArrowUpRight
                          size={12}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[#2DD4BF]"
                        />
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm text-[#F8FAFC] truncate block max-w-[200px]">
                        {task.title}
                      </span>
                      {task.description && (
                        <span className="text-[10px] text-[#64748B] truncate block max-w-[200px]">
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
                    <td className="py-3 hidden md:table-cell">
                      <span className="text-xs text-[#64748B] whitespace-nowrap">
                        {formatTimeAgo(task.created_at)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Platform Status */}
      <div>
        <h2 className="text-lg font-semibold text-[#F8FAFC] mb-4">Platform Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PlatformStatusCard
            name="OpenClaw"
            icon={Server}
            iconColor="text-purple-400"
            taskCount={platformCounts.openclaw}
          />
          <PlatformStatusCard
            name="Claude Code"
            icon={Terminal}
            iconColor="text-[#2DD4BF]"
            taskCount={platformCounts['claude-code']}
          />
          <PlatformStatusCard
            name="Cowork"
            icon={Users}
            iconColor="text-blue-400"
            taskCount={platformCounts['claude-cowork']}
          />
        </div>
      </div>
    </div>
  )
}
