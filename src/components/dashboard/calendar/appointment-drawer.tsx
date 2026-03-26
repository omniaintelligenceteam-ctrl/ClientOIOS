'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Appointment, AppointmentStatus, Customer } from '@/lib/types'

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; bg: string; text: string }> = {
  scheduled:   { label: 'Scheduled',   bg: 'bg-[#60a5fa]/15', text: 'text-[#60a5fa]' },
  confirmed:   { label: 'Confirmed',   bg: 'bg-[#22c55e]/15', text: 'text-[#22c55e]' },
  in_progress: { label: 'In Progress', bg: 'bg-[#2dd4bf]/15', text: 'text-[#2dd4bf]' },
  completed:   { label: 'Completed',   bg: 'bg-[#64748b]/15', text: 'text-[#64748b]' },
  cancelled:   { label: 'Cancelled',   bg: 'bg-[#ef4444]/15', text: 'text-[#ef4444]' },
  no_show:     { label: 'No Show',     bg: 'bg-[#f97316]/15', text: 'text-[#f97316]' },
  rescheduled: { label: 'Rescheduled', bg: 'bg-[#a78bfa]/15', text: 'text-[#a78bfa]' },
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function formatCurrency(val: number | null): string {
  if (!val) return '—'
  return `$${val.toLocaleString()}`
}

interface AppointmentDrawerProps {
  appointment: Appointment
  customer: Customer | null
  onClose: () => void
  onUpdate: () => void
}

export function AppointmentDrawer({ appointment, customer, onClose, onUpdate }: AppointmentDrawerProps) {
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState(appointment.notes ?? '')
  const supabase = createSupabaseBrowserClient()

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const cfg = STATUS_CONFIG[appointment.status] ?? STATUS_CONFIG.scheduled

  const durationMin = (() => {
    const [sh, sm] = appointment.scheduled_time_start.split(':').map(Number)
    const [eh, em] = appointment.scheduled_time_end.split(':').map(Number)
    return (eh * 60 + em) - (sh * 60 + sm)
  })()

  const updateStatus = async (newStatus: AppointmentStatus) => {
    setSaving(true)
    await supabase
      .from('appointments')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', appointment.id)
    setSaving(false)
    onUpdate()
  }

  const saveNotes = async () => {
    setSaving(true)
    await supabase
      .from('appointments')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', appointment.id)
    setSaving(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer: right on desktop, bottom sheet on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[90vh] rounded-t-2xl animate-slide-up-sheet sm:animate-none border-t border-[rgba(148,163,184,0.1)] bg-white/[0.03] shadow-2xl transition-transform duration-300 sm:inset-x-auto sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[440px] sm:rounded-none sm:rounded-l-2xl sm:border-l sm:border-t-0">
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="h-1 w-12 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between border-b border-[rgba(148,163,184,0.1)] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#F8FAFC]">Appointment Details</h2>
            <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Customer info */}
          <section className="mb-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</h3>
            <div className="rounded-xl border border-[rgba(148,163,184,0.08)] bg-[#0B1120] p-4 space-y-2">
              <p className="text-sm font-semibold text-[#F8FAFC]">
                {customer ? `${customer.first_name} ${customer.last_name}` : 'Unknown Customer'}
              </p>
              {customer?.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className="flex items-center gap-2 text-sm text-[#2DD4BF] hover:underline"
                >
                  📞 {customer.phone}
                </a>
              )}
              {customer?.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
                >
                  ✉ {customer.email}
                </a>
              )}
              {customer?.address && (
                <p className="text-sm text-slate-500">📍 {customer.address}</p>
              )}
            </div>
          </section>

          {/* Appointment info */}
          <section className="mb-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Appointment</h3>
            <div className="rounded-xl border border-[rgba(148,163,184,0.08)] bg-[#0B1120] p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Service</span>
                <span className="font-medium text-[#F8FAFC]">{appointment.service_type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Date</span>
                <span className="font-medium text-[#F8FAFC]">{formatDate(appointment.scheduled_date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Time</span>
                <span className="font-medium text-[#F8FAFC]">
                  {formatTime(appointment.scheduled_time_start)} – {formatTime(appointment.scheduled_time_end)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Duration</span>
                <span className="font-medium text-[#F8FAFC]">{durationMin} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Address</span>
                <span className="ml-4 text-right font-medium text-[#F8FAFC]">{appointment.address}</span>
              </div>
              {appointment.estimated_value !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Est. Value</span>
                  <span className="font-semibold text-[#2DD4BF]">{formatCurrency(appointment.estimated_value)}</span>
                </div>
              )}
            </div>
          </section>

          {/* Notes */}
          <section className="mb-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={3}
              placeholder="Add notes..."
              className="w-full resize-none rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] p-3 text-sm text-[#F8FAFC] placeholder-slate-600 outline-none transition-colors focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
            />
          </section>
        </div>

        {/* Actions */}
        <div className="border-t border-[rgba(148,163,184,0.1)] p-4">
          <div className="grid grid-cols-2 gap-2">
            {appointment.status !== 'confirmed' && appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
              <button
                onClick={() => updateStatus('confirmed')}
                disabled={saving}
                className="min-h-[44px] rounded-lg bg-[#22c55e]/10 px-3 py-2.5 text-sm font-semibold text-[#22c55e] transition-colors hover:bg-[#22c55e]/20 disabled:opacity-50"
              >
                ✓ Confirm
              </button>
            )}
            {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
              <button
                onClick={() => updateStatus('completed')}
                disabled={saving}
                className="min-h-[44px] rounded-lg bg-[#2DD4BF]/10 px-3 py-2.5 text-sm font-semibold text-[#2DD4BF] transition-colors hover:bg-[#2DD4BF]/20 disabled:opacity-50"
              >
                ✓ Complete
              </button>
            )}
            {appointment.status !== 'rescheduled' && appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
              <button
                onClick={() => updateStatus('rescheduled')}
                disabled={saving}
                className="min-h-[44px] rounded-lg bg-[#a78bfa]/10 px-3 py-2.5 text-sm font-semibold text-[#a78bfa] transition-colors hover:bg-[#a78bfa]/20 disabled:opacity-50"
              >
                ↩ Reschedule
              </button>
            )}
            {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
              <button
                onClick={() => updateStatus('cancelled')}
                disabled={saving}
                className="min-h-[44px] rounded-lg bg-[#ef4444]/10 px-3 py-2.5 text-sm font-semibold text-[#ef4444] transition-colors hover:bg-[#ef4444]/20 disabled:opacity-50"
              >
                ✕ Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
