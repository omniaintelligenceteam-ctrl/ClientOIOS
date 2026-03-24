'use client'

import { useState, useMemo, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  Calendar,
  List,
  Clock,
  DollarSign,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import type { Appointment, AppointmentStatus, Customer, User as UserType } from '@/lib/types'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

interface StatusConfig {
  label: string
  bg: string
  text: string
  dot: string
}

const STATUS_MAP: Record<AppointmentStatus, StatusConfig> = {
  scheduled: {
    label: 'Scheduled',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  confirmed: {
    label: 'Confirmed',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    dot: 'bg-yellow-400',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    dot: 'bg-slate-400',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    dot: 'bg-red-400',
  },
  no_show: {
    label: 'No Show',
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    dot: 'bg-orange-400',
  },
  rescheduled: {
    label: 'Rescheduled',
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    dot: 'bg-purple-400',
  },
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getCustomerName(customerId: string, customers: Customer[]): string {
  const customer = customers.find((c) => c.id === customerId)
  if (!customer) return 'Unknown'
  return `${customer.first_name} ${customer.last_name}`
}

function getAssigneeName(userId: string | null, users: UserType[]): string {
  if (!userId) return 'Unassigned'
  const user = users.find((u) => u.id === userId)
  if (!user) return userId
  const parts = user.full_name.split(' ')
  return `${parts[0]} ${parts[1]?.[0] ?? ''}.`
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '--'
  return `$${value.toLocaleString()}`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)

  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / 86400000,
  )

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatTimeRange(start: string, end: string): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hr = h % 12 || 12
    return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`
  }
  return `${fmt(start)} - ${fmt(end)}`
}

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0]
  return dateStr === today
}

/* ------------------------------------------------------------------ */
/*  Status Badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.scheduled
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.bg} ${config.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Today's Summary Card                                               */
/* ------------------------------------------------------------------ */

function TodaySummary({ appointments }: { appointments: Appointment[] }) {
  const todayAppts = useMemo(
    () => appointments.filter((a) => isToday(a.scheduled_date)),
    [appointments],
  )

  const todayCount = todayAppts.length
  const todayValue = todayAppts.reduce(
    (sum, a) => sum + (a.estimated_value ?? 0),
    0,
  )

  const stats = [
    {
      label: "Today's Appointments",
      value: String(todayCount),
      icon: Calendar,
      accent: 'text-[#2DD4BF]',
      accentBg: 'bg-[#2DD4BF]/10',
    },
    {
      label: 'Scheduled Value',
      value: formatCurrency(todayValue),
      icon: DollarSign,
      accent: 'text-[#f97316]',
      accentBg: 'bg-[#f97316]/10',
    },
    {
      label: 'In Progress',
      value: String(
        todayAppts.filter((a) => a.status === 'in_progress').length,
      ),
      icon: Clock,
      accent: 'text-yellow-400',
      accentBg: 'bg-yellow-500/10',
    },
    {
      label: 'Confirmed',
      value: String(
        appointments.filter((a) => a.customer_confirmed).length,
      ),
      icon: CheckCircle2,
      accent: 'text-emerald-400',
      accentBg: 'bg-emerald-500/10',
    },
  ]

  return (
    <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-5">
      <div className="mb-4 flex items-center gap-2">
        <AlertCircle size={16} className="text-[#2DD4BF]" />
        <h2 className="text-sm font-semibold text-[#F8FAFC]">
          Today&apos;s Summary
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${stat.accentBg} ${stat.accent}`}
              >
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.accent}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Appointment Row                                                    */
/* ------------------------------------------------------------------ */

