'use client'

import { useEffect, useState } from 'react'
import {
  Phone,
  Target,
  Calendar,
  Receipt,
  Star,
  Send,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  CalendarPlus,
  Mail,
  FileBarChart,
  AlertTriangle,
  CircleDot,
  Zap,
  Clock,
} from 'lucide-react'
import {
  demoActivity,
  demoAppointments,
  demoMetrics,
} from '@/lib/demo-data'
import type { ActivityFeedItem } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return a human-friendly relative timestamp. */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

/** Format a scheduled_date + scheduled_time_start into a readable string. */
function formatAppointmentDate(date: string, time: string): string {
  const d = new Date(`${date}T${time}`)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Lookup customer name by customer_id from hardcoded map (avoids circular import size). */
const CUSTOMER_NAME: Record<string, string> = {
  'cust-1': 'Lisa Martinez',
  'cust-2': 'John Davis',
  'cust-3': 'Sarah Chen',
  'cust-4': 'Robert Williams',
  'cust-5': 'Maria Gonzalez',
  'cust-6': 'David Park',
  'cust-7': 'Jennifer Thompson',
  'cust-8': 'Tom Baker',
  'cust-9': 'Angela Foster',
  'cust-10': 'Kevin Nguyen',
}

const TECH_NAME: Record<string, string> = {
  'user-mike': 'Mike',
  'user-jake': 'Jake',
  'user-carlos': 'Carlos',
}

/** Map entity_type -> Lucide icon component. */
function entityIcon(entityType: string) {
  switch (entityType) {
    case 'call':
      return Phone
    case 'lead':
      return Target
    case 'appointment':
      return Calendar
    case 'invoice':
      return Receipt
    case 'review':
      return Star
    case 'follow_up':
      return Send
    default:
      return Zap
  }
}

/** Importance -> tailwind color classes for badge. */
function importanceBadge(importance: string) {
  switch (importance) {
    case 'critical':
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'high':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'medium':
      return 'bg-teal-500/20 text-teal-400 border-teal-500/30'
    case 'low':
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }
}

/** Appointment status -> badge style. */
function statusBadge(status: string) {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-500/20 text-blue-400'
    case 'confirmed':
      return 'bg-green-500/20 text-green-400'
    case 'in_progress':
      return 'bg-amber-500/20 text-amber-400'
    case 'completed':
      return 'bg-slate-500/20 text-slate-400'
    case 'cancelled':
      return 'bg-red-500/20 text-red-400'
    default:
      return 'bg-slate-500/20 text-slate-400'
  }
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

const cardClass = 'bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6'

/** Stat card with mount animation. */
function StatCard({
  label,
  value,
  comparison,
  subtext,
  trend,
  animDelay,
}: {
  label: string
  value: string
  comparison?: string
  subtext?: string
  trend?: 'up' | 'down'
  animDelay: number
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), animDelay)
    return () => clearTimeout(t)
  }, [animDelay])

  return (
    <div className={cardClass}>
      <p className="text-sm text-slate-400 mb-1">{label}</p>
      <p
        className={`text-3xl font-bold transition-all duration-700 ease-out ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        {value}
      </p>
      {comparison && (
        <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
          {trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-400" />}
          {trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-400" />}
          <span className={trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : ''}>
            {comparison}
          </span>
        </p>
      )}
      {subtext && <p className="text-sm text-slate-400 mt-1">{subtext}</p>}
    </div>
  )
}

/** Single row in the activity feed. */
function ActivityRow({ item }: { item: ActivityFeedItem }) {
  const Icon = entityIcon(item.entity_type)
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[rgba(148,163,184,0.06)] last:border-0">
      <div className="mt-0.5 flex-shrink-0 rounded-lg bg-[rgba(148,163,184,0.06)] p-2">
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed">
          <span className="font-medium text-teal-400">{item.actor}</span>{' '}
          <span className="text-slate-300">{item.action}</span>
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {relativeTime(item.created_at)}
          </span>
          <span
            className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full border ${importanceBadge(
              item.importance,
            )}`}
          >
            {item.importance}
          </span>
        </div>
      </div>
    </div>
  )
}

