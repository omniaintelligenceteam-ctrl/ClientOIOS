'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Mail,
  Star,
  Receipt,
  Target,
  Calendar,
  ArrowLeft,
  Plus,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type ActionType =
  | 'follow_up_email'
  | 'review_request'
  | 'invoice_reminder'
  | 'lead_nurture'
  | 'appointment_reminder'

type Mode = 'auto' | 'approve'

interface AutomationRule {
  id: string
  organization_id: string
  action_type: ActionType
  enabled: boolean
  mode: Mode
  created_at: string
  updated_at: string
}

/* ------------------------------------------------------------------ */
/*  Static config                                                       */
/* ------------------------------------------------------------------ */

interface ActionConfig {
  label: string
  description: string
  icon: React.ElementType
}

const ACTION_CONFIGS: Record<ActionType, ActionConfig> = {
  follow_up_email: {
    label: 'Follow-Up Emails',
    description: 'Send thank-you emails after service completion',
    icon: Mail,
  },
  review_request: {
    label: 'Review Requests',
    description: 'Ask satisfied customers for Google reviews',
    icon: Star,
  },
  invoice_reminder: {
    label: 'Invoice Reminders',
    description: 'Remind customers about overdue payments',
    icon: Receipt,
  },
  lead_nurture: {
    label: 'Lead Nurture',
    description: 'Follow up with leads that haven\'t converted',
    icon: Target,
  },
  appointment_reminder: {
    label: 'Appointment Reminders',
    description: 'Remind customers about upcoming appointments',
    icon: Calendar,
  },
}

const ALL_ACTION_TYPES: ActionType[] = [
  'follow_up_email',
  'review_request',
  'invoice_reminder',
  'lead_nurture',
  'appointment_reminder',
]

/* ------------------------------------------------------------------ */
/*  Toggle component                                                    */
/* ------------------------------------------------------------------ */

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-[#111827] ${
        checked ? 'bg-teal-500' : 'bg-slate-600'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Automation card                                                     */
/* ------------------------------------------------------------------ */

interface AutomationCardProps {
  actionType: ActionType
  rule: AutomationRule | null
  onToggle: (id: string, enabled: boolean) => Promise<void>
  onModeChange: (id: string, mode: Mode) => Promise<void>
  onSetUp: (actionType: ActionType) => Promise<void>
  isLoading: boolean
}

function AutomationCard({
  actionType,
  rule,
  onToggle,
  onModeChange,
  onSetUp,
  isLoading,
}: AutomationCardProps) {
  const config = ACTION_CONFIGS[actionType]
  const Icon = config.icon

  const hasRule = rule !== null
  const isEnabled = hasRule && rule.enabled
  const mode: Mode = hasRule ? rule.mode : 'auto'

  return (
    <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
            isEnabled
              ? 'bg-teal-500/15 text-teal-400'
              : 'bg-slate-700/50 text-slate-500'
          }`}
        >
          <Icon size={22} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-200 leading-tight">
              {config.label}
            </h3>
            {hasRule && (
              <ToggleSwitch
                checked={rule.enabled}
                onChange={(val) => onToggle(rule.id, val)}
              />
            )}
          </div>
          <p className="mt-1 text-sm text-slate-400 leading-relaxed">
            {config.description}
          </p>
        </div>
      </div>

      {/* Footer */}
      {hasRule ? (
        <div className="flex flex-col gap-3">
          {/* Mode selector */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onModeChange(rule.id, 'auto')}
              disabled={!isEnabled || isLoading}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                mode === 'auto'
                  ? 'border-teal-500/50 bg-teal-500/10 text-teal-400'
                  : 'border-slate-700 bg-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => onModeChange(rule.id, 'approve')}
              disabled={!isEnabled || isLoading}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                mode === 'approve'
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  : 'border-slate-700 bg-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              Approve
            </button>
          </div>

          {/* Status badge */}
          {isEnabled ? (
            mode === 'auto' ? (
              <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-400">
                <CheckCircle size={12} />
                Runs automatically
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                <AlertCircle size={12} />
                Requires approval
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-slate-700/50 px-3 py-1 text-xs font-medium text-slate-500">
              Disabled
            </span>
          )}
        </div>
      ) : (
        /* No rule yet — show Set Up button */
        <button
          type="button"
          onClick={() => onSetUp(actionType)}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-transparent px-4 py-3 text-sm font-medium text-slate-400 transition-colors hover:border-teal-500/50 hover:text-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} />
          Set Up
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function AutomationsSettingsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Fetch rules on mount */
  useEffect(() => {
    const fetchRules = async () => {
      try {
        const res = await fetch('/api/automations/rules')
        if (!res.ok) throw new Error('Failed to load automation rules')
        const data: AutomationRule[] = await res.json()
        setRules(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchRules()
  }, [])

  /* Helper: patch a rule */
  const patchRule = useCallback(
    async (payload: { id: string; enabled?: boolean; mode?: Mode }) => {
      setActionLoading(true)
      try {
        const res = await fetch('/api/automations/rules', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to update rule')
        const updated: AutomationRule = await res.json()
        setRules((prev) =>
          prev.map((r) => (r.id === updated.id ? updated : r))
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Update failed')
      } finally {
        setActionLoading(false)
      }
    },
    []
  )

  const handleToggle = useCallback(
    (id: string, enabled: boolean) => patchRule({ id, enabled }),
    [patchRule]
  )

  const handleModeChange = useCallback(
    (id: string, mode: Mode) => patchRule({ id, mode }),
    [patchRule]
  )

  /* Create a new rule for an action_type */
  const handleSetUp = useCallback(async (actionType: ActionType) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/automations/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type: actionType }),
      })
      if (!res.ok) throw new Error('Failed to create rule')
      const created: AutomationRule = await res.json()
      setRules((prev) => [...prev, created])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
    } finally {
      setActionLoading(false)
    }
  }, [])

  /* Build a lookup map for quick access */
  const ruleByType: Record<string, AutomationRule> = {}
  for (const rule of rules) {
    ruleByType[rule.action_type] = rule
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
      >
        <ArrowLeft size={15} />
        Back to Settings
      </Link>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          Automation Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure which automations run on your account and how they behave.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ALL_ACTION_TYPES.map((type) => (
            <div
              key={type}
              className="h-52 animate-pulse rounded-2xl bg-white/[0.03]"
            />
          ))}
        </div>
      ) : (
        /* Automation cards grid */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ALL_ACTION_TYPES.map((actionType) => (
            <AutomationCard
              key={actionType}
              actionType={actionType}
              rule={ruleByType[actionType] ?? null}
              onToggle={handleToggle}
              onModeChange={handleModeChange}
              onSetUp={handleSetUp}
              isLoading={actionLoading}
            />
          ))}
        </div>
      )}
    </div>
  )
}
