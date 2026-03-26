'use client'

import { useState } from 'react'
import {
  Plus,
  Trash2,
  Zap,
  GitBranch,
  Play,
  ChevronDown,
  Eye,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type TriggerType =
  | 'new_lead'
  | 'call_completed'
  | 'invoice_overdue'
  | 'appointment_no_show'
  | 'lead_score_change'
  | 'review_received'

export type ConditionField =
  | 'lead_score'
  | 'status'
  | 'days_since_contact'
  | 'sentiment'
  | 'amount'

export type ConditionOperator = 'gt' | 'lt' | 'eq' | 'gte' | 'lte'

export type ActionType =
  | 'send_email'
  | 'send_sms'
  | 'assign_to'
  | 'change_status'
  | 'create_task'
  | 'alert_owner'
  | 'request_review'

export interface Condition {
  id: string
  field: ConditionField
  operator: ConditionOperator
  value: string
}

export interface RuleAction {
  id: string
  type: ActionType
  config: Record<string, string>
}

export interface AutomationRuleDraft {
  id: string
  name: string
  trigger: TriggerType
  conditions: Condition[]
  actions: RuleAction[]
  enabled: boolean
}

/* ------------------------------------------------------------------ */
/*  Config maps                                                         */
/* ------------------------------------------------------------------ */

const TRIGGER_LABELS: Record<TriggerType, string> = {
  new_lead: 'New Lead',
  call_completed: 'Call Completed',
  invoice_overdue: 'Invoice Overdue',
  appointment_no_show: 'Appointment No-Show',
  lead_score_change: 'Lead Score Change',
  review_received: 'Review Received',
}

const CONDITION_FIELD_LABELS: Record<ConditionField, string> = {
  lead_score: 'Lead Score',
  status: 'Status',
  days_since_contact: 'Days Since Contact',
  sentiment: 'Sentiment',
  amount: 'Amount ($)',
}

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  eq: '=',
}

const ACTION_LABELS: Record<ActionType, string> = {
  send_email: 'Send Email',
  send_sms: 'Send SMS',
  assign_to: 'Assign To',
  change_status: 'Change Status',
  create_task: 'Create Task',
  alert_owner: 'Alert Owner',
  request_review: 'Request Review',
}

