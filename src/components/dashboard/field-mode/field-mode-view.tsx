'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Phone, MapPin, Clock, CheckSquare, Square,
  ChevronLeft, ChevronRight, Camera, X, Loader2,
  Calendar, User
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import type { Appointment, Customer } from '@/lib/types'
import { SwipeableCard } from '@/components/ui/swipeable-card'
import { CameraCapture } from './camera-capture'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

interface JobData extends Appointment {
  customer?: Customer
  checklist: ChecklistItem[]
}

const DEFAULT_CHECKLIST: string[] = [
  'Confirm job details with customer',
  'Take before photos',
  'Complete service work',
  'Take after photos',
  'Review work with customer',
  'Collect payment / send invoice',
]

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface FieldModeViewProps {
  onExit: () => void
}

export function FieldModeView({ onExit }: FieldModeViewProps) {
  const { profile } = useAuth()
  const [jobs, setJobs] = useState<JobData[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCamera, setShowCamera] = useState(false)
  const [swiping, setSwiping] = useState(false)

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    if (!supabase || !profile?.organization_id) { setLoading(false); return }
    setLoading(true)
    try {
      const today = todayISO()
      const { data: appts } = await supabase
        .from('appointments')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('scheduled_date', today)
        .in('status', ['scheduled', 'confirmed', 'in_progress'])
        .order('scheduled_time_start', { ascending: true })

      if (!appts?.length) { setJobs([]); setLoading(false); return }

      const customerIds = [...new Set(appts.map((a: any) => a.customer_id))]
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .in('id', customerIds)

      const cMap = new Map((customers ?? []).map((c: any) => [c.id, c]))

      const withChecklist: JobData[] = appts.map((a: any) => ({
        ...a,
        customer: cMap.get(a.customer_id),
        checklist: DEFAULT_CHECKLIST.map((label, i) => ({
          id: `${a.id}-${i}`,
          label,
          done: false,
        })),
      }))
      setJobs(withChecklist)
    } finally {
      setLoading(false)
    }
  }, [profile?.organization_id])

  useEffect(() => { load() }, [load])

  function toggleCheck(jobIdx: number, checkId: string) {
    setJobs(prev => prev.map((j, ji) =>
      ji !== jobIdx ? j : {
        ...j,
        checklist: j.checklist.map(c => c.id === checkId ? { ...c, done: !c.done } : c)
      }
    ))
  }

  function prevJob() {
    if (index > 0) { setSwiping(true); setTimeout(() => { setIndex(i => i - 1); setSwiping(false) }, 150) }
  }
  function nextJob() {
    if (index < jobs.length - 1) { setSwiping(true); setTimeout(() => { setIndex(i => i + 1); setSwiping(false) }, 150) }
  }

  const job = jobs[index]
  const customer = job?.customer
  const phone = customer?.phone ?? job?.notes?.match(/\d{10}/)?.[0] ?? null

  const doneCount = job?.checklist.filter(c => c.done).length ?? 0
  const totalCount = job?.checklist.length ?? 0

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B1120] gap-3">
        <Loader2 size={32} className="text-[#2DD4BF] animate-spin" />
        <p className="text-[#64748B] text-sm">Loading today&apos;s jobs…</p>
      </div>
    )
  }

  /* ---- No jobs ---- */
  if (!jobs.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B1120] px-6 text-center gap-4">
        <Calendar size={48} className="text-[#2DD4BF]/40" />
        <h2 className="text-[#F8FAFC] text-xl font-bold">No jobs today</h2>
        <p className="text-[#64748B] text-sm">You&apos;re all clear. Check the schedule for upcoming work.</p>
        <button
          type="button"
          onClick={onExit}
          className="mt-4 h-12 px-6 rounded-2xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 text-[#2DD4BF] font-semibold"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0B1120] pb-safe">
      {/* Camera overlay */}
      {showCamera && (
        <CameraCapture
          appointmentId={job?.id}
          onClose={() => setShowCamera(false)}
          onCapture={(url, lbl) => console.log('photo saved', url, lbl)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(148,163,184,0.1)] bg-[#0B1120] sticky top-0 z-10">
        <button
          type="button"
          onClick={onExit}
          className="flex items-center justify-center h-11 w-11 rounded-xl text-[#64748B] hover:text-[#F8FAFC]"
        >
          <X size={20} />
        </button>
        <div className="text-center">
          <p className="text-[#2DD4BF] text-xs font-bold uppercase tracking-widest">Field Mode</p>
          <p className="text-[#94A3B8] text-xs">{jobs.length} job{jobs.length !== 1 ? 's' : ''} today</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          className="flex items-center justify-center h-11 w-11 rounded-xl text-[#64748B] hover:text-[#F8FAFC]"
          aria-label="Take photo"
        >
          <Camera size={20} />
        </button>
      </div>

      {/* Job counter + pagination */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={prevJob}
          disabled={index === 0}
          className="flex items-center justify-center h-11 w-11 rounded-xl bg-white/[0.05] text-[#64748B] disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-[#94A3B8] text-sm font-medium">
          Job {index + 1} of {jobs.length}
        </span>
        <button
          type="button"
          onClick={nextJob}
          disabled={index === jobs.length - 1}
          className="flex items-center justify-center h-11 w-11 rounded-xl bg-white/[0.05] text-[#64748B] disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Main job card (swipeable) */}
      <div className={`px-4 transition-opacity duration-150 ${swiping ? 'opacity-0' : 'opacity-100'}`}>
        <SwipeableCard
          className="w-full"
          leftAction={phone ? {
            label: 'Call',
            color: 'bg-teal-500',
            icon: <Phone size={18} />,
            onAction: () => { window.location.href = `tel:${phone}` },
          } : undefined}
          rightAction={{
            label: 'Snooze',
            color: 'bg-orange-500',
            onAction: () => nextJob(),
          }}
        >
          <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-5 space-y-4">
            {/* Service type badge */}
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/30 uppercase tracking-wide">
                {job.service_type}
              </span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                job.status === 'in_progress'
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {job.status.replace('_', ' ')}
              </span>
            </div>

            {/* Customer */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#2DD4BF]/10 flex-shrink-0">
                <User size={18} className="text-[#2DD4BF]" />
              </div>
              <div>
                <p className="text-[#F8FAFC] font-semibold text-base leading-tight">
                  {customer
                    ? `${customer.first_name} ${customer.last_name}`
                    : 'Customer'}
                </p>
                {customer?.email && (
                  <p className="text-[#64748B] text-xs">{customer.email}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-[#94A3B8] flex-shrink-0 mt-0.5" />
              <p className="text-[#94A3B8] text-sm leading-snug">{job.address}</p>
            </div>

            {/* Time */}
            <div className="flex items-center gap-3">
              <Clock size={18} className="text-[#94A3B8] flex-shrink-0" />
              <p className="text-[#94A3B8] text-sm">
                {formatTime(job.scheduled_time_start)} – {formatTime(job.scheduled_time_end)}
              </p>
            </div>

            {/* Notes */}
            {job.notes && (
              <p className="text-[#64748B] text-xs bg-white/[0.03] rounded-xl px-3 py-2 border border-white/[0.06]">
                {job.notes}
              </p>
            )}
          </div>
        </SwipeableCard>
      </div>

      {/* One-tap call button */}
      {phone && (
        <div className="px-4 pt-3">
          <a
            href={`tel:${phone}`}
            className="flex items-center justify-center gap-3 h-14 w-full rounded-2xl bg-[#2DD4BF] text-black font-bold text-base active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(45,212,191,0.3)]"
          >
            <Phone size={22} />
            Call {customer?.first_name ?? 'Customer'} — {phone}
          </a>
        </div>
      )}

      {/* Checklist */}
      <div className="px-4 pt-5 pb-8 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[#F8FAFC] font-semibold text-sm">Job Checklist</h3>
          <span className="text-[#64748B] text-xs">{doneCount}/{totalCount}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/[0.08] rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-[#2DD4BF] rounded-full transition-all duration-300"
            style={{ width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : '0%' }}
          />
        </div>

        <div className="space-y-2">
          {job.checklist.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleCheck(index, item.id)}
              className="flex items-center gap-3 w-full min-h-[52px] px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-left active:bg-white/[0.06] transition-colors"
            >
              {item.done
                ? <CheckSquare size={20} className="text-[#2DD4BF] flex-shrink-0" />
                : <Square size={20} className="text-[#4B5563] flex-shrink-0" />
              }
              <span className={`text-sm ${item.done ? 'text-[#4B5563] line-through' : 'text-[#94A3B8]'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {doneCount === totalCount && totalCount > 0 && (
          <div className="mt-4 flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/20">
            <span className="text-[#2DD4BF] font-semibold text-sm">✓ Job Complete!</span>
          </div>
        )}
      </div>
    </div>
  )
}