function AppointmentRow({ appointment, customers, users }: { appointment: Appointment; customers: Customer[]; users: UserType[] }) {
  const customerName = getCustomerName(appointment.customer_id, customers)
  const assigneeName = getAssigneeName(appointment.assigned_to, users)
  const dateLabel = formatDate(appointment.scheduled_date)
  const timeLabel = formatTimeRange(
    appointment.scheduled_time_start,
    appointment.scheduled_time_end,
  )
  const today = isToday(appointment.scheduled_date)

  return (
    <tr
      className={`group border-b border-[rgba(148,163,184,0.05)] transition-colors hover:bg-white/[0.02] ${
        today ? 'bg-[#2DD4BF]/[0.03]' : ''
      }`}
    >
      {/* Date */}
      <td className="px-4 py-3.5">
        <span
          className={`text-sm font-medium ${
            today ? 'text-[#2DD4BF]' : 'text-[#F8FAFC]'
          }`}
        >
          {dateLabel}
        </span>
      </td>

      {/* Time */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 text-sm text-slate-400">
          <Clock size={13} className="flex-shrink-0 text-slate-500" />
          {timeLabel}
        </div>
      </td>

      {/* Customer */}
      <td className="px-4 py-3.5">
        <span className="text-sm font-semibold text-[#F8FAFC]">
          {customerName}
        </span>
      </td>

      {/* Service Type */}
      <td className="px-4 py-3.5">
        <span className="text-sm text-slate-400">
          {appointment.service_type}
        </span>
      </td>

      {/* Address */}
      <td className="px-4 py-3.5">
        <div className="flex items-start gap-1.5 text-sm text-slate-500">
          <MapPin
            size={13}
            className="mt-0.5 flex-shrink-0 text-slate-600"
          />
          <span className="max-w-[200px] truncate" title={appointment.address}>
            {appointment.address}
          </span>
        </div>
      </td>

      {/* Assigned To */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <User size={13} className="text-slate-500" />
          <span className="text-sm text-slate-300">{assigneeName}</span>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <StatusBadge status={appointment.status} />
      </td>

      {/* Est. Value */}
      <td className="px-4 py-3.5 text-right">
        <span className="text-sm font-semibold text-[#2DD4BF]">
          {formatCurrency(appointment.estimated_value)}
        </span>
      </td>
    </tr>
  )
}

/* ------------------------------------------------------------------ */
/*  Mobile Appointment Card                                            */
/* ------------------------------------------------------------------ */

function AppointmentCard({ appointment, customers, users }: { appointment: Appointment; customers: Customer[]; users: UserType[] }) {
  const customerName = getCustomerName(appointment.customer_id, customers)
  const assigneeName = getAssigneeName(appointment.assigned_to, users)
  const dateLabel = formatDate(appointment.scheduled_date)
  const timeLabel = formatTimeRange(
    appointment.scheduled_time_start,
    appointment.scheduled_time_end,
  )
  const today = isToday(appointment.scheduled_date)

  return (
    <div
      className={`rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-4 transition-all hover:border-[#2DD4BF]/20 ${
        today ? 'border-l-2 border-l-[#2DD4BF]' : ''
      }`}
    >
      {/* Top row */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#F8FAFC]">
            {customerName}
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {appointment.service_type}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Calendar size={12} className="text-slate-500" />
          <span className={today ? 'font-medium text-[#2DD4BF]' : ''}>
            {dateLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock size={12} className="text-slate-500" />
          {timeLabel}
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <User size={12} className="text-slate-500" />
          {assigneeName}
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <DollarSign size={12} className="text-[#2DD4BF]" />
          <span className="font-semibold text-[#2DD4BF]">
            {formatCurrency(appointment.estimated_value)}
          </span>
        </div>
      </div>

      {/* Address */}
      <div className="mt-2.5 flex items-start gap-1.5 text-xs text-slate-500">
        <MapPin size={12} className="mt-0.5 flex-shrink-0" />
        <span className="truncate">{appointment.address}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function SchedulePage() {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [users, setUsers] = useState<UserType[]>([])

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const [apptRes, custRes, usersRes] = await Promise.all([
        supabase.from('appointments').select('*').order('scheduled_date', { ascending: true }),
        supabase.from('customers').select('*'),
        supabase.from('users').select('*'),
      ])
      if (apptRes.data) setAppointments(apptRes.data as unknown as Appointment[])
      if (custRes.data) setCustomers(custRes.data as unknown as Customer[])
      if (usersRes.data) setUsers(usersRes.data as unknown as UserType[])
    }
    fetchData()
  }, [])

  // Sort appointments: today first, then by date ascending
  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const aToday = isToday(a.scheduled_date) ? 0 : 1
      const bToday = isToday(b.scheduled_date) ? 0 : 1
      if (aToday !== bToday) return aToday - bToday
      if (a.scheduled_date !== b.scheduled_date)
        return a.scheduled_date.localeCompare(b.scheduled_date)
      return a.scheduled_time_start.localeCompare(b.scheduled_time_start)
    })
  }, [appointments])

  return (
    <div className="flex h-full flex-col gap-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Schedule</h1>
          <p className="mt-1 text-sm text-slate-400">
            {appointments.length} appointments
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#111827] p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === 'list'
                ? 'bg-[#2DD4BF]/10 text-[#2DD4BF]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <List size={14} />
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              viewMode === 'calendar'
                ? 'bg-[#2DD4BF]/10 text-[#2DD4BF]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar size={14} />
            Calendar
          </button>
        </div>
      </div>

      {/* ---- Today's Summary ---- */}
      <TodaySummary appointments={appointments} />

      {/* ---- List View ---- */}
      {viewMode === 'list' && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] md:block">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-[rgba(148,163,184,0.1)]">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Time
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Service Type
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Address
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Est. Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAppointments.map((apt) => (
                  <AppointmentRow key={apt.id} appointment={apt} customers={customers} users={users} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {sortedAppointments.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} customers={customers} users={users} />
            ))}
          </div>
        </>
      )}

      {/* ---- Calendar View (placeholder) ---- */}
      {viewMode === 'calendar' && (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-12">
          <div className="text-center">
            <Calendar
              size={48}
              className="mx-auto mb-4 text-slate-600"
            />
            <h3 className="text-lg font-semibold text-[#F8FAFC]">
              Calendar View
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Full calendar integration coming soon. Use the list view to
              manage your schedule.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