const ACTION_COLORS: Record<ActionType, string> = {
  send_email: 'text-blue-400',
  send_sms: 'text-green-400',
  assign_to: 'text-purple-400',
  change_status: 'text-yellow-400',
  create_task: 'text-orange-400',
  alert_owner: 'text-red-400',
  request_review: 'text-teal-400',
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function buildPreview(rule: AutomationRuleDraft): string {
  const triggerLabel = TRIGGER_LABELS[rule.trigger] ?? rule.trigger
  const conditionParts = rule.conditions.map((c) => {
    const field = CONDITION_FIELD_LABELS[c.field] ?? c.field
    const op = OPERATOR_LABELS[c.operator] ?? c.operator
    return `${field} ${op} ${c.value}`
  })
  const actionParts = rule.actions.map((a) => ACTION_LABELS[a.type] ?? a.type)

  let preview = `When a ${triggerLabel.toUpperCase()} arrives`
  if (conditionParts.length > 0) {
    preview += ` with ${conditionParts.join(' AND ')}`
  }
  if (actionParts.length > 0) {
    preview += ` → ${actionParts.join(', ').toUpperCase()}`
  }
  return preview
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function SelectField<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Select…',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  placeholder?: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full appearance-none bg-[#0B1120] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 pr-8 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50 cursor-pointer"
      >
        {!value && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
      />
    </div>
  )
}

function ConditionRow({
  condition,
  onUpdate,
  onRemove,
  isOnly,
}: {
  condition: Condition
  onUpdate: (c: Condition) => void
  onRemove: () => void
  isOnly: boolean
}) {
  const fieldOptions = (Object.keys(CONDITION_FIELD_LABELS) as ConditionField[]).map(
    (k) => ({ value: k, label: CONDITION_FIELD_LABELS[k] })
  )
  const operatorOptions = (Object.keys(OPERATOR_LABELS) as ConditionOperator[]).map(
    (k) => ({ value: k, label: OPERATOR_LABELS[k] })
  )

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 grid grid-cols-3 gap-2">
        <SelectField
          value={condition.field}
          onChange={(v) => onUpdate({ ...condition, field: v })}
          options={fieldOptions}
          placeholder="Field"
        />
        <SelectField
          value={condition.operator}
          onChange={(v) => onUpdate({ ...condition, operator: v })}
          options={operatorOptions}
          placeholder="Is"
        />
        {condition.field === 'sentiment' ? (
          <SelectField
            value={condition.value as 'positive' | 'neutral' | 'negative'}
            onChange={(v) => onUpdate({ ...condition, value: v })}
            options={[
              { value: 'positive', label: 'Positive' },
              { value: 'neutral', label: 'Neutral' },
              { value: 'negative', label: 'Negative' },
            ]}
            placeholder="Value"
          />
        ) : (
          <input
            type="text"
            value={condition.value}
            onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
            placeholder="Value"
            className="w-full bg-[#0B1120] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50"
          />
        )}
      </div>
      <button
        onClick={onRemove}
        disabled={isOnly}
        className="flex-shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function ActionRow({
  action,
  onUpdate,
  onRemove,
  isOnly,
}: {
  action: RuleAction
  onUpdate: (a: RuleAction) => void
  onRemove: () => void
  isOnly: boolean
}) {
  const actionOptions = (Object.keys(ACTION_LABELS) as ActionType[]).map((k) => ({
    value: k,
    label: ACTION_LABELS[k],
  }))

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 grid grid-cols-2 gap-2">
        <SelectField
          value={action.type}
          onChange={(v) => onUpdate({ ...action, type: v })}
          options={actionOptions}
          placeholder="Action"
        />
        {(action.type === 'send_email' || action.type === 'send_sms') && (
          <input
            type="text"
            value={action.config.template ?? ''}
            onChange={(e) =>
              onUpdate({ ...action, config: { ...action.config, template: e.target.value } })
            }
            placeholder="Template name"
            className="w-full bg-[#0B1120] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50"
          />
        )}
        {action.type === 'assign_to' && (
          <input
            type="text"
            value={action.config.assignee ?? ''}
            onChange={(e) =>
              onUpdate({ ...action, config: { ...action.config, assignee: e.target.value } })
            }
            placeholder="Team member name"
            className="w-full bg-[#0B1120] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50"
          />
        )}
        {action.type === 'change_status' && (
          <input
            type="text"
            value={action.config.status ?? ''}
            onChange={(e) =>
              onUpdate({ ...action, config: { ...action.config, status: e.target.value } })
            }
            placeholder="New status"
            className="w-full bg-[#0B1120] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50"
          />
        )}
        {action.type === 'create_task' && (
          <input
            type="text"
            value={action.config.task ?? ''}
            onChange={(e) =>
              onUpdate({ ...action, config: { ...action.config, task: e.target.value } })
            }
            placeholder="Task description"
            className="w-full bg-[#0B1120] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50"
          />
        )}
      </div>
      <button
        onClick={onRemove}
        disabled={isOnly}
        className="flex-shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

interface AutomationRuleBuilderProps {
  onSave?: (rule: AutomationRuleDraft) => void
  initialRule?: Partial<AutomationRuleDraft>
}

export function AutomationRuleBuilder({ onSave, initialRule }: AutomationRuleBuilderProps) {
  const [rule, setRule] = useState<AutomationRuleDraft>({
    id: uid(),
    name: initialRule?.name ?? '',
    trigger: initialRule?.trigger ?? 'new_lead',
    conditions: initialRule?.conditions ?? [
      { id: uid(), field: 'lead_score', operator: 'gt', value: '80' },
    ],
    actions: initialRule?.actions ?? [
      { id: uid(), type: 'send_email', config: { template: 'follow_up' } },
    ],
    enabled: initialRule?.enabled ?? true,
  })

  const [showPreview, setShowPreview] = useState(false)

  const triggerOptions = (Object.keys(TRIGGER_LABELS) as TriggerType[]).map((k) => ({
    value: k,
    label: TRIGGER_LABELS[k],
  }))

  function addCondition() {
    setRule((r) => ({
      ...r,
      conditions: [...r.conditions, { id: uid(), field: 'lead_score', operator: 'gt', value: '' }],
    }))
  }

  function removeCondition(id: string) {
    setRule((r) => ({ ...r, conditions: r.conditions.filter((c) => c.id !== id) }))
  }

  function updateCondition(updated: Condition) {
    setRule((r) => ({
      ...r,
      conditions: r.conditions.map((c) => (c.id === updated.id ? updated : c)),
    }))
  }

  function addAction() {
    setRule((r) => ({
      ...r,
      actions: [...r.actions, { id: uid(), type: 'send_email', config: {} }],
    }))
  }

  function removeAction(id: string) {
    setRule((r) => ({ ...r, actions: r.actions.filter((a) => a.id !== id) }))
  }

  function updateAction(updated: RuleAction) {
    setRule((r) => ({
      ...r,
      actions: r.actions.map((a) => (a.id === updated.id ? updated : a)),
    }))
  }

  const preview = buildPreview(rule)

  return (
    <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10">
          <GitBranch size={18} className="text-teal-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-slate-200">Rule Builder</h3>
          <p className="text-xs text-slate-500">Define your automation logic</p>
        </div>
      </div>

      {/* Rule name */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">Rule Name</label>
        <input
          type="text"
          value={rule.name}
          onChange={(e) => setRule((r) => ({ ...r, name: e.target.value }))}
          placeholder="e.g. Follow Up Hot Leads"
          className="w-full bg-[#0B1120] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50"
        />
      </div>

      {/* Trigger block */}
      <div className="bg-[#0B1120]/60 border border-[rgba(148,163,184,0.08)] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-500/20 text-teal-400 text-xs font-bold">IF</span>
          <span className="text-sm font-medium text-slate-300">Trigger</span>
        </div>
        <SelectField
          value={rule.trigger}
          onChange={(v) => setRule((r) => ({ ...r, trigger: v }))}
          options={triggerOptions}
          placeholder="Select trigger"
        />
      </div>

      {/* Conditions block */}
      <div className="bg-[#0B1120]/60 border border-[rgba(148,163,184,0.08)] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/20 text-blue-400 text-xs font-bold">AND</span>
            <span className="text-sm font-medium text-slate-300">Conditions</span>
          </div>
          <button
            onClick={addCondition}
            className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors"
          >
            <Plus size={13} />
            Add Condition
          </button>
        </div>
        <div className="space-y-2">
          {rule.conditions.map((c) => (
            <ConditionRow
              key={c.id}
              condition={c}
              onUpdate={updateCondition}
              onRemove={() => removeCondition(c.id)}
              isOnly={rule.conditions.length === 1}
            />
          ))}
        </div>
      </div>

      {/* Actions block */}
      <div className="bg-[#0B1120]/60 border border-[rgba(148,163,184,0.08)] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-500/20 text-orange-400 text-xs font-bold">→</span>
            <span className="text-sm font-medium text-slate-300">Actions</span>
          </div>
          <button
            onClick={addAction}
            className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors"
          >
            <Plus size={13} />
            Add Action
          </button>
        </div>
        <div className="space-y-2">
          {rule.actions.map((a) => (
            <ActionRow
              key={a.id}
              action={a}
              onUpdate={updateAction}
              onRemove={() => removeAction(a.id)}
              isOnly={rule.actions.length === 1}
            />
          ))}
        </div>
      </div>

      {/* Preview toggle */}
      <button
        onClick={() => setShowPreview((s) => !s)}
        className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
      >
        <Eye size={13} />
        {showPreview ? 'Hide' : 'Show'} preview
      </button>

      {showPreview && (
        <div className="rounded-xl bg-teal-500/5 border border-teal-500/20 p-4">
          <p className="text-xs font-mono text-teal-300 leading-relaxed">{preview}</p>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[rgba(148,163,184,0.07)]">
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={rule.enabled}
            onChange={(e) => setRule((r) => ({ ...r, enabled: e.target.checked }))}
            className="accent-teal-500"
          />
          Active
        </label>
        <button
          onClick={() => onSave?.(rule)}
          disabled={!rule.name || !rule.trigger || rule.actions.length === 0}
          className="flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-semibold text-[#0B1120] transition-colors"
        >
          <Play size={14} />
          Save Rule
        </button>
      </div>
    </div>
  )
}
