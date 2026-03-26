'use client'

import { useMemo } from 'react'
import type { Appointment } from '@/lib/types'

type ViewMode = 'month' | 'week' | 'day'

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#60a5fa',
  confirmed: '#22c55e',
  in_progress: '#2dd4bf',
  completed: '#64748b',
  cancelled: '#ef4444',
  no_show: '#f97316',
  rescheduled: '#a78bfa',
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6am to 9pm
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function getAppointmentsForDay(appointments: Appointment[], dateStr: string): Appointment[] {
  return appointments.filter((a) => a.scheduled_date === dateStr)
}

function timeToPercent(time: string): number {
  const [h, m] = time.split(':').map(Number)
  const minutes = (h - 6) * 60 + m // relative to 6am
  return (minutes / (15 * 60)) * 100 // 15-hour window
}

function timeToHeight(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return (diff / (15 * 60)) * 100
}

function format12h(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`
}

/* ------------------------------------------------------------------ */
/*  Month View                                                         */
/* ------------------------------------------------------------------ */

function MonthView({
  currentDate,
  appointments,
  selectedDay,
  onSelectDay,
}: {
  currentDate: Date
  appointments: Appointment[]
  selectedDay: Date
  onSelectDay: (d: Date) => void
}) {
  const today = new Date()
  const todayStr = formatISODate(today)

  // Build calendar grid: 6 rows x 7 cols
  const days = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay() // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = []

    // Pad start
    for (let i = 0; i < firstDay; i++) cells.push(null)
    // Month days
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    // Pad end to complete grid
    while (cells.length % 7 !== 0) cells.push(null)

    return cells
  }, [currentDate])

  const weeks = useMemo(() => {
    const result: (Date | null)[][] = []
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7))
    }
    return result
  }, [days])

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[rgba(148,163,184,0.1)]">
        {DAY_NAMES.map((name) => (
          <div key={name} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="flex-1 overflow-y-auto">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-[rgba(148,163,184,0.05)] last:border-b-0">
            {week.map((day, di) => {
              if (!day) {
                return <div key={di} className="min-h-[100px] border-r border-[rgba(148,163,184,0.05)] p-1 last:border-r-0" />
              }
              const dayStr = formatISODate(day)
              const isToday = dayStr === todayStr
              const isSelected = dayStr === formatISODate(selectedDay)
              const dayAppts = getAppointmentsForDay(appointments, dayStr)

              return (
                <div
                  key={di}
                  onClick={() => onSelectDay(day)}
                  className={`min-h-[100px] cursor-pointer border-r border-[rgba(148,163,184,0.05)] p-1 transition-colors last:border-r-0 hover:bg-white/[0.02] ${
                    isSelected ? 'bg-[#2DD4BF]/[0.05]' : ''
                  }`}
                >
                  {/* Date number */}
                  <div className="mb-1 flex justify-end">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        isToday
                          ? 'bg-[#2DD4BF] text-[#0B1120] font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Appointment dots */}
                  <div className="flex flex-col gap-0.5">
                    {dayAppts.slice(0, 3).map((appt) => (
                      <div
                        key={appt.id}
                        className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-white"
                        style={{ backgroundColor: STATUS_COLORS[appt.status] || '#60a5fa' }}
                        title={`${dayAppts.indexOf(appt) + 1}. ${appt.service_type}`}
                      >
                        {appt.service_type}
                      </div>
                    ))}
                    {dayAppts.length > 3 && (
                      <span className="text-[10px] text-slate-500">+{dayAppts.length - 3} more</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Week View                                                          */
/* ------------------------------------------------------------------ */

function WeekView({
  currentDate,
  appointments,
  selectedDay,
  onSelectDay,
}: {
  currentDate: Date
  appointments: Appointment[]
  selectedDay: Date
  onSelectDay: (d: Date) => void
}) {
  const today = new Date()
  const todayStr = formatISODate(today)

  // Get Mon-Sun of current week
  const weekStart = useMemo(() => {
    const d = new Date(currentDate)
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    d.setHours(0, 0, 0, 0)
    return d
  }, [currentDate])

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [weekStart])

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
      {/* Day headers */}
      <div className="grid grid-cols-8 border-b border-[rgba(148,163,184,0.1)]">
        <div className="w-12 flex-shrink-0 border-r border-[rgba(148,163,184,0.05)]" />
        {weekDays.map((day) => {
          const dayStr = formatISODate(day)
          const isToday = dayStr === todayStr
          const isSelected = dayStr === formatISODate(selectedDay)
          return (
            <div
              key={dayStr}
              onClick={() => onSelectDay(day)}
              className={`flex flex-col items-center justify-center border-r border-[rgba(148,163,184,0.05)] py-2 last:border-r-0 ${isSelected ? 'bg-[#2DD4BF]/[0.05]' : ''}`}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {DAY_NAMES[day.getDay()]}
              </span>
              <span
                className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                  isToday ? 'bg-[#2DD4BF] text-[#0B1120] font-bold' : 'text-slate-300'
                }`}
              >
                {day.getDate()}
              </span>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-8">
          {/* Time labels */}
          <div className="w-12 flex-shrink-0 border-r border-[rgba(148,163,184,0.05)]">
            {HOURS.map((h) => (
              <div key={h} className="h-14 border-b border-[rgba(148,163,184,0.05)] pr-1 text-right">
                <span className="text-[10px] text-slate-500">{format12h(`${h.toString().padStart(2, '0')}:00`)}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const dayStr = formatISODate(day)
            const dayAppts = getAppointmentsForDay(appointments, dayStr)

            return (
              <div key={dayStr} className="relative border-r border-[rgba(148,163,184,0.05)] last:border-r-0">
                {/* Hour slots */}
                {HOURS.map((h) => (
                  <div key={h} className="h-14 border-b border-[rgba(148,163,184,0.05)]" />
                ))}

                {/* Appointment blocks */}
                {dayAppts.map((appt) => {
                  const top = timeToPercent(appt.scheduled_time_start)
                  const height = Math.max(timeToHeight(appt.scheduled_time_start, appt.scheduled_time_end), 20)
                  const color = STATUS_COLORS[appt.status] || '#60a5fa'
                  return (
                    <div
                      key={appt.id}
                      className="absolute left-0.5 right-0.5 z-10 cursor-pointer overflow-hidden rounded px-1 py-0.5 text-[10px] font-medium text-white"
                      style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        backgroundColor: color,
                        minHeight: 20,
                      }}
                      title={appt.service_type}
                    >
                      <span className="block truncate">{format12h(appt.scheduled_time_start)}</span>
                      <span className="block truncate opacity-80">{appt.service_type}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Day View                                                           */
/* ------------------------------------------------------------------ */

function DayView({
  selectedDay,
  appointments,
}: {
  selectedDay: Date
  appointments: Appointment[]
}) {
  const today = new Date()
  const todayStr = formatISODate(today)
  const dayStr = formatISODate(selectedDay)
  const isToday = dayStr === todayStr
  const dayAppts = getAppointmentsForDay(appointments, dayStr)

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[rgba(148,163,184,0.1)] px-4 py-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
            isToday ? 'bg-[#2DD4BF] text-[#0B1120]' : 'bg-[#1E293B] text-slate-300'
          }`}
        >
          {selectedDay.getDate()}
        </span>
        <div>
          <p className="text-sm font-semibold text-[#F8FAFC]">
            {selectedDay.toLocaleDateString('en-US', { weekday: 'long' })}
          </p>
          <p className="text-xs text-slate-500">
            {selectedDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="ml-auto rounded-full bg-[#2DD4BF]/10 px-2.5 py-1 text-xs font-semibold text-[#2DD4BF]">
          {dayAppts.length} appointment{dayAppts.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Time slots */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[60px_1fr]">
          {HOURS.map((h) => {
            const slotTime = `${h.toString().padStart(2, '0')}:00`
            const slotAppts = dayAppts.filter((appt) => {
              return appt.scheduled_time_start >= slotTime && appt.scheduled_time_start < `${(h + 1).toString().padStart(2, '0')}:00`
            })
            return (
              <div key={h} className="flex border-b border-[rgba(148,163,184,0.05)]">
                <div className="w-14 flex-shrink-0 border-r border-[rgba(148,163,184,0.05)] py-2 pr-2 text-right">
                  <span className="text-[11px] text-slate-500">{format12h(slotTime)}</span>
                </div>
                <div className="min-h-[56px] flex-1 px-2 py-1">
                  {slotAppts.map((appt) => {
                    const color = STATUS_COLORS[appt.status] || '#60a5fa'
                    return (
                      <div
                        key={appt.id}
                        className="mb-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: color }}
                        title={`${appt.service_type} (${format12h(appt.scheduled_time_start)} - ${format12h(appt.scheduled_time_end)})`}
                      >
                        <span className="block">{format12h(appt.scheduled_time_start)} – {format12h(appt.scheduled_time_end)}</span>
                        <span className="block opacity-90">{appt.service_type}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  CalendarGrid                                                       */
/* ------------------------------------------------------------------ */

export function CalendarGrid({
  viewMode,
  currentDate,
  appointments,
  selectedDay,
  onSelectDay,
  onSelectAppointment,
  loading,
}: {
  viewMode: ViewMode
  currentDate: Date
  appointments: Appointment[]
  selectedDay: Date
  onSelectDay: (d: Date) => void
  onSelectAppointment?: (appt: Appointment) => void
  loading?: boolean
}) {
  return (
    <div className="h-full">
      {viewMode === 'month' && (
        <MonthView
          currentDate={currentDate}
          appointments={appointments}
          selectedDay={selectedDay}
          onSelectDay={onSelectDay}
        />
      )}
      {viewMode === 'week' && (
        <WeekView
          currentDate={currentDate}
          appointments={appointments}
          selectedDay={selectedDay}
          onSelectDay={onSelectDay}
        />
      )}
      {viewMode === 'day' && (
        <DayView
          selectedDay={selectedDay}
          appointments={appointments}
        />
      )}
    </div>
  )
}
