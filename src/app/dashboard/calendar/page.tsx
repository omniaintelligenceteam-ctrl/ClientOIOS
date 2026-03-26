'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import { CalendarGrid } from '@/components/dashboard/calendar/calendar-grid'
import { AppointmentCard } from '@/components/dashboard/calendar/appointment-card'
import { AppointmentDrawer } from '@/components/dashboard/calendar/appointment-drawer'
import { NewAppointmentModal } from '@/components/dashboard/calendar/new-appointment-modal'
import type { Appointment, Customer } from '@/lib/types'

type ViewMode = 'month' | 'week' | 'day'

function todayStartOfDay(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const copy = new Date(d)
  copy.setDate(d.getDate() - day)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function formatISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function CalendarPage() {
  const { profile, organization } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date>(todayStartOfDay())
  const [showNewModal, setShowNewModal] = useState(false)
  const supabase = createSupabaseBrowserClient()

  const fetchAppointments = useCallback(async () => {
    if (!organization?.id) return
    setLoading(true)

    let rangeStart: Date, rangeEnd: Date

    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      monthEnd.setHours(23, 59, 59, 999)
      rangeStart = addDays(monthStart, -7)
      rangeEnd = addDays(monthEnd, 7)
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate)
      rangeStart = weekStart
      rangeEnd = addDays(weekStart, 7)
      rangeEnd.setHours(23, 59, 59, 999)
    } else {
      rangeStart = addDays(selectedDay, -3)
      rangeEnd = addDays(selectedDay, 3)
      rangeEnd.setHours(23, 59, 59, 999)
    }

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('organization_id', organization.id)
      .gte('scheduled_date', formatISODate(rangeStart))
      .lte('scheduled_date', formatISODate(rangeEnd))
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time_start', { ascending: true })

    if (!error && data) {
      setAppointments(data as unknown as Appointment[])
    }
    setLoading(false)
  }, [organization?.id, currentDate, viewMode, selectedDay])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  useEffect(() => {
    if (!organization?.id) return
    const load = async () => {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', organization.id)
        .order('first_name')
      if (data) setCustomers(data as unknown as Customer[])
    }
    load()
  }, [organization?.id])

  const goToPrev = () => {
    setCurrentDate((d) => {
      const copy = new Date(d)
      if (viewMode === 'month') copy.setMonth(copy.getMonth() - 1)
      else if (viewMode === 'week') copy.setDate(copy.getDate() - 7)
      else copy.setDate(copy.getDate() - 1)
      return copy
    })
  }

  const goToNext = () => {
    setCurrentDate((d) => {
      const copy = new Date(d)
      if (viewMode === 'month') copy.setMonth(copy.getMonth() + 1)
      else if (viewMode === 'week') copy.setDate(copy.getDate() + 7)
      else copy.setDate(copy.getDate() + 1)
      return copy
    })
  }

  const goToToday = () => setCurrentDate(new Date())

  const headerLabel = useMemo(() => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } else if (viewMode === 'week') {
      const ws = startOfWeek(currentDate)
      const we = addDays(ws, 6)
      const wsStr = ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const weStr = we.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      return `${wsStr} – ${weStr}, ${we.getFullYear()}`
    } else {
      return selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }
  }, [viewMode, currentDate, selectedDay])

  const selectedDayAppts = useMemo(() => {
    const dayStr = formatISODate(selectedDay)
    return appointments.filter((a) => a.scheduled_date === dayStr)
  }, [appointments, selectedDay])

  const handleRefresh = () => {
    fetchAppointments()
    setSelectedAppointment(null)
    setShowNewModal(false)
  }

  const getCustomerName = (customerId: string) => {
    const c = customers.find((c) => c.id === customerId)
    if (!c) return 'Unknown'
    return `${c.first_name} ${c.last_name}`
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrev}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#111827] text-sm text-slate-400 transition-colors hover:border-[#2DD4BF]/30 hover:text-[#2DD4BF]"
          >
            ‹
          </button>
          <button
            onClick={goToNext}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#111827] text-sm text-slate-400 transition-colors hover:border-[#2DD4BF]/30 hover:text-[#2DD4BF]"
          >
            ›
          </button>
          <button
            onClick={goToToday}
            className="rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#111827] px-3 py-1 text-xs font-medium text-slate-300 transition-colors hover:border-[#2DD4BF]/30 hover:text-[#2DD4BF]"
          >
            Today
          </button>
          <h1 className="ml-2 text-lg font-semibold text-[#F8FAFC] sm:text-xl">
            {headerLabel}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#111827] p-0.5">
            {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                  viewMode === mode
                    ? 'bg-[#2DD4BF]/10 text-[#2DD4BF]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#2DD4BF] px-3 py-2 text-xs font-semibold text-[#0B1120] shadow-lg shadow-[#2DD4BF]/20 transition-all hover:bg-[#5EEAD4] active:scale-95"
          >
            + New Appointment
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <CalendarGrid
          viewMode={viewMode}
          currentDate={currentDate}
          appointments={appointments}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onSelectAppointment={setSelectedAppointment}
          loading={loading}
        />
      </div>

      {(viewMode === 'month' || viewMode === 'week') && (
        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-4 lg:hidden">
          <h2 className="mb-3 text-sm font-semibold text-[#F8FAFC]">
            {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            {' — '}
            {selectedDayAppts.length} appointment{selectedDayAppts.length !== 1 ? 's' : ''}
          </h2>
          {selectedDayAppts.length === 0 ? (
            <p className="text-sm text-slate-500">No appointments for this day.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {selectedDayAppts.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  customerName={getCustomerName(appt.customer_id)}
                  onClick={() => setSelectedAppointment(appt)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === 'day' && selectedDayAppts.length > 0 && (
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-4">
          {selectedDayAppts.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              customerName={getCustomerName(appt.customer_id)}
              onClick={() => setSelectedAppointment(appt)}
            />
          ))}
        </div>
      )}

      {selectedAppointment && (
        <AppointmentDrawer
          appointment={selectedAppointment}
          customer={customers.find((c) => c.id === selectedAppointment.customer_id) ?? null}
          onClose={() => setSelectedAppointment(null)}
          onUpdate={handleRefresh}
        />
      )}

      {showNewModal && (
        <NewAppointmentModal
          customers={customers}
          initialDate={formatISODate(selectedDay)}
          onClose={() => setShowNewModal(false)}
          onCreated={handleRefresh}
        />
      )}
    </div>
  )
}
