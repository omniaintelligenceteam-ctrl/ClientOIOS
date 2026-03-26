'use client'

import { useEffect, useState } from 'react'
import {
  Server,
  Terminal,
  Users,
  Circle,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const cardClass = 'bg-[rgba(15,23,42,0.6)] border border-[rgba(148,163,184,0.1)] rounded-xl p-6'

const PLATFORM_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  openclaw: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'OpenClaw' },
  'claude-code': { bg: 'bg-teal-500/20', text: 'text-teal-400', label: 'Claude Code' },
  'claude-cowork': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Cowork' },
  wes: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Wes' },
}

interface Agent {
  name: string
  role: string
}

interface PlatformDef {
  key: string
  name: string
  icon: React.ElementType
  iconColor: string
  agents: Agent[]
}

const PLATFORMS: PlatformDef[] = [
  {
    key: 'openclaw',
    name: 'OpenClaw',
    icon: Server,
    iconColor: 'text-purple-400',
    agents: [
      { name: 'G', role: 'Coordinator' },
      { name: 'Haven', role: 'Client Success' },
      { name: 'Hunter', role: 'Outbound Sales' },
      { name: 'Pulse', role: 'Monitoring' },
      { name: 'Sarah', role: 'Phone Agent' },
      { name: 'Echo', role: 'Analytics' },
      { name: 'Atlas', role: 'Onboarding' },
      { name: 'Sage', role: 'Strategy' },
      { name: 'Scribe', role: 'Content' },
      { name: 'Forge', role: 'Technical' },
    ],
  },
  {
    key: 'claude-code',
    name: 'Claude Code',
    icon: Terminal,
    iconColor: 'text-teal-400',
    agents: [
      { name: 'Claude Code', role: 'Full-stack development & DevOps' },
    ],
  },
  {
    key: 'claude-cowork',
    name: 'Cowork',
    icon: Users,
    iconColor: 'text-blue-400',
    agents: [
      { name: 'Claude Cowork', role: 'Research, reports & content strategy' },
    ],
  },
]

interface Task {
  id: string
  title: string
  status: string
  assigned_platform: string | null
  assigned_agent: string | null
  completed_at: string | null
  created_at: string
  organization?: { name: string } | null
}

interface AgentMessage {
  id: string
  from_platform: string
  from_agent: string | null
  to_platform: string
  to_agent: string | null
  message_type: string
  subject: string | null
  body: string | null
  status: string
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                      */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AgentsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/command-center/tasks?limit=10').then((r) => r.json()),
      fetch('/api/command-center/messages?limit=10').then((r) => r.json()),
    ])
      .then(([tasksRes, msgsRes]) => {
        setTasks(tasksRes.tasks || [])
        setMessages(msgsRes.messages || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          Agents Status
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          All AI platforms and their agents across the OIOS network
        </p>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon
          return (
            <div key={platform.key} className={cardClass}>
              {/* Platform header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${platform.iconColor}/10`}>
                  <Icon size={20} className={platform.iconColor} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#F8FAFC]">{platform.name}</p>
                  <div className="flex items-center gap-1.5">
                    <Circle size={6} className="text-green-400 fill-green-400" />
                    <span className="text-[10px] text-[#64748B]">Online</span>
                  </div>
                </div>
                <div className="ml-auto">
                  <span className="text-[10px] font-semibold text-[#94A3B8] bg-white/[0.04] rounded-full px-2 py-0.5">
                    {platform.agents.length} agent{platform.agents.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Agent list */}
              <div className="space-y-1.5">
                {platform.agents.map((agent) => (
                  <div
                    key={agent.name}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <span className="h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#F8FAFC] truncate">{agent.name}</p>
                      <p className="text-[10px] text-[#64748B] truncate">{agent.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Agent Activity + Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Agent Activity */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={16} className="text-green-400" />
            <h2 className="text-lg font-semibold text-[#F8FAFC]">Recent Agent Activity</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2DD4BF] border-t-transparent" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-xs text-[#64748B] py-4 text-center">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#F8FAFC] truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <PlatformBadge platform={task.assigned_platform} />
                      {task.assigned_agent && (
                        <span className="text-[10px] text-[#94A3B8]">{task.assigned_agent}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        task.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : task.status === 'in_progress'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : task.status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-slate-500/20 text-slate-300'
                      }`}
                    >
                      {task.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] text-[#64748B] mt-1">
                      {formatTimeAgo(task.completed_at || task.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Activity */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-[#F8FAFC]">Message Activity</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2DD4BF] border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-xs text-[#64748B] py-4 text-center">No recent messages</p>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#F8FAFC] truncate">
                      {msg.subject || msg.message_type.replace(/_/g, ' ')}
                    </p>
                    {msg.body && (
                      <p className="text-[10px] text-[#64748B] truncate mt-0.5">{msg.body}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <PlatformBadge platform={msg.from_platform} />
                      <ArrowRight size={10} className="text-[#64748B]" />
                      <PlatformBadge platform={msg.to_platform} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        msg.status === 'delivered'
                          ? 'bg-green-500/20 text-green-400'
                          : msg.status === 'read'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-slate-500/20 text-slate-300'
                      }`}
                    >
                      {msg.status}
                    </span>
                    <span className="text-[10px] text-[#64748B] mt-1">
                      {formatTimeAgo(msg.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
