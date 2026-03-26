'use client'

import { useState } from 'react'
import {
  X,
  Mail,
  MessageSquare,
  Send,
  ChevronRight,
  ChevronLeft,
  Check,
  Megaphone,
  Loader2,
  Calendar,
  Clock,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { CAMPAIGN_TEMPLATES, type CampaignTemplate } from '@/lib/automation-templates'

interface Props {
  organizationId: string
  onClose: () => void
  onCreated: () => void
}

type Channel = 'Email' | 'SMS' | 'Both'
type Segment = 'all_customers' | 'hot_leads' | 'inactive_customers'
type ScheduleType = 'now' | 'later'

interface FormState {
  name: string
  channel: Channel
  segment: Segment
  template: CampaignTemplate | null
  scheduleType: ScheduleType
  scheduledFor: string
}

const STEPS = ['Basics', 'Template', 'Schedule', 'Launch']

const SEGMENTS: { value: Segment; label: string; description: string }[] = [
  { value: 'all_customers', label: 'All Customers', description: 'Everyone in your customer list' },
  { value: 'hot_leads', label: 'Hot Leads', description: 'Leads with high engagement or priority score' },
  { value: 'inactive_customers', label: 'Inactive Customers', description: 'No contact in 90+ days' },
]

const CHANNEL_ICONS: Record<Channel, React.ElementType> = {
  Email: Mail,
  SMS: MessageSquare,
  Both: Send,
}

export function CampaignBuilderModal({ organizationId, onClose, onCreated }: Props) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>({
    name: '',
    channel: 'Email',
    segment: 'all_customers',
    template: null,
    scheduleType: 'now',
    scheduledFor: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const supabase = createSupabaseBrowserClient()

  function nextStep() {
    setStep((s) => Math.min(s + 1, 3))
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function canProceed(): boolean {
    if (step === 0) return form.name.trim().length > 0
    if (step === 1) return form.template !== null
    if (step === 2) {
      if (form.scheduleType === 'later') return form.scheduledFor.length > 0
      return true
    }
    return true
  }

  async function launchCampaign() {
    if (!form.template) return
    setSubmitting(true)
    try {
      const scheduledFor =
        form.scheduleType === 'now' ? new Date().toISOString() : new Date(form.scheduledFor).toISOString()

      // Insert into automation_queue as a campaign batch item
      await supabase.from('automation_queue').insert({
        organization_id: organizationId,
        action_type: form.template.id === 'review-request' ? 'review_request' : 'follow_up_email',
        status: 'pending',
        target_entity_type: 'campaign',
        target_entity_id: null,
        payload: {
          campaign_name: form.name,
          channel: form.channel,
          segment: form.segment,
          template_id: form.template.id,
          template_body: form.template.body,
          subject: form.template.subject || '',
        },
        scheduled_for: scheduledFor,
      })

      setSubmitting(false)
      onCreated()
      onClose()
    } catch {
      setSubmitting(false)
    }
  }

  const filteredTemplates =
    form.channel === 'Email'
      ? CAMPAIGN_TEMPLATES.filter((t) => t.channel === 'Email' || t.channel === 'Both')
      : form.channel === 'SMS'
      ? CAMPAIGN_TEMPLATES.filter((t) => t.channel === 'SMS' || t.channel === 'Both')
      : CAMPAIGN_TEMPLATES

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[rgba(148,163,184,0.15)] bg-white/[0.03] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.1)] px-6 py-4">
          <div className="flex items-center gap-3">
            <Megaphone size={20} className="text-[#2DD4BF]" />
            <h2 className="text-lg font-semibold text-[#F8FAFC]">Create Campaign</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-0 border-b border-[rgba(148,163,184,0.1)] px-6 py-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    i < step
                      ? 'bg-[#2DD4BF] text-[#0B1120]'
                      : i === step
                      ? 'bg-[#2DD4BF]/20 text-[#2DD4BF] ring-1 ring-[#2DD4BF]'
                      : 'bg-[rgba(148,163,184,0.08)] text-slate-500'
                  }`}
                >
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                <span
                  className={`text-xs font-medium ${
                    i === step ? 'text-[#F8FAFC]' : 'text-slate-500'
                  }`}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="mx-3 h-px w-8 bg-[rgba(148,163,184,0.15)]" />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-6 min-h-[320px]">
          {/* Step 0: Basics */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Spring Maintenance Special"
                  className="w-full rounded-xl border border-[rgba(148,163,184,0.15)] bg-[#0B1120] px-3.5 py-2.5 text-sm text-[#F8FAFC] placeholder-slate-600 outline-none transition-colors focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Channel
                </label>
                <div className="flex gap-3">
                  {(['Email', 'SMS', 'Both'] as Channel[]).map((ch) => {
                    const Icon = CHANNEL_ICONS[ch]
                    const active = form.channel === ch
                    return (
                      <button
                        key={ch}
                        onClick={() => setForm({ ...form, channel: ch })}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                          active
                            ? 'border-[#2DD4BF] bg-[#2DD4BF]/10 text-[#2DD4BF]'
                            : 'border-[rgba(148,163,184,0.15)] bg-transparent text-slate-400 hover:border-slate-600 hover:text-slate-200'
                        }`}
                      >
                        <Icon size={15} />
                        {ch}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Audience Segment
                </label>
                <div className="space-y-2">
                  {SEGMENTS.map((seg) => {
                    const active = form.segment === seg.value
                    return (
                      <button
                        key={seg.value}
                        onClick={() => setForm({ ...form, segment: seg.value })}
                        className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                          active
                            ? 'border-[#2DD4BF] bg-[#2DD4BF]/10'
                            : 'border-[rgba(148,163,184,0.15)] bg-transparent hover:border-slate-600'
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                            active ? 'border-[#2DD4BF]' : 'border-slate-600'
                          }`}
                        >
                          {active && <div className="h-2 w-2 rounded-full bg-[#2DD4BF]" />}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${active ? 'text-[#2DD4BF]' : 'text-slate-200'}`}>
                            {seg.label}
                          </p>
                          <p className="text-xs text-slate-500">{seg.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Templates */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">Choose a template to start from:</p>
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {filteredTemplates.map((tmpl) => {
                  const active = form.template?.id === tmpl.id
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => setForm({ ...form, template: tmpl })}
                      className={`w-full rounded-xl border px-4 py-3.5 text-left transition-all ${
                        active
                          ? 'border-[#2DD4BF] bg-[#2DD4BF]/10'
                          : 'border-[rgba(148,163,184,0.15)] bg-[rgba(148,163,184,0.02)] hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`text-sm font-semibold ${active ? 'text-[#2DD4BF]' : 'text-[#F8FAFC]'}`}>
                            {tmpl.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">{tmpl.description}</p>
                        </div>
                        <span className="flex-shrink-0 rounded-full border border-[rgba(148,163,184,0.15)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {tmpl.channel}
                        </span>
                      </div>
                      {/* Preview lines */}
                      <div className="mt-3 rounded-lg border border-[rgba(148,163,184,0.08)] bg-[rgba(148,163,184,0.04)] px-3 py-2">
                        {tmpl.previewLines.map((line, i) => (
                          <p key={i} className="text-[11px] text-slate-500 leading-relaxed">{line}</p>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2: Schedule */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  When to Send
                </label>
                <div className="flex gap-3">
                  {([
                    { value: 'now', label: 'Send Now', icon: Send },
                    { value: 'later', label: 'Schedule', icon: Calendar },
                  ] as { value: ScheduleType; label: string; icon: React.ElementType }[]).map((opt) => {
                    const Icon = opt.icon
                    const active = form.scheduleType === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setForm({ ...form, scheduleType: opt.value })}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                          active
                            ? 'border-[#2DD4BF] bg-[#2DD4BF]/10 text-[#2DD4BF]'
                            : 'border-[rgba(148,163,184,0.15)] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                        }`}
                      >
                        <Icon size={15} />
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {form.scheduleType === 'later' && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <Clock size={11} className="inline mr-1" />
                    Scheduled Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.scheduledFor}
                    onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full rounded-xl border border-[rgba(148,163,184,0.15)] bg-[#0B1120] px-3.5 py-2.5 text-sm text-[#F8FAFC] outline-none transition-colors focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review & Launch */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Review your campaign settings before launching:</p>
              <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[rgba(148,163,184,0.03)] divide-y divide-[rgba(148,163,184,0.08)]">
                {[
                  { label: 'Campaign Name', value: form.name },
                  { label: 'Channel', value: form.channel },
                  { label: 'Audience', value: SEGMENTS.find((s) => s.value === form.segment)?.label || '' },
                  { label: 'Template', value: form.template?.name || '' },
                  {
                    label: 'Send Time',
                    value:
                      form.scheduleType === 'now'
                        ? 'Immediately'
                        : form.scheduledFor
                        ? new Date(form.scheduledFor).toLocaleString()
                        : 'Not set',
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-medium text-slate-500">{label}</span>
                    <span className="text-sm font-semibold text-[#F8FAFC]">{value}</span>
                  </div>
                ))}
              </div>
              {form.template && (
                <div className="rounded-xl border border-[rgba(148,163,184,0.08)] bg-[rgba(148,163,184,0.04)] px-4 py-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Message Preview
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">{form.template.body}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t border-[rgba(148,163,184,0.1)] px-6 py-4">
          <button
            onClick={step === 0 ? onClose : prevStep}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
          >
            <ChevronLeft size={15} />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step < 3 ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 rounded-lg bg-[#2DD4BF] px-5 py-2 text-sm font-semibold text-[#0B1120] transition-all hover:bg-[#5EEAD4] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={launchCampaign}
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-[#f97316] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[#fb923c] disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Megaphone size={15} />
              )}
              {submitting ? 'Launching...' : 'Launch Campaign'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
