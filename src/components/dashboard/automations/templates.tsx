'use client'

import { useState } from 'react'
import {
  Users,
  Star,
  PhoneCall,
  UserPlus,
  Receipt,
  CheckCircle2,
  Zap,
} from 'lucide-react'
import type { AutomationRuleDraft } from './rule-builder'

/* ------------------------------------------------------------------ */
/*  Template definitions                                                */
/* ------------------------------------------------------------------ */

interface TemplateDefinition {
  id: string
  name: string
  description: string
  triggerSummary: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  rule: Omit<AutomationRuleDraft, 'id' | 'enabled'>
}

const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'stale_leads',
    name: 'Follow Up Stale Leads',
    description: 'Automatically reach out to leads that haven\'t been contacted in 3+ days.',
    triggerSummary: 'When days_since_contact > 3 → Send Follow-Up Email',
    icon: Users,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-400/10',
    rule: {
      name: 'Follow Up Stale Leads',
      trigger: 'lead_score_change',
      conditions: [{ id: 'c1', field: 'days_since_contact', operator: 'gt', value: '3' }],
      actions: [{ id: 'a1', type: 'send_email', config: { template: 'stale_lead_followup' } }],
    },
  },
  {
    id: 'review_after_job',
    name: 'Review Request After Job',
    description: 'Send an automated text requesting a Google review after a completed appointment.',
    triggerSummary: 'When Appointment Complete → Send Review Request SMS',
    icon: Star,
    iconColor: 'text-yellow-400',
    iconBg: 'bg-yellow-400/10',
    rule: {
      name: 'Review Request After Job',
      trigger: 'appointment_no_show',
      conditions: [{ id: 'c1', field: 'status', operator: 'eq', value: 'completed' }],
      actions: [{ id: 'a1', type: 'request_review', config: { channel: 'sms' } }],
    },
  },
  {
    id: 'escalate_negative',
    name: 'Escalate Negative Calls',
    description: 'Instantly alert the owner when a call is flagged with negative sentiment.',
    triggerSummary: 'When Call Completed + sentiment = negative → Alert Owner',
    icon: PhoneCall,
    iconColor: 'text-red-400',
    iconBg: 'bg-red-400/10',
    rule: {
      name: 'Escalate Negative Calls',
      trigger: 'call_completed',
      conditions: [{ id: 'c1', field: 'sentiment', operator: 'eq', value: 'negative' }],
      actions: [{ id: 'a1', type: 'alert_owner', config: { priority: 'high' } }],
    },
  },
  {
    id: 'welcome_new_lead',
    name: 'Welcome New Lead',
    description: 'Send a personalized welcome email the moment a new lead enters the pipeline.',
    triggerSummary: 'When New Lead arrives → Send Welcome Email',
    icon: UserPlus,
    iconColor: 'text-teal-400',
    iconBg: 'bg-teal-400/10',
    rule: {
      name: 'Welcome New Lead',
      trigger: 'new_lead',
      conditions: [],
      actions: [{ id: 'a1', type: 'send_email', config: { template: 'welcome_lead' } }],
    },
  },
  {
    id: 'invoice_reminder',
    name: 'Invoice Reminder',
    description: 'Auto-remind customers 3 days before their invoice is due to reduce late payments.',
    triggerSummary: 'When Invoice due in 3 days → Send Reminder SMS',
    icon: Receipt,
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-400/10',
    rule: {
      name: 'Invoice Reminder',
      trigger: 'invoice_overdue',
      conditions: [{ id: 'c1', field: 'days_since_contact', operator: 'lte', value: '3' }],
      actions: [{ id: 'a1', type: 'send_sms', config: { template: 'invoice_due_reminder' } }],
    },
  },
]

/* ------------------------------------------------------------------ */
/*  Template Card                                                       */
/* ------------------------------------------------------------------ */

function TemplateCard({
  template,
  onActivate,
}: {
  template: TemplateDefinition
  onActivate: (t: TemplateDefinition) => void
}) {
  const [active, setActive] = useState(false)
  const [activating, setActivating] = useState(false)
  const Icon = template.icon

  async function handleToggle() {
    if (active) {
      setActive(false)
      return
    }
    setActivating(true)
    await new Promise((r) => setTimeout(r, 600))
    setActive(true)
    setActivating(false)
    onActivate(template)
  }

  return (
    <div
      className={`bg-[#111827] border rounded-2xl p-5 transition-all duration-200 ${
        active
          ? 'border-teal-500/40 shadow-[0_0_20px_rgba(45,212,191,0.05)]'
          : 'border-[rgba(148,163,184,0.1)] hover:border-[rgba(148,163,184,0.2)]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Icon + info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${template.iconBg}`}
          >
            <Icon size={18} className={template.iconColor} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-slate-200">{template.name}</h4>
              {active && (
                <span className="flex items-center gap-1 text-xs text-teal-400 bg-teal-400/10 rounded-full px-2 py-0.5">
                  <CheckCircle2 size={11} />
                  Active
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">{template.description}</p>
            <p className="mt-2 text-xs font-mono text-slate-500 bg-[#0B1120] rounded-lg px-2.5 py-1.5 truncate">
              {template.triggerSummary}
            </p>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={handleToggle}
          disabled={activating}
          className={`flex-shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
            activating
              ? 'bg-teal-500/20 text-teal-300 cursor-wait'
              : active
              ? 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20'
              : 'bg-[#0B1120] text-slate-400 hover:text-teal-400 hover:bg-teal-500/10 border border-[rgba(148,163,184,0.1)]'
          }`}
        >
          {activating ? (
            <>
              <div className="h-3 w-3 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
              Activating…
            </>
          ) : active ? (
            <>
              <Zap size={12} className="fill-teal-400" />
              Active
            </>
          ) : (
            <>
              <Zap size={12} />
              Activate
            </>
          )}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

interface AutomationTemplatesProps {
  onActivate?: (rule: Omit<AutomationRuleDraft, 'id' | 'enabled'>) => void
}

export function AutomationTemplates({ onActivate }: AutomationTemplatesProps) {
  function handleActivate(template: TemplateDefinition) {
    // Save to localStorage
    const stored = JSON.parse(localStorage.getItem('automation_rules') ?? '[]') as AutomationRuleDraft[]
    const exists = stored.some((r) => r.name === template.rule.name)
    if (!exists) {
      const newRule: AutomationRuleDraft = {
        ...template.rule,
        id: Math.random().toString(36).slice(2, 10),
        enabled: true,
        conditions: template.rule.conditions.map((c) => ({ ...c })),
        actions: template.rule.actions.map((a) => ({ ...a })),
      }
      stored.push(newRule)
      localStorage.setItem('automation_rules', JSON.stringify(stored))
    }
    onActivate?.(template.rule)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-200">Pre-built Templates</h3>
          <p className="text-xs text-slate-500 mt-0.5">Activate with one click — tweak anytime</p>
        </div>
        <span className="text-xs text-slate-500 bg-[#0B1120] rounded-lg px-2.5 py-1">
          {TEMPLATES.length} templates
        </span>
      </div>
      <div className="space-y-3">
        {TEMPLATES.map((t) => (
          <TemplateCard key={t.id} template={t} onActivate={handleActivate} />
        ))}
      </div>
    </div>
  )
}
