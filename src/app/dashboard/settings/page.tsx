'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { TeamMember, Organization } from '@/lib/types'
import {
  Building2,
  Bot,
  Bell,
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
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Tab = 'profile' | 'agent' | 'notifications' | 'billing' | 'team'

interface TabDef {
  id: Tab
  label: string
  icon: React.ElementType
}

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const TABS: TabDef[] = [
  { id: 'profile', label: 'Business Profile', icon: Building2 },
  { id: 'agent', label: 'AI Agent', icon: Bot },
  { id: 'notifications', label: 'Notifications', icon: Bell },
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

function ReadOnlyInput({ value, icon: Icon }: { value: string; icon?: React.ElementType }) {
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
        readOnly
        value={value}
        className={`w-full rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 ${Icon ? 'pl-10' : ''}`}
      />
    </div>
  )
}

function TextAreaReadOnly({ value, rows = 3 }: { value: string; rows?: number }) {
  return (
    <textarea
      readOnly
      value={value}
      rows={rows}
      className="w-full resize-none rounded-lg border border-slate-700 bg-[#0B1120] px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
    />
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-400">
      {children}
    </span>
  )
}

function Toggle({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-[#0B1120] px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <div
        className={`relative h-6 w-11 cursor-not-allowed rounded-full transition-colors ${
          checked ? 'bg-teal-500' : 'bg-slate-600'
        }`}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Business Profile                                              */
/* ------------------------------------------------------------------ */

function BusinessProfileTab({ org }: { org: Organization | null }) {
  if (!org) return <div className="text-sm text-slate-500">Loading organization data...</div>

  const bh = (org.business_hours ?? {}) as Record<string, { open: string; close: string }>

  return (
    <div className="space-y-8">
      {/* Basic info */}
      <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-6">
        <SectionHeading>Basic Information</SectionHeading>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel>Business Name</FieldLabel>
            <ReadOnlyInput value={org.name} icon={Building2} />
          </div>
          <div>
            <FieldLabel>Phone Number</FieldLabel>
            <ReadOnlyInput value={org.phone_number ?? ''} icon={Phone} />
          </div>
          <div>
            <FieldLabel>Address</FieldLabel>
            <ReadOnlyInput value="" icon={MapPin} />
          </div>
          <div>
            <FieldLabel>Timezone</FieldLabel>
            <ReadOnlyInput value={org.timezone} icon={Clock} />
          </div>
          <div>
            <FieldLabel>Trade</FieldLabel>
            <ReadOnlyInput value={org.trade.charAt(0).toUpperCase() + org.trade.slice(1)} icon={Wrench} />
          </div>
        </div>
      </div>

      {/* Service Area */}
      <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-6">
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
      <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-6">
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
      <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-6">
        <SectionHeading>Services Offered</SectionHeading>
        <div className="flex flex-wrap gap-2">
          {(org.services_offered ?? []).map((service) => (
            <Tag key={service}>{service}</Tag>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          disabled
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-6 py-2.5 text-sm font-semibold text-white opacity-50 cursor-not-allowed shadow-lg shadow-teal-500/20"
        >
          <Save size={16} />
          Save Changes
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: AI Agent                                                      */
/* ------------------------------------------------------------------ */

function AIAgentTab({ org }: { org: Organization | null }) {
  if (!org) return <div className="text-sm text-slate-500">Loading organization data...</div>

  return (
    <div className="space-y-8">
      {/* Agent identity */}
      <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-6">
        <SectionHeading>Agent Identity</SectionHeading>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel>Agent Name</FieldLabel>
            <ReadOnlyInput value={org.ai_agent_name} icon={Bot} />
          </div>
          <div>
            <FieldLabel>Escalation Phone</FieldLabel>
            <ReadOnlyInput value={org.emergency_phone ?? ''} icon={Phone} />
          </div>
        </div>
      </div>

      {/* Greeting */}
      <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-6">
        <SectionHeading>Greeting Message</SectionHeading>
        <FieldLabel>What {org.ai_agent_name} says when answering calls</FieldLabel>
        <TextAreaReadOnly
          value={`Good morning, ${org.name}! This is ${org.ai_agent_name}, how can I help you today?`}
          rows={2}
        />
      </div>

      {/* Emergency keywords */}
      <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-6">
        <SectionHeading>Emergency Keywords</SectionHeading>
        <p className="mb-3 text-sm text-slate-400">
          When callers mention these words, {org.ai_agent_name} flags the call as urgent and can escalate immediately.
        </p>
        <div className="flex flex-wrap gap-2">
          {(org.emergency_keywords ?? []).map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400"
            >
              <AlertTriangle size={12} />
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* Personality */}
      <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-6">
        <SectionHeading>Personality Notes</SectionHeading>
        <FieldLabel>How {org.ai_agent_name} should sound and behave on calls</FieldLabel>
        <TextAreaReadOnly
          value={org.ai_agent_personality ?? ''}
          rows={4}
        />
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          disabled
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-6 py-2.5 text-sm font-semibold text-white opacity-50 cursor-not-allowed shadow-lg shadow-teal-500/20"
        >
          <Save size={16} />
          Save Changes
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab: Notifications                                                 */
/* ------------------------------------------------------------------ */

function NotificationsTab() {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-6">
        <SectionHeading>Alert Preferences</SectionHeading>
        <p className="mb-5 text-sm text-slate-400">
          Control how and when you receive notifications about calls, leads, and business activity.
        </p>
        <div className="space-y-3">
          <Toggle checked={true} label="SMS Alerts" />
          <Toggle checked={true} label="Email Alerts" />
          <Toggle checked={true} label="Daily Digest" />
          <Toggle checked={true} label="Weekly Report" />
        </div>
      </div>

      <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-6">
        <SectionHeading>Quiet Hours</SectionHeading>
        <p className="mb-5 text-sm text-slate-400">
          Non-urgent notifications will be held during quiet hours and delivered the next morning.
        </p>
        <div className="space-y-3">
          <Toggle checked={true} label="Enable Quiet Hours (10:00 PM - 7:00 AM)" />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Quiet Start</FieldLabel>
            <ReadOnlyInput value="10:00 PM" icon={Clock} />
          </div>
          <div>
            <FieldLabel>Quiet End</FieldLabel>
            <ReadOnlyInput value="7:00 AM" icon={Clock} />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          disabled
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-6 py-2.5 text-sm font-semibold text-white opacity-50 cursor-not-allowed shadow-lg shadow-teal-500/20"
        >
          <Save size={16} />
          Save Changes
        </button>
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

  return (
    <div className="space-y-8">
      {/* Current Plan */}
      <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-6">
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
          <button className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:shadow-teal-500/30">
            <Shield size={16} />
            Upgrade to COO
          </button>
        </div>
      </div>

      {/* Minutes usage */}
      <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-6">
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
            <button className="mt-3 text-sm font-medium text-teal-400 transition-colors hover:text-teal-300">
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

function TeamTab({ teamMembers }: { teamMembers: TeamMember[] }) {
  const roleColors: Record<string, string> = {
    'Owner / Master Plumber': 'bg-amber-500/10 text-amber-400',
    'Lead Technician': 'bg-blue-500/10 text-blue-400',
    'Apprentice': 'bg-purple-500/10 text-purple-400',
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
        <button className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:shadow-teal-500/30">
          <UserPlus size={16} />
          Invite Team Member
        </button>
      </div>

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
              className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-5"
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
  const { organization } = useAuth()

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    const fetchTeam = async () => {
      const { data } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setTeamMembers(data as unknown as TeamMember[])
    }
    fetchTeam()
  }, [])

  const tabContent: Record<Tab, React.ReactNode> = {
    profile: <BusinessProfileTab org={organization} />,
    agent: <AIAgentTab org={organization} />,
    notifications: <NotificationsTab />,
    billing: <BillingTab org={organization} />,
    team: <TeamTab teamMembers={teamMembers} />,
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