/** AI agent status card. */
function AgentCard({
  name,
  role,
  stat,
}: {
  name: string
  role: string
  stat: string
}) {
  return (
    <div className="bg-[rgba(148,163,184,0.04)] border border-[rgba(148,163,184,0.08)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <CircleDot className="h-3 w-3 text-green-400 animate-pulse" />
        <span className="text-sm font-semibold text-slate-200">{name}</span>
      </div>
      <p className="text-xs text-slate-500 mb-1">{role}</p>
      <p className="text-xs text-slate-400">{stat}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CommandCenterPage() {
  // Next three upcoming appointments (status is scheduled, confirmed, or in_progress)
  const upcomingAppointments = demoAppointments
    .filter((a) => ['scheduled', 'confirmed', 'in_progress'].includes(a.status))
    .slice(0, 3)

  return (
    <div className="space-y-8">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-slate-400 mt-1">
          Good morning, Mike. Here&apos;s what&apos;s happening.
        </p>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Calls Answered Today"
          value={String(demoMetrics.callsToday)}
          comparison={`vs ${demoMetrics.callsYesterday} yesterday`}
          trend="down"
          animDelay={0}
        />
        <StatCard
          label="New Leads"
          value={String(demoMetrics.leadsToday)}
          subtext={`${demoMetrics.conversionRate}% conversion rate`}
          animDelay={80}
        />
        <StatCard
          label="Jobs Booked"
          value={String(demoMetrics.jobsBookedToday)}
          subtext={`$${demoMetrics.pipelineValue.toLocaleString()} pipeline`}
          animDelay={160}
        />
        <StatCard
          label="Revenue This Month"
          value={`$${demoMetrics.revenueThisMonth.toLocaleString()}`}
          comparison={`+${(
            ((demoMetrics.revenueThisMonth - demoMetrics.revenueLastMonth) /
              demoMetrics.revenueLastMonth) *
            100
          ).toFixed(1)}% vs last month`}
          trend="up"
          animDelay={240}
        />
      </div>

      {/* ── Two-column layout (60 / 40) ──────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-6">
        {/* ── Left Column (60 %) ──────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Live Activity Feed */}
          <div className={cardClass}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-teal-400" />
              Live Activity Feed
            </h2>
            <div className="divide-y divide-[rgba(148,163,184,0.06)]">
              {demoActivity.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          </div>

          {/* AI Team Status */}
          <div className={cardClass}>
            <h2 className="text-lg font-semibold mb-4">AI Team Status</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AgentCard
                name="Sarah"
                role="Receptionist"
                stat={`Answered ${demoMetrics.callsToday} calls today`}
              />
              <AgentCard
                name="Follow-Up Agent"
                role="Lead Nurturing"
                stat={`Sent ${demoMetrics.followUpsSentToday} messages today`}
              />
              <AgentCard
                name="Review Manager"
                role="Reputation Management"
                stat={`Requested ${demoMetrics.reviewsRequestedToday} review today`}
              />
              <AgentCard
                name="Invoice Agent"
                role="Billing & Collections"
                stat="Sent 2 reminders today"
              />
            </div>
          </div>
        </div>

        {/* ── Right Column (40 %) ─────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Upcoming Appointments */}
          <div className={cardClass}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-400" />
              Upcoming Appointments
            </h2>
            <div className="space-y-4">
              {upcomingAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-[rgba(148,163,184,0.04)] border border-[rgba(148,163,184,0.08)] rounded-xl p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        {CUSTOMER_NAME[apt.customer_id] ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{apt.service_type}</p>
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full ${statusBadge(
                        apt.status,
                      )}`}
                    >
                      {apt.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatAppointmentDate(apt.scheduled_date, apt.scheduled_time_start)}
                    </span>
                    {apt.assigned_to && (
                      <span>Tech: {TECH_NAME[apt.assigned_to] ?? apt.assigned_to}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Urgent Items */}
          <div className={cardClass}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Urgent Items
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-red-400">
                  1 overdue invoice &mdash; $1,575 from Sarah Chen
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-orange-400 flex-shrink-0" />
                <span className="text-orange-400">
                  2 hot leads need follow-up
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-yellow-400 flex-shrink-0" />
                <span className="text-yellow-400">
                  1 review needs response
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={cardClass}>
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-400 py-3 text-sm font-medium hover:bg-teal-600/30 transition-colors">
                <Plus className="h-4 w-4" />
                Add Lead
              </button>
              <button className="flex items-center justify-center gap-2 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-400 py-3 text-sm font-medium hover:bg-teal-600/30 transition-colors">
                <CalendarPlus className="h-4 w-4" />
                Schedule Appointment
              </button>
              <button className="flex items-center justify-center gap-2 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-400 py-3 text-sm font-medium hover:bg-teal-600/30 transition-colors">
                <Mail className="h-4 w-4" />
                Send Follow-Up
              </button>
              <button className="flex items-center justify-center gap-2 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-400 py-3 text-sm font-medium hover:bg-teal-600/30 transition-colors">
                <FileBarChart className="h-4 w-4" />
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
