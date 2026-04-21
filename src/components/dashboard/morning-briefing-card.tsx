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
  ChevronRight,
  Star,
  Zap,
  CheckCircle,
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
    <div
      className="rounded-2xl p-[1px] animate-pulse"
      style={{ background: 'linear-gradient(135deg, rgba(45,212,191,0.2), rgba(15,23,42,0), rgba(249,115,22,0.1))' }}
    >
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-5 w-5 rounded-full bg-[rgba(148,163,184,0.12)]" />
          <div className="h-4 w-36 rounded bg-[rgba(148,163,184,0.12)]" />
          <div className="ml-auto h-3 w-28 rounded bg-[rgba(148,163,184,0.08)]" />
        </div>
        <div className="space-y-2 mb-6">
          <div className="h-3 w-full rounded bg-[rgba(148,163,184,0.08)]" />
          <div className="h-3 w-5/6 rounded bg-[rgba(148,163,184,0.08)]" />
          <div className="h-3 w-4/6 rounded bg-[rgba(148,163,184,0.08)]" />
        </div>
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 flex-1 rounded-lg bg-[rgba(148,163,184,0.06)]" />
          ))}
        </div>
      </div>
    </div>
  )
}

function NoBriefingYet() {
  return (
    <div
      className="rounded-2xl p-[1px]"
      style={{ background: 'linear-gradient(135deg, rgba(45,212,191,0.15), rgba(15,23,42,0), rgba(45,212,191,0.05))' }}
    >
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sun className="h-5 w-5 text-[#2DD4BF]" />
          <span className="text-xs sm:text-sm font-semibold text-[#F8FAFC]">Morning Briefing</span>
        </div>
        <div className="flex flex-col items-center py-6 gap-3 text-center">
          <Clock className="h-8 w-8 text-[#64748B]" />
          <p className="text-sm text-[#64748B]">Your morning briefing will be ready at 6:30 AM</p>
        </div>
      </div>
    </div>
  )
}

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
// Priority item
// ---------------------------------------------------------------------------

interface PriorityItemProps {
  icon: React.ElementType
  text: string
  variant: 'hot' | 'action' | 'done'
  onClick?: () => void
}

