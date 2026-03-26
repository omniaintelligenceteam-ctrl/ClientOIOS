'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { TeamMember, Organization, User } from '@/lib/types'
import {
  Building2,
  Bot,
  Bell,
  Zap,
  CreditCard,
  Users,
  Save,
  Plus,
  Mail,
  Phone,
  MapPin,
  Clock,
  Wrench,
  Shield,
  AlertTriangle,
  MessageSquare,
  UserPlus,
  Loader2,
  Check,
  X,
  Trash2,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Tab = 'profile' | 'agent' | 'notifications' | 'automations' | 'billing' | 'team'

interface TabDef {
  id: Tab
  label: string
  icon: React.ElementType
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

interface ProfileFormData {
  name: string
  phone_number: string
  address: string
  timezone: string
  trade: string
}

interface AgentFormData {
  ai_agent_name: string
  emergency_phone: string
  greeting_message: string
  ai_agent_personality: string
  emergency_keywords: string[]
}

interface NotificationPrefs {
  sms_alerts: boolean
  email_alerts: boolean
  daily_digest: boolean
  weekly_report: boolean
  quiet_hours: boolean
}

interface InviteFormData {
  name: string
  email: string
  phone: string
  role: string
}

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const TABS: TabDef[] = [
  { id: 'profile', label: 'Business Profile', icon: Building2 },
  { id: 'agent', label: 'AI Agent', icon: Bot },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'automations', label: 'Automations', icon: Zap },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'team', label: 'Team', icon: Users },
]

const DAY_LABELS: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  sms_alerts: true,
  email_alerts: true,
  daily_digest: true,
  weekly_report: true,
  quiet_hours: true,
}

/* ------------------------------------------------------------------ */
/*  Shared components                                                  */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 text-base font-semibold text-slate-200">{children}</h3>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-slate-400">
      {children}
    </label>
  )
}

function EditableInput({
  value,
  onChange,
  icon: Icon,
  placeholder,
}: {
  value: string
  onChange: (val: string) => void
  icon?: React.ElementType
  placeholder?: string
}) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2.5 text-sm text-slate-300 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 ${Icon ? 'pl-10' : ''}`}
      />
    </div>
  )
}

function EditableTextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string
  onChange: (val: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full resize-none rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2.5 text-sm text-slate-300 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
    />
  )
}

function Tag({ children, onRemove }: { children: React.ReactNode; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center rounded-full bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-400">
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1.5 rounded-full p-0.5 transition-colors hover:bg-teal-500/20"
        >
          <X size={12} />
        </button>
      )}
    </span>
  )
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (val: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-[#0B1120] px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
          checked ? 'bg-teal-500' : 'bg-slate-600'
        }`}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function StatusMessage({ status, successText, errorText }: { status: SaveStatus; successText?: string; errorText?: string }) {
  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm text-green-400">
        <Check size={16} />
        {successText ?? 'Changes saved successfully.'}
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
        <AlertTriangle size={16} />
        {errorText ?? 'Failed to save changes. Please try again.'}
      </div>
    )
  }
  return null
}

