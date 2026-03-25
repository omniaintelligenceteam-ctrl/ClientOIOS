'use client'

import { useEffect, useState } from 'react'
import {
  Sun,
  Phone,
  Target,
  Calendar,
  DollarSign,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { DailyReport } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function getTodayString(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonPulse() {
  return (
    <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="h-5 w-5 rounded-full bg-[rgba(148,163,184,0.12)]" />
        <div className="h-4 w-36 rounded bg-[rgba(148,163,184,0.12)]" />
        <div className="ml-auto h-3 w-28 rounded bg-[rgba(148,163,184,0.08)]" />
      </div>
      {/* Narrative lines */}
      <div className="space-y-2 mb-6">
        <div className="h-3 w-full rounded bg-[rgba(148,163,184,0.08)]" />
        <div className="h-3 w-5/6 rounded bg-[rgba(148,163,184,0.08)]" />
        <div className="h-3 w-4/6 rounded bg-[rgba(148,163,184,0.08)]" />
      </div>
      {/* Metric pills */}
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 flex-1 rounded-lg bg-[rgba(148,163,184,0.06)]" />
        ))}
      </div>
    </div>
  )
}

function NoBriefingYet() {
  return (
    <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Sun className="h-5 w-5 text-[#2DD4BF]" />
        <span className="text-sm font-semibold text-[#F8FAFC]">Morning Briefing</span>
      </div>
      <div className="flex flex-col items-center py-6 gap-3 text-center">
        <Clock className="h-8 w-8 text-[#64748B]" />
        <p className="text-sm text-[#64748B]">Your morning briefing will be ready at 6:30 AM</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Metric pill
// ---------------------------------------------------------------------------

interface MetricPillProps {
  icon: React.ReactNode
  value: string | number
  label: string
}

function MetricPill({ icon, value, label }: MetricPillProps) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-lg bg-[rgba(148,163,184,0.06)] px-3 py-2">
      <div className="text-[#94A3B8]">{icon}</div>
      <span className="text-sm font-bold text-[#F8FAFC]">{value}</span>
      <span className="text-[10px] text-[#64748B] text-center leading-tight">{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface MorningBriefingCardProps {
  organizationId: string
}

export function MorningBriefingCard({ organizationId }: MorningBriefingCardProps) {
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<DailyReport | null>(null)

  useEffect(() => {
    async function fetchBriefing() {
      const supabase = createSupabaseBrowserClient()
      if (!supabase) {
        setLoading(false)
        return
      }

      try {
        const today = getTodayString()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('daily_reports')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('report_type', 'morning_briefing')
          .eq('report_date', today)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!error && data) {
          setReport(data as DailyReport)
        }
      } catch (err) {
        console.error('Failed to fetch morning briefing:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBriefing()
  }, [organizationId])

  // --- Loading ---
  if (loading) return <SkeletonPulse />

  // --- No briefing yet (not generated or before 6:30 AM) ---
  if (!report) return <NoBriefingYet />

  // --- Extract metrics ---
  const metrics = report.metrics ?? {}
  const callsTotal         = metrics.calls_total        ?? 0
  const leadsNew           = metrics.leads_new           ?? 0
  const appointmentsBooked = metrics.appointments_booked ?? 0
  const revenueCollected   = metrics.revenue_collected   ?? 0
  const reviewsNew         = metrics.reviews_new         ?? 0

  // Content metrics for action items
  const content = report.content as Record<string, number> | undefined
  const invoicesOverdue    = content?.invoices_overdue    ?? 0
  const leadsHot           = content?.leads_hot           ?? 0
  const appointmentsToday  = content?.appointments_today  ?? 0

  const allZero = callsTotal === 0 && leadsNew === 0 && appointmentsBooked === 0 && revenueCollected === 0

  const narrative =
    allZero && !report.narrative
      ? 'No activity recorded yesterday.'
      : (report.narrative || 'No activity recorded yesterday.')

  const hasActionItems = invoicesOverdue > 0 || leadsHot > 0

  const todayFormatted = formatDate(new Date())

  // Format revenue
  const revenueDisplay =
    revenueCollected >= 1000
      ? `$${(revenueCollected / 1000).toFixed(1)}k`
      : `$${Math.round(revenueCollected)}`

  return (
    <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Sun className="h-5 w-5 text-[#2DD4BF] flex-shrink-0" />
        <span className="text-sm font-semibold text-[#F8FAFC]">Morning Briefing</span>
        <span className="ml-auto text-xs text-[#64748B] flex-shrink-0">{todayFormatted}</span>
      </div>

      {/* Narrative */}
      <p className="text-slate-300 text-sm leading-relaxed mb-5">{narrative}</p>

      {/* Metric pills */}
      <div className="flex gap-2 mb-5">
        <MetricPill
          icon={<Phone className="h-3.5 w-3.5" />}
          value={callsTotal}
          label="Calls"
        />
        <MetricPill
          icon={<Target className="h-3.5 w-3.5" />}
          value={leadsNew}
          label="Leads"
        />
        <MetricPill
          icon={<Calendar className="h-3.5 w-3.5" />}
          value={appointmentsBooked}
          label="Booked"
        />
        <MetricPill
          icon={<DollarSign className="h-3.5 w-3.5" />}
          value={revenueDisplay}
          label="Revenue"
        />
      </div>

      {/* Action items */}
      {hasActionItems && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#64748B]">
            Action Items
          </p>
          {invoicesOverdue > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-xs text-amber-300">
                {invoicesOverdue} overdue invoice{invoicesOverdue !== 1 ? 's' : ''} need attention
              </span>
            </div>
          )}
          {leadsHot > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-xs text-amber-300">
                {leadsHot} hot lead{leadsHot !== 1 ? 's' : ''} waiting for follow-up
              </span>
            </div>
          )}
          {appointmentsToday > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-[rgba(45,212,191,0.08)] border border-[rgba(45,212,191,0.2)] px-3 py-2">
              <Calendar className="h-3.5 w-3.5 text-[#2DD4BF] flex-shrink-0" />
              <span className="text-xs text-[#5EEAD4]">
                {appointmentsToday} appointment{appointmentsToday !== 1 ? 's' : ''} on today's schedule
              </span>
            </div>
          )}
        </div>
      )}

      {/* Today's schedule hint when no action items */}
      {!hasActionItems && appointmentsToday > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-[rgba(45,212,191,0.08)] border border-[rgba(45,212,191,0.2)] px-3 py-2">
          <Calendar className="h-3.5 w-3.5 text-[#2DD4BF] flex-shrink-0" />
          <span className="text-xs text-[#5EEAD4]">
            {appointmentsToday} appointment{appointmentsToday !== 1 ? 's' : ''} on today's schedule
          </span>
        </div>
      )}

      {/* Footer: review count if any */}
      {reviewsNew > 0 && (
        <p className="mt-3 text-xs text-[#64748B]">
          {reviewsNew} new review{reviewsNew !== 1 ? 's' : ''} posted yesterday
        </p>
      )}
    </div>
  )
}
