'use client'

import { useState, useEffect } from 'react'
import {
  Zap,
  CheckCircle2,
  TrendingUp,
  Activity,
  ToggleLeft,
  ToggleRight,
  Clock,
  Mail,
  MessageSquare,
  UserCheck,
  AlertTriangle,
  Star,
  FileText,
} from 'lucide-react'
import type { AutomationRuleDraft } from './rule-builder'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ActivityEntry {
  id: string
  ruleName: string
  actionType: string
  targetName: string
  result: 'success' | 'failed' | 'pending'
  timestamp: string
}

/* ------------------------------------------------------------------ */
/*  Demo data                                                           */
/* ------------------------------------------------------------------ */

const DEMO_ACTIVITY: ActivityEntry[] = [
  {
    id: '1',
    ruleName: 'Welcome New Lead',
    actionType: 'send_email',
    targetName: 'Marcus Johnson',
    result: 'success',
    timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
  },
  {
    id: '2',
    ruleName: 'Escalate Negative Calls',
    actionType: 'alert_owner',
    targetName: 'Call #2847',
    result: 'success',
    timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
  },
  {
    id: '3',
    ruleName: 'Follow Up Stale Leads',
    actionType: 'send_email',
    targetName: 'Sarah Chen',
    result: 'failed',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: '4',
    ruleName: 'Invoice Reminder',
    actionType: 'send_sms',
    targetName: 'Invoice #INV-0091',
    result: 'success',
    timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: '5',
    ruleName: 'Review Request After Job',
    actionType: 'request_review',
    targetName: 'David Martinez',
    result: 'success',
    timestamp: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
]

const ACTION_ICONS: Record<string, React.ElementType> = {
  send_email: Mail,
  send_sms: MessageSquare,
  assign_to: UserCheck,
  change_status: Activity,
  create_task: FileText,
  alert_owner: AlertTriangle,
  request_review: Star,
}

const ACTION_LABELS: Record<string, string> = {
  send_email: 'Email sent',
  send_sms: 'SMS sent',
  assign_to: 'Assigned',
  change_status: 'Status changed',
  create_task: 'Task created',
  alert_owner: 'Owner alerted',
  request_review: 'Review requested',
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
  sub?: string
}) {
  return (
    <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          <Icon size={15} />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-100">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Rule row                                                            */
/* ------------------------------------------------------------------ */

function RuleRow({
  rule,
  onToggle,
}: {
  rule: AutomationRuleDraft
  onToggle: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[rgba(148,163,184,0.07)] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200 truncate">{rule.name}</span>
          {rule.enabled && (
            <span className="flex-shrink-0 text-xs text-teal-400 bg-teal-400/10 rounded-full px-2 py-0.5">
              Active
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          Trigger: {rule.trigger.replace(/_/g, ' ')} · {rule.actions.length} action
          {rule.actions.length !== 1 ? 's' : ''}
        </p>
      </div>
      <button
        onClick={() => onToggle(rule.id)}
        className="flex-shrink-0 text-slate-400 hover:text-teal-400 transition-colors"
      >
        {rule.enabled ? (
          <ToggleRight size={22} className="text-teal-400" />
        ) : (
          <ToggleLeft size={22} />
        )}
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Activity row                                                        */
/* ------------------------------------------------------------------ */

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const Icon = ACTION_ICONS[entry.actionType] ?? Activity
  const label = ACTION_LABELS[entry.actionType] ?? entry.actionType

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[rgba(148,163,184,0.07)] last:border-0">
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
          entry.result === 'success'
            ? 'bg-green-400/10 text-green-400'
            : entry.result === 'failed'
            ? 'bg-red-400/10 text-red-400'
            : 'bg-slate-700/40 text-slate-400'
        }`}
      >
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 truncate">
          <span className="text-slate-400">{entry.ruleName}</span> · {label}
        </p>
        <p className="text-xs text-slate-500 truncate">{entry.targetName}</p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-1 text-xs text-slate-500">
        <Clock size={11} />
        {relativeTime(entry.timestamp)}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

export function AutomationDashboard() {
  const [rules, setRules] = useState<AutomationRuleDraft[]>([])

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('automation_rules') ?? '[]') as AutomationRuleDraft[]
    setRules(stored)
  }, [])

  function toggleRule(id: string) {
    setRules((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
      localStorage.setItem('automation_rules', JSON.stringify(updated))
      return updated
    })
  }

  const totalRules = rules.length
  const activeRules = rules.filter((r) => r.enabled).length
  const triggeredToday = DEMO_ACTIVITY.length
  const successRate = DEMO_ACTIVITY.length
    ? Math.round((DEMO_ACTIVITY.filter((a) => a.result === 'success').length / DEMO_ACTIVITY.length) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Rules"
          value={totalRules}
          icon={Zap}
          color="bg-slate-700/60 text-slate-400"
        />
        <StatCard
          label="Active Rules"
          value={activeRules}
          icon={CheckCircle2}
          color="bg-teal-400/10 text-teal-400"
          sub={totalRules > 0 ? `${Math.round((activeRules / totalRules) * 100)}% of total` : undefined}
        />
        <StatCard
          label="Triggered Today"
          value={triggeredToday}
          icon={Activity}
          color="bg-blue-400/10 text-blue-400"
        />
        <StatCard
          label="Success Rate"
          value={`${successRate}%`}
          icon={TrendingUp}
          color="bg-green-400/10 text-green-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Rules */}
        <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">My Rules</h3>
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Zap size={24} className="text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">No rules yet</p>
              <p className="text-xs text-slate-600 mt-1">Build a rule or activate a template</p>
            </div>
          ) : (
            <div>
              {rules.map((rule) => (
                <RuleRow key={rule.id} rule={rule} onToggle={toggleRule} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Recent Activity</h3>
          <div>
            {DEMO_ACTIVITY.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
