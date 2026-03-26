'use client'

import { useEffect, useState } from 'react'
import {
  Route,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  ToggleLeft,
  ToggleRight,
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

interface RoutingRule {
  task_type: string
  target_platform: string
  target_agent: string | null
  requires_approval: boolean
  enabled: boolean
}

interface CronSchedule {
  name: string
  schedule: string
  task_type: string
  enabled: boolean
}

const DEFAULT_ROUTING_RULES: RoutingRule[] = [
  { task_type: 'health_check', target_platform: 'openclaw', target_agent: 'haven', requires_approval: false, enabled: true },
  { task_type: 'prompt_update', target_platform: 'claude-code', target_agent: null, requires_approval: true, enabled: true },
  { task_type: 'report', target_platform: 'claude-cowork', target_agent: null, requires_approval: false, enabled: true },
  { task_type: 'outreach', target_platform: 'openclaw', target_agent: 'hunter', requires_approval: true, enabled: true },
  { task_type: 'monitoring', target_platform: 'openclaw', target_agent: 'pulse', requires_approval: false, enabled: true },
  { task_type: 'content', target_platform: 'claude-cowork', target_agent: null, requires_approval: true, enabled: true },
  { task_type: 'client_comms', target_platform: 'openclaw', target_agent: 'haven', requires_approval: true, enabled: true },
  { task_type: 'escalation', target_platform: 'wes', target_agent: null, requires_approval: false, enabled: true },
  { task_type: 'follow_up', target_platform: 'openclaw', target_agent: 'haven', requires_approval: false, enabled: true },
  { task_type: 'research', target_platform: 'claude-cowork', target_agent: null, requires_approval: false, enabled: true },
  { task_type: 'call_analysis', target_platform: 'claude-cowork', target_agent: null, requires_approval: false, enabled: true },
]

const DEFAULT_CRON_SCHEDULES: CronSchedule[] = [
  { name: 'Daily Health Check', schedule: 'Every day at 8:00 AM', task_type: 'health_check', enabled: true },
  { name: 'Weekly Performance Report', schedule: 'Monday at 9:00 AM', task_type: 'report', enabled: true },
  { name: 'Weekly Call Analysis', schedule: 'Friday at 4:00 PM', task_type: 'call_analysis', enabled: true },
]

/* ------------------------------------------------------------------ */
/*  Subcomponents                                                      */
/* ------------------------------------------------------------------ */

function PlatformBadge({ platform }: { platform: string }) {
  const style = PLATFORM_STYLES[platform] || { bg: 'bg-slate-500/20', text: 'text-slate-400', label: platform }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const [rules, setRules] = useState<RoutingRule[]>(DEFAULT_ROUTING_RULES)
  const [rulesSource, setRulesSource] = useState<'api' | 'default'>('default')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/command-center/settings/routing')
      .then((r) => {
        if (r.ok) return r.json()
        throw new Error('Not found')
      })
      .then(({ rules: apiRules }) => {
        if (apiRules && apiRules.length > 0) {
          setRules(apiRules)
          setRulesSource('api')
        }
      })
      .catch(() => {
        // API doesn't exist yet, using defaults
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
          Settings
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Task routing rules and client cron schedules
        </p>
      </div>

      {/* Task Routing Rules */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Route size={16} className="text-[#2DD4BF]" />
            <h2 className="text-lg font-semibold text-[#F8FAFC]">Task Routing Rules</h2>
          </div>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            rulesSource === 'api' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-300'
          }`}>
            {rulesSource === 'api' ? 'Live' : 'Defaults'}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2DD4BF] border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[rgba(148,163,184,0.1)]">
                  <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Task Type
                  </th>
                  <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Target Platform
                  </th>
                  <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B] hidden sm:table-cell">
                    Target Agent
                  </th>
                  <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Approval
                  </th>
                  <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                    Enabled
                  </th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr
                    key={rule.task_type}
                    className="border-b border-[rgba(148,163,184,0.05)] transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="py-3 pr-4">
                      <span className="text-sm text-[#F8FAFC] font-medium capitalize">
                        {rule.task_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <PlatformBadge platform={rule.target_platform} />
                    </td>
                    <td className="py-3 pr-4 hidden sm:table-cell">
                      {rule.target_agent ? (
                        <span className="text-xs text-[#F8FAFC] capitalize">{rule.target_agent}</span>
                      ) : (
                        <span className="text-xs text-[#64748B]">--</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {rule.requires_approval ? (
                        <div className="flex items-center gap-1.5">
                          <Shield size={12} className="text-orange-400" />
                          <span className="text-[10px] text-orange-400 font-semibold">Required</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-green-400" />
                          <span className="text-[10px] text-green-400 font-semibold">Auto</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      {rule.enabled ? (
                        <ToggleRight size={20} className="text-green-400" />
                      ) : (
                        <ToggleLeft size={20} className="text-[#64748B]" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Client Cron Schedules */}
      <div className={cardClass}>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-[#2DD4BF]" />
          <h2 className="text-lg font-semibold text-[#F8FAFC]">Client Cron Schedules</h2>
        </div>

        <p className="text-xs text-[#94A3B8] mb-4">
          Default scheduled tasks applied to each client organization
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[rgba(148,163,184,0.1)]">
                <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Name
                </th>
                <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Schedule
                </th>
                <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B] hidden sm:table-cell">
                  Task Type
                </th>
                <th className="pb-3 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Enabled
                </th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_CRON_SCHEDULES.map((cron) => (
                <tr
                  key={cron.name}
                  className="border-b border-[rgba(148,163,184,0.05)] transition-colors hover:bg-white/[0.02]"
                >
                  <td className="py-3 pr-4">
                    <span className="text-sm text-[#F8FAFC] font-medium">{cron.name}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs text-[#94A3B8]">{cron.schedule}</span>
                  </td>
                  <td className="py-3 pr-4 hidden sm:table-cell">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-500/20 text-slate-300 capitalize">
                      {cron.task_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3">
                    {cron.enabled ? (
                      <ToggleRight size={20} className="text-green-400" />
                    ) : (
                      <ToggleLeft size={20} className="text-[#64748B]" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