function SaveButton({ status, onClick, disabled }: { status: SaveStatus; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={status === 'saving' || disabled}
      className={`flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:shadow-teal-500/30 ${
        status === 'saving' || disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      {status === 'saving' ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Save size={16} />
      )}
      {status === 'saving' ? 'Saving...' : 'Save Changes'}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Business Profile                                              */
/* ------------------------------------------------------------------ */

function BusinessProfileTab({
  org,
  form,
  setForm,
  onSave,
  saveStatus,
  initialForm,
}: {
  org: Organization | null
  form: ProfileFormData
  setForm: React.Dispatch<React.SetStateAction<ProfileFormData>>
  onSave: () => void
  saveStatus: SaveStatus
  initialForm: ProfileFormData
}) {
  if (!org) return <div className="text-sm text-slate-500">Loading organization data...</div>

  const bh = (org.business_hours ?? {}) as Record<string, { open: string; close: string }>

  const isDirty =
    form.name !== initialForm.name ||
    form.phone_number !== initialForm.phone_number ||
    form.address !== initialForm.address ||
    form.timezone !== initialForm.timezone ||
    form.trade !== initialForm.trade

  const updateField = (field: keyof ProfileFormData) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-8">
      {/* Basic info */}
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <SectionHeading>Basic Information</SectionHeading>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel>Business Name</FieldLabel>
            <EditableInput value={form.name} onChange={updateField('name')} icon={Building2} />
          </div>
          <div>
            <FieldLabel>Phone Number</FieldLabel>
            <EditableInput value={form.phone_number} onChange={updateField('phone_number')} icon={Phone} placeholder="(555) 123-4567" />
          </div>
          <div>
            <FieldLabel>Address</FieldLabel>
            <EditableInput value={form.address} onChange={updateField('address')} icon={MapPin} placeholder="123 Main St, City, State" />
          </div>
          <div>
            <FieldLabel>Timezone</FieldLabel>
            <EditableInput value={form.timezone} onChange={updateField('timezone')} icon={Clock} />
          </div>
          <div>
            <FieldLabel>Trade</FieldLabel>
            <EditableInput value={form.trade} onChange={updateField('trade')} icon={Wrench} />
          </div>
        </div>
      </div>

      {/* Service Area */}
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <SectionHeading>Service Area</SectionHeading>
        <div className="flex flex-wrap gap-2">
          {(org.service_area ?? []).map((zip) => (
            <span
              key={zip}
              className="inline-flex items-center rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-1.5 text-sm text-slate-300"
            >
              {zip}
            </span>
          ))}
        </div>
      </div>

      {/* Business Hours */}
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <SectionHeading>Business Hours</SectionHeading>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[120px_1fr_1fr] gap-y-0 text-sm">
            {/* Header */}
            <div className="border-b border-slate-700/50 pb-2 font-medium text-slate-400">
              Day
            </div>
            <div className="border-b border-slate-700/50 pb-2 font-medium text-slate-400">
              Open
            </div>
            <div className="border-b border-slate-700/50 pb-2 font-medium text-slate-400">
              Close
            </div>

            {/* Rows */}
            {Object.entries(DAY_LABELS).map(([key, label]) => {
              const hours = bh[key]
              const isClosed = hours?.open === 'closed'
              return (
                <div key={key} className="contents">
                  <div className="border-b border-slate-700/30 py-3 font-medium text-slate-300">
                    {label}
                  </div>
                  <div className="border-b border-slate-700/30 py-3 text-slate-400">
                    {isClosed ? (
                      <span className="text-slate-500">Closed</span>
                    ) : (
                      hours?.open
                    )}
                  </div>
                  <div className="border-b border-slate-700/30 py-3 text-slate-400">
                    {isClosed ? (
                      <span className="text-slate-500">--</span>
                    ) : (
                      hours?.close
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Services Offered */}
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <SectionHeading>Services Offered</SectionHeading>
        <div className="flex flex-wrap gap-2">
          {(org.services_offered ?? []).map((service) => (
            <Tag key={service}>{service}</Tag>
          ))}
        </div>
      </div>

      {/* Status + Save */}
      <div className="flex items-center justify-between gap-4">
        <StatusMessage status={saveStatus} />
        <div className="ml-auto">
          <SaveButton status={saveStatus} onClick={onSave} disabled={!isDirty} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: AI Agent                                                      */
/* ------------------------------------------------------------------ */

function AIAgentTab({
  org,
  form,
  setForm,
  onSave,
  saveStatus,
  initialForm,
}: {
  org: Organization | null
  form: AgentFormData
  setForm: React.Dispatch<React.SetStateAction<AgentFormData>>
  onSave: () => void
  saveStatus: SaveStatus
  initialForm: AgentFormData
}) {
  const [newKeyword, setNewKeyword] = useState('')

  if (!org) return <div className="text-sm text-slate-500">Loading organization data...</div>

  const isDirty =
    form.ai_agent_name !== initialForm.ai_agent_name ||
    form.emergency_phone !== initialForm.emergency_phone ||
    form.greeting_message !== initialForm.greeting_message ||
    form.ai_agent_personality !== initialForm.ai_agent_personality ||
    JSON.stringify(form.emergency_keywords) !== JSON.stringify(initialForm.emergency_keywords)

  const updateField = (field: keyof Omit<AgentFormData, 'emergency_keywords'>) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const addKeyword = () => {
    const trimmed = newKeyword.trim().toLowerCase()
    if (trimmed && !form.emergency_keywords.includes(trimmed)) {
      setForm((prev) => ({
        ...prev,
        emergency_keywords: [...prev.emergency_keywords, trimmed],
      }))
      setNewKeyword('')
    }
  }

  const removeKeyword = (kw: string) => {
    setForm((prev) => ({
      ...prev,
      emergency_keywords: prev.emergency_keywords.filter((k) => k !== kw),
    }))
  }

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword()
    }
  }

  return (
    <div className="space-y-8">
      {/* Agent identity */}
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <SectionHeading>Agent Identity</SectionHeading>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel>Agent Name</FieldLabel>
            <EditableInput value={form.ai_agent_name} onChange={updateField('ai_agent_name')} icon={Bot} />
          </div>
          <div>
            <FieldLabel>Escalation Phone</FieldLabel>
            <EditableInput value={form.emergency_phone} onChange={updateField('emergency_phone')} icon={Phone} placeholder="(555) 123-4567" />
          </div>
        </div>
      </div>

      {/* Greeting */}
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <SectionHeading>Greeting Message</SectionHeading>
        <FieldLabel>What {form.ai_agent_name || org.ai_agent_name} says when answering calls</FieldLabel>
        <EditableTextArea
          value={form.greeting_message}
          onChange={updateField('greeting_message')}
          rows={2}
          placeholder="Enter the greeting message your AI agent will use..."
        />
      </div>

      {/* Emergency keywords */}
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <SectionHeading>Emergency Keywords</SectionHeading>
        <p className="mb-3 text-sm text-slate-400">
          When callers mention these words, {form.ai_agent_name || org.ai_agent_name} flags the call as urgent and can escalate immediately.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {form.emergency_keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400"
            >
              <AlertTriangle size={12} />
              {kw}
              <button
                onClick={() => removeKeyword(kw)}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-orange-500/20"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={handleKeywordKeyDown}
            placeholder="Add a keyword..."
            className="flex-1 rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2 text-sm text-slate-300 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
          />
          <button
            onClick={addKeyword}
            disabled={!newKeyword.trim()}
            className="flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-400 transition-colors hover:bg-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
      </div>

      {/* Personality */}
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <SectionHeading>Personality Notes</SectionHeading>
        <FieldLabel>How {form.ai_agent_name || org.ai_agent_name} should sound and behave on calls</FieldLabel>
        <EditableTextArea
          value={form.ai_agent_personality}
          onChange={updateField('ai_agent_personality')}
          rows={4}
          placeholder="Describe the personality and tone for your AI agent..."
        />
      </div>

      {/* Status + Save */}
      <div className="flex items-center justify-between gap-4">
        <StatusMessage status={saveStatus} />
        <div className="ml-auto">
          <SaveButton status={saveStatus} onClick={onSave} disabled={!isDirty} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Notifications                                                 */
/* ------------------------------------------------------------------ */

function NotificationsTab({
  prefs,
  setPrefs,
  onSave,
  saveStatus,
  initialPrefs,
}: {
  prefs: NotificationPrefs
  setPrefs: React.Dispatch<React.SetStateAction<NotificationPrefs>>
  onSave: () => void
  saveStatus: SaveStatus
  initialPrefs: NotificationPrefs
}) {
  const isDirty =
    prefs.sms_alerts !== initialPrefs.sms_alerts ||
    prefs.email_alerts !== initialPrefs.email_alerts ||
    prefs.daily_digest !== initialPrefs.daily_digest ||
    prefs.weekly_report !== initialPrefs.weekly_report ||
    prefs.quiet_hours !== initialPrefs.quiet_hours

  const updatePref = (key: keyof NotificationPrefs) => (value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-8">
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <SectionHeading>Alert Preferences</SectionHeading>
        <p className="mb-5 text-sm text-slate-400">
          Control how and when you receive notifications about calls, leads, and business activity.
        </p>
        <div className="space-y-3">
          <Toggle checked={prefs.sms_alerts} label="SMS Alerts" onChange={updatePref('sms_alerts')} />
          <Toggle checked={prefs.email_alerts} label="Email Alerts" onChange={updatePref('email_alerts')} />
          <Toggle checked={prefs.daily_digest} label="Daily Digest" onChange={updatePref('daily_digest')} />
          <Toggle checked={prefs.weekly_report} label="Weekly Report" onChange={updatePref('weekly_report')} />
        </div>
      </div>

      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <SectionHeading>Quiet Hours</SectionHeading>
        <p className="mb-5 text-sm text-slate-400">
          Non-urgent notifications will be held during quiet hours and delivered the next morning.
        </p>
        <div className="space-y-3">
          <Toggle checked={prefs.quiet_hours} label="Enable Quiet Hours (10:00 PM - 7:00 AM)" onChange={updatePref('quiet_hours')} />
        </div>
      </div>

      {/* Status + Save */}
      <div className="flex items-center justify-between gap-4">
        <StatusMessage status={saveStatus} />
        <div className="ml-auto">
          <SaveButton status={saveStatus} onClick={onSave} disabled={!isDirty} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Billing                                                       */
/* ------------------------------------------------------------------ */

function BillingTab({ org }: { org: Organization | null }) {
  if (!org) return <div className="text-sm text-slate-500">Loading billing data...</div>

  const minutesUsed = org.monthly_minutes_used
  const minutesIncluded = org.monthly_minutes_included
  const usagePercent = minutesIncluded > 0 ? Math.round((minutesUsed / minutesIncluded) * 100) : 0

  const handleUpgrade = () => {
    window.open('mailto:team@getoios.com?subject=Upgrade to COO Plan', '_blank')
  }

  return (
    <div className="space-y-8">
      {/* Current Plan */}
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <SectionHeading>Current Plan</SectionHeading>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-slate-100">Office Manager</span>
              <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-400">
                Active
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">$497 / month</p>
          </div>
          <button
            onClick={handleUpgrade}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:shadow-teal-500/30 cursor-pointer"
          >
            <Shield size={16} />
            Upgrade to COO
          </button>
        </div>
      </div>

      {/* Minutes usage */}
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <SectionHeading>Minutes Usage</SectionHeading>
        <div className="mb-2 flex items-end justify-between">
          <span className="text-3xl font-bold text-slate-100">{minutesUsed}</span>
          <span className="text-sm text-slate-400">of {minutesIncluded} minutes</span>
        </div>
        <div className="mb-3 h-3 overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <p className="text-sm text-slate-400">
          {minutesIncluded - minutesUsed} minutes remaining this billing cycle
        </p>
      </div>

      {/* Plan comparison hint */}
      <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-teal-500/10">
            <Shield size={20} className="text-teal-400" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-200">Upgrade to COO Plan</h4>
            <p className="mt-1 text-sm text-slate-400">
              Get 1,000 minutes, advanced analytics, marketing automation, invoicing, and priority support. Perfect for growing businesses.
            </p>
            <button
              onClick={handleUpgrade}
              className="mt-3 text-sm font-medium text-teal-400 transition-colors hover:text-teal-300 cursor-pointer"
            >
              Learn more about the COO plan &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Team                                                          */
/* ------------------------------------------------------------------ */

function TeamTab({
  teamMembers,
  orgId,
  onMemberInvited,
}: {
  teamMembers: TeamMember[]
  orgId: string | undefined
  onMemberInvited: () => void
}) {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState<InviteFormData>({ name: '', email: '', phone: '', role: 'Technician' })
  const [inviteStatus, setInviteStatus] = useState<SaveStatus>('idle')

  const supabase = createSupabaseBrowserClient()

  const roleColors: Record<string, string> = {
    'Owner / Master Plumber': 'bg-amber-500/10 text-amber-400',
    'Lead Technician': 'bg-blue-500/10 text-blue-400',
    'Apprentice': 'bg-purple-500/10 text-purple-400',
    'Technician': 'bg-green-500/10 text-green-400',
    'Office Manager': 'bg-teal-500/10 text-teal-400',
  }

  const handleInvite = async () => {
    if (!orgId || !inviteForm.name.trim() || !inviteForm.email.trim()) return

    setInviteStatus('saving')
    const { error } = await supabase.from('team_members').insert({
      organization_id: orgId,
      name: inviteForm.name.trim(),
      email: inviteForm.email.trim(),
      phone: inviteForm.phone.trim() || '',
      role: inviteForm.role,
      is_on_call: false,
      total_jobs_completed: 0,
    })

    if (error) {
      setInviteStatus('error')
      setTimeout(() => setInviteStatus('idle'), 3000)
    } else {
      setInviteStatus('success')
      setInviteForm({ name: '', email: '', phone: '', role: 'Technician' })
      onMemberInvited()
      setTimeout(() => {
        setInviteStatus('idle')
        setShowInviteModal(false)
      }, 1500)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header with invite button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-200">
            Team Members ({teamMembers.length})
          </h3>
          <p className="text-sm text-slate-400">
            Manage your team and their access levels.
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:shadow-teal-500/30 cursor-pointer"
        >
          <UserPlus size={16} />
          Invite Team Member
        </button>
      </div>

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-white/[0.06] bg-[#0F172A] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-200">Invite Team Member</h3>
              <button
                onClick={() => { setShowInviteModal(false); setInviteStatus('idle') }}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <FieldLabel>Full Name</FieldLabel>
                <EditableInput
                  value={inviteForm.name}
                  onChange={(val) => setInviteForm((prev) => ({ ...prev, name: val }))}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <EditableInput
                  value={inviteForm.email}
                  onChange={(val) => setInviteForm((prev) => ({ ...prev, email: val }))}
                  icon={Mail}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <FieldLabel>Phone</FieldLabel>
                <EditableInput
                  value={inviteForm.phone}
                  onChange={(val) => setInviteForm((prev) => ({ ...prev, phone: val }))}
                  icon={Phone}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <FieldLabel>Role</FieldLabel>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2.5 text-sm text-slate-300 outline-none transition-colors focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                >
                  <option value="Technician">Technician</option>
                  <option value="Lead Technician">Lead Technician</option>
                  <option value="Apprentice">Apprentice</option>
                  <option value="Office Manager">Office Manager</option>
                </select>
              </div>

              {inviteStatus === 'error' && (
                <StatusMessage status="error" errorText="Failed to add team member. Please try again." />
              )}
              {inviteStatus === 'success' && (
                <StatusMessage status="success" successText="Team member added successfully!" />
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowInviteModal(false); setInviteStatus('idle') }}
                  className="flex-1 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={inviteStatus === 'saving' || !inviteForm.name.trim() || !inviteForm.email.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {inviteStatus === 'saving' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  {inviteStatus === 'saving' ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team member cards */}
      <div className="space-y-4">
        {teamMembers.map((member) => {
          const initials = member.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
          const colorClass = roleColors[member.role] || 'bg-slate-500/10 text-slate-400'

          return (
            <div
              key={member.id}
              className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {/* Avatar & name */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-sm font-bold text-teal-400">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-200 truncate">
                        {member.name}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
                      >
                        {member.role}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Mail size={13} /> {member.email}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Phone size={13} /> {member.phone}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-slate-200">
                      {member.total_jobs_completed}
                    </div>
                    <div className="text-xs text-slate-500">Jobs</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-slate-200">
                      {member.average_review_score}
                    </div>
                    <div className="text-xs text-slate-500">Rating</div>
                  </div>
                  {member.is_on_call && (
                    <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                      On Call
                    </span>
                  )}
                </div>
              </div>

              {/* Skills */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(member.skills ?? []).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md bg-slate-700/50 px-2 py-0.5 text-xs text-slate-400"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const { organization, profile } = useAuth()

  const supabase = createSupabaseBrowserClient()

  /* ---- Profile form state ---- */
  const emptyProfileForm: ProfileFormData = { name: '', phone_number: '', address: '', timezone: '', trade: '' }
  const [profileForm, setProfileForm] = useState<ProfileFormData>(emptyProfileForm)
  const [initialProfileForm, setInitialProfileForm] = useState<ProfileFormData>(emptyProfileForm)
  const [profileSaveStatus, setProfileSaveStatus] = useState<SaveStatus>('idle')

  /* ---- Agent form state ---- */
  const emptyAgentForm: AgentFormData = { ai_agent_name: '', emergency_phone: '', greeting_message: '', ai_agent_personality: '', emergency_keywords: [] }
  const [agentForm, setAgentForm] = useState<AgentFormData>(emptyAgentForm)
  const [initialAgentForm, setInitialAgentForm] = useState<AgentFormData>(emptyAgentForm)
  const [agentSaveStatus, setAgentSaveStatus] = useState<SaveStatus>('idle')

  /* ---- Notification prefs state ---- */
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS)
  const [initialNotifPrefs, setInitialNotifPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS)
  const [notifSaveStatus, setNotifSaveStatus] = useState<SaveStatus>('idle')

  /* ---- Initialize forms from org/profile data ---- */
  useEffect(() => {
    if (organization) {
      const pf: ProfileFormData = {
        name: organization.name,
        phone_number: organization.phone_number ?? '',
        address: '',
        timezone: organization.timezone,
        trade: organization.trade.charAt(0).toUpperCase() + organization.trade.slice(1),
      }
      setProfileForm(pf)
      setInitialProfileForm(pf)

      const af: AgentFormData = {
        ai_agent_name: organization.ai_agent_name,
        emergency_phone: organization.emergency_phone ?? '',
        greeting_message: `Good morning, ${organization.name}! This is ${organization.ai_agent_name}, how can I help you today?`,
        ai_agent_personality: organization.ai_agent_personality ?? '',
        emergency_keywords: organization.emergency_keywords ?? [],
      }
      setAgentForm(af)
      setInitialAgentForm(af)
    }
  }, [organization])

  useEffect(() => {
    if (profile?.notification_preferences) {
      const raw = profile.notification_preferences
      const np: NotificationPrefs = {
        sms_alerts: raw.sms_alerts ?? DEFAULT_NOTIFICATION_PREFS.sms_alerts,
        email_alerts: raw.email_alerts ?? DEFAULT_NOTIFICATION_PREFS.email_alerts,
        daily_digest: raw.daily_digest ?? DEFAULT_NOTIFICATION_PREFS.daily_digest,
        weekly_report: raw.weekly_report ?? DEFAULT_NOTIFICATION_PREFS.weekly_report,
        quiet_hours: raw.quiet_hours ?? DEFAULT_NOTIFICATION_PREFS.quiet_hours,
      }
      setNotifPrefs(np)
      setInitialNotifPrefs(np)
    }
  }, [profile])

  /* ---- Fetch team with org filter (SECURITY) ---- */
  const fetchTeam = useCallback(async () => {
    if (!organization?.id) return
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
    if (data) setTeamMembers(data as unknown as TeamMember[])
  }, [organization?.id])

  useEffect(() => {
    fetchTeam()
  }, [fetchTeam])

  /* ---- Save handlers ---- */

  const clearStatus = (setter: React.Dispatch<React.SetStateAction<SaveStatus>>) => {
    setTimeout(() => setter('idle'), 3000)
  }

  const handleSaveProfile = async () => {
    if (!organization) return
    setProfileSaveStatus('saving')

    const { error } = await supabase
      .from('organizations')
      .update({
        name: profileForm.name.trim(),
        phone_number: profileForm.phone_number.trim() || null,
        timezone: profileForm.timezone.trim(),
        trade: profileForm.trade.trim().toLowerCase(),
      })
      .eq('id', organization.id)

    if (error) {
      setProfileSaveStatus('error')
    } else {
      setProfileSaveStatus('success')
      setInitialProfileForm({ ...profileForm })
    }
    clearStatus(setProfileSaveStatus)
  }

  const handleSaveAgent = async () => {
    if (!organization) return
    setAgentSaveStatus('saving')

    const { error } = await supabase
      .from('organizations')
      .update({
        ai_agent_name: agentForm.ai_agent_name.trim(),
        emergency_phone: agentForm.emergency_phone.trim() || null,
        ai_agent_personality: agentForm.ai_agent_personality.trim() || null,
        emergency_keywords: agentForm.emergency_keywords,
      })
      .eq('id', organization.id)

    if (error) {
      setAgentSaveStatus('error')
    } else {
      setAgentSaveStatus('success')
      setInitialAgentForm({ ...agentForm, emergency_keywords: [...agentForm.emergency_keywords] })
    }
    clearStatus(setAgentSaveStatus)
  }

  const handleSaveNotifications = async () => {
    if (!profile) return
    setNotifSaveStatus('saving')

    const { error } = await supabase
      .from('users')
      .update({
        notification_preferences: notifPrefs as unknown as Record<string, boolean>,
      })
      .eq('id', profile.id)

    if (error) {
      setNotifSaveStatus('error')
    } else {
      setNotifSaveStatus('success')
      setInitialNotifPrefs({ ...notifPrefs })
    }
    clearStatus(setNotifSaveStatus)
  }

  /* ---- Tab content ---- */

  const tabContent: Record<Tab, React.ReactNode> = {
    profile: (
      <BusinessProfileTab
        org={organization}
        form={profileForm}
        setForm={setProfileForm}
        onSave={handleSaveProfile}
        saveStatus={profileSaveStatus}
        initialForm={initialProfileForm}
      />
    ),
    agent: (
      <AIAgentTab
        org={organization}
        form={agentForm}
        setForm={setAgentForm}
        onSave={handleSaveAgent}
        saveStatus={agentSaveStatus}
        initialForm={initialAgentForm}
      />
    ),
    notifications: (
      <NotificationsTab
        prefs={notifPrefs}
        setPrefs={setNotifPrefs}
        onSave={handleSaveNotifications}
        saveStatus={notifSaveStatus}
        initialPrefs={initialNotifPrefs}
      />
    ),
    automations: (
      <div className="space-y-4">
        <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="mb-2 text-base font-semibold text-slate-200">Automation Settings</h3>
          <p className="mb-4 text-sm text-slate-400">Configure automated follow-ups, review requests, invoice reminders, and more.</p>
          <a
            href="/dashboard/settings/automations"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600/20 border border-teal-500/30 px-4 py-2 text-sm font-medium text-teal-400 hover:bg-teal-600/30 transition-colors"
          >
            <Zap size={16} />
            Manage Automations
          </a>
        </div>
      </div>
    ),
    billing: <BillingTab org={organization} />,
    team: (
      <TeamTab
        teamMembers={teamMembers}
        orgId={organization?.id}
        onMemberInvited={fetchTeam}
      />
    ),
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your business profile, AI agent, notifications, and team.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-[rgba(148,163,184,0.1)]">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-teal-500 text-teal-400'
                    : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>{tabContent[activeTab]}</div>
    </div>
  )
}