function PriorityItem({ icon: Icon, text, variant, onClick }: PriorityItemProps) {
  const styles = {
    hot:    'bg-amber-500/10 border-amber-500/20 text-amber-300',
    action: 'bg-teal-500/10 border-teal-500/20 text-teal-300',
    done:   'bg-green-500/10 border-green-500/20 text-green-300',
  }

  const iconStyles = {
    hot:    'text-amber-400',
    action: 'text-teal-400',
    done:   'text-green-400',
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${styles[variant]} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${iconStyles[variant]}`} />
      <span className="leading-snug">{text}</span>
      {onClick && <ChevronRight className="h-3 w-3 ml-auto opacity-60" />}
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
      if (!supabase) { setLoading(false); return }

      try {
        const today = getTodayString()
         
        const { data, error } = await (supabase as any)
          .from('daily_reports')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('report_type', 'morning_briefing')
          .eq('report_date', today)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!error && data) setReport(data as DailyReport)
      } catch (err) {
        console.error('Failed to fetch morning briefing:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBriefing()
  }, [organizationId])

  if (loading) return <SkeletonPulse />
  if (!report)  return <NoBriefingYet />

  const metrics             = report.metrics ?? {}
  const callsTotal          = metrics.calls_total          ?? 0
  const leadsNew            = metrics.leads_new            ?? 0
  const appointmentsBooked  = metrics.appointments_booked  ?? 0
  const revenueCollected    = metrics.revenue_collected    ?? 0
  const reviewsNew          = metrics.reviews_new          ?? 0

  const content             = report.content as Record<string, number> | undefined
  const invoicesOverdue     = content?.invoices_overdue    ?? 0
  const leadsHot            = content?.leads_hot           ?? 0
  const appointmentsToday   = content?.appointments_today  ?? 0

  const allZero = callsTotal === 0 && leadsNew === 0 && appointmentsBooked === 0 && revenueCollected === 0
  const narrative =
    allZero && !report.narrative
      ? 'No activity recorded yesterday.'
      : (report.narrative || 'No activity recorded yesterday.')

  const revenueDisplay =
    revenueCollected >= 1000
      ? `$${(revenueCollected / 1000).toFixed(1)}k`
      : `$${Math.round(revenueCollected)}`

  const todayFormatted = formatDate(new Date())

  const hasPriorities = invoicesOverdue > 0 || leadsHot > 0 || appointmentsToday > 0

  return (
    <div
      className="rounded-2xl p-[1px]"
      style={{ background: 'linear-gradient(135deg, rgba(45,212,191,0.3), rgba(15,23,42,0) 50%, rgba(249,115,22,0.15))' }}
    >
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Sun className="h-5 w-5 text-[#2DD4BF] flex-shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-[#F8FAFC]">Morning Briefing</span>
          <span className="ml-auto text-[10px] sm:text-xs text-[#64748B] flex-shrink-0 hidden sm:block">{todayFormatted}</span>
        </div>

        {/* Narrative */}
        <p className="text-slate-300 text-sm leading-relaxed mb-5">{narrative}</p>

        {/* Metric pills */}
        <div className="grid grid-cols-4 sm:flex gap-2 mb-5">
          <MetricPill icon={<Phone className="h-3.5 w-3.5" />}     value={callsTotal}       label="Calls"    />
          <MetricPill icon={<Target className="h-3.5 w-3.5" />}    value={leadsNew}         label="Leads"    />
          <MetricPill icon={<Calendar className="h-3.5 w-3.5" />}  value={appointmentsBooked} label="Booked" />
          <MetricPill icon={<DollarSign className="h-3.5 w-3.5" />} value={revenueDisplay}  label="Revenue"  />
        </div>

        {/* Priorities section */}
        {hasPriorities && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#64748B] mb-2">
              Today&apos;s Priorities
            </p>
            <div className="space-y-1.5">
              {invoicesOverdue > 0 && (
                <PriorityItem
                  icon={AlertTriangle}
                  text={`${invoicesOverdue} overdue invoice${invoicesOverdue !== 1 ? 's' : ''} — collect payment`}
                  variant="hot"
                />
              )}
              {leadsHot > 0 && (
                <PriorityItem
                  icon={Star}
                  text={`${leadsHot} hot lead${leadsHot !== 1 ? 's' : ''} ready for follow-up`}
                  variant="hot"
                />
              )}
              {appointmentsToday > 0 && (
                <PriorityItem
                  icon={Calendar}
                  text={`${appointmentsToday} appointment${appointmentsToday !== 1 ? 's' : ''} on today's schedule`}
                  variant="action"
                />
              )}
              {reviewsNew > 0 && (
                <PriorityItem
                  icon={CheckCircle}
                  text={`${reviewsNew} new review${reviewsNew !== 1 ? 's' : ''} to respond to`}
                  variant="done"
                />
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-[rgba(148,163,184,0.06)]">
          <button className="flex items-center gap-1.5 rounded-lg bg-teal-500/15 border border-teal-500/25 px-3 py-1.5 text-xs font-medium text-teal-400 hover:bg-teal-500/25 transition-colors">
            <Phone className="h-3 w-3" />
            Call Hot Leads
          </button>
          <button className="flex items-center gap-1.5 rounded-lg bg-[rgba(148,163,184,0.08)] border border-[rgba(148,163,184,0.12)] px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-[rgba(148,163,184,0.12)] transition-colors">
            <Calendar className="h-3 w-3" />
            View Schedule
          </button>
          <button className="flex items-center gap-1.5 rounded-lg bg-[rgba(148,163,184,0.08)] border border-[rgba(148,163,184,0.12)] px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-[rgba(148,163,184,0.12)] transition-colors">
            <Zap className="h-3 w-3" />
            Run Automations
          </button>
        </div>

        {/* Reviews footer */}
        {reviewsNew > 0 && !hasPriorities && (
          <p className="mt-3 text-xs text-[#64748B]">
            {reviewsNew} new review{reviewsNew !== 1 ? 's' : ''} posted yesterday
          </p>
        )}
      </div>
    </div>
  )
}
