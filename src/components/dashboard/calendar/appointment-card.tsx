'use client'

import { useMemo } from 'react'
import type { Appointment, AppointmentStatus } from '@/lib/types'

/* ------------------------------------------------------------------ */
/*  Status config                                                       */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; bg: string; text: string; dot: string }> = {
  scheduled:   { label: 'Scheduled',   bg: 'bg-[#60a5fa]/15',   text: 'text-[#60a5fa]',   dot: 'bg-[#60a5fa]' },
  confirmed:    { label: 'Confirmed',    bg: 'bg-[#22c55e]/15',    text: 'text-[#22c55e]',   dot: 'bg-[#22c55e]' },
  in_progress: { label: 'In Progress', bg: 'bg-[#2dd4bf]/15',   text: 'text-[#2dd4bf]',   dot: 'bg-[#2dd4bf]' },
  completed:   { label: 'Completed',   bg: 'bg-[#64748b]/15',   text: 'text-[#64748b]',   dot: 'bg-[#64748b]' },
  cancelled:   { label: 'Cancelled',   bg: 'bg-[#ef4444]/15',   text: 'text-[#ef4444]',   dot: 'bg-[#ef4444]' },
  no_show:     { label: 'No Show',     bg: 'bg-[#f97316]/15',   text: 'text-[#f97316]',   dot: 'bg-[#f97316]' },
  rescheduled: { label: 'Rescheduled', bg: 'bg-[#a78bfa]/15',   text: 'text-[#a78bfa]',   dot: 'bg-[#a78bfa]' },
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatCurrency(val: number | null): string {
  if (val === null || val === undefined) return ''
  return `$${val.toLocaleString()}`
}

/* ------------------------------------------------------------------ */
/*  At-risk logic                                                       */
/* ------------------------------------------------------------------ */

function isAtRisk(appointment: Appointment): boolean {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  return appointment.scheduled_date === tomorrowStr && appointment.status !== 'confirmed'
}

/* ------------------------------------------------------------------ */
/*  AppointmentCard                                                     */
/* ------------------------------------------------------------------ */

interface AppointmentCardProps {
  appointment: Appointment
  customerName: string
  onClick?: () => void
}

export function AppointmentCard({ appointment, customerName, onClick }: AppointmentCardProps) {
  const cfg = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.scheduled
  const atRisk = isAtRisk(appointment)

  const timeRange = `${formatTime(appointment.scheduled_time_start)} – ${formatTime(appointment.scheduled_time_end)}`

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 transition-all hover:border-[#2DD4BF]/30 hover:shadow-lg hover:shadow-black/20 active:scale-[0.99]"
    >
      {/* Top row: name + status */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[#F8FAFC]">
            {customerName}
          </h3>
          <p className="truncate text-xs text-slate-400">
            {appointment.service_type}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          {atRisk && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f97316]/15 px-2 py-0.5 text-[10px] font-semibold text-[#f97316]">
              ⚠ At Risk
            </span>
          )}
        </div>
      </div>

      {/* Time */}
      <div className="mb-1.5 text-xs text-slate-400">
        {timeRange}
      </div>

      {/* Bottom row: address + value */}
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs text-slate-500">
          {appointment.address || 'No address'}
        </span>
        {appointment.estimated_value && (
          <span className="flex-shrink-0 text-xs font-semibold text-[#2DD4BF]">
            {formatCurrency(appointment.estimated_value)}
          </span>
        )}
      </div>
    </div>
  )
}
