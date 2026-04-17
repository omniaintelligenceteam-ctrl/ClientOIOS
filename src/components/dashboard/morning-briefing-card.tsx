'use client'

import { useEffect, useState } from 'react'
import {
  Sun,
  Phone,
  Target,
  Calendar,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  Star,
  Zap,
  CheckCircle,
  Sparkles,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
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

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function buildFallbackNarrative(m: {
  callsTotal: number
  leadsNew: number
  appointmentsBooked: number
  revenueCollected: number
}): string {
  const parts: string[] = []
  if (m.callsTotal > 0) parts.push(`handled ${m.callsTotal} call${m.callsTotal !== 1 ? 's' : ''}`)
  if (m.appointmentsBooked > 0) parts.push(`booked ${m.appointmentsBooked} job${m.appointmentsBooked !== 1 ? 's' : ''}`)
  if (m.leadsNew > 0) parts.push(`captured ${m.leadsNew} new lead${m.leadsNew !== 1 ? 's' : ''}`)
  if (m.revenueCollected > 0) {
    const rev = m.revenueCollected >= 1000 ? `$${(m.revenueCollected / 1000).toFixed(1)}k` : `$${Math.round(m.revenueCollected)}`
    parts.push(`earned you ${rev}`)
  }
  if (parts.length === 0) {
    return 'Your AI team is standing by. Quiet night — ready to go the moment the phone rings.'
  }
  return `Your AI team ${parts.join(', ')} while you slept. Here's what needs your eyes today.`
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HeroShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-[1.5px]"
      style={{ background: 'linear-gradient(135deg, rgba(45,212,191,0.45), rgba(15,23,42,0) 55%, rgba(249,115,22,0.28))' }}
    >
      <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6 sm:p-8">
        {children}
      </div>
    </div>
  )
}

function SkeletonPulse() {
  return (
    <HeroShell>
      <div className="animate-pulse">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-6 w-6 rounded-full bg-[rgba(148,163,184,0.12)]" />
          <div className="h-5 w-64 rounded bg-[rgba(148,163,184,0.12)]" />
        </div>
        <div className="space-y-2 mb-6">
          <div className="h-4 w-full rounded bg-[rgba(148,163,184,0.08)]" />
          <div className="h-4 w-5/6 rounded bg-[rgba(148,163,184,0.08)]" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-[rgba(148,163,184,0.06)]" />
          ))}
        </div>
      </div>
    </HeroShell>
  )
}

interface HeroMetricProps {
  icon: React.ReactNode
  value: string | number
  label: string
  accent?: string
}

function HeroMetric({ icon, value, label, accent = 'text-[#2DD4BF]' }: HeroMetricProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-[rgba(148,163,184,0.04)] border border-[rgba(148,163,184,0.08)] px-4 py-3">
      <div className="flex items-center gap-1.5">
        <span className={accent}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-[#64748B]">{label}</span>
      </div>
      <span className="text-2xl font-bold text-[#F8FAFC] leading-none">{value}</span>
    </div>
  )
}

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
  const { profile } = useAuth()

  useEffect(() => {
    async function fetchBriefing() {
      const supabase = createSupabaseBrowserClient()
      if (!supabase) { setLoading(false); return }

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

  // --- Derive content (works whether report exists or not) -----------------
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const now = new Date()
  const greeting = greetingFor(now.getHours())
  const todayFormatted = formatDate(now)

  const metrics            = report?.metrics ?? {}
  const callsTotal         = metrics.calls_total          ?? 0
  const leadsNew           = metrics.leads_new            ?? 0
  const appointmentsBooked = metrics.appointments_booked  ?? 0
  const revenueCollected   = metrics.revenue_collected    ?? 0
  const reviewsNew         = metrics.reviews_new          ?? 0

  const content            = report?.content as Record<string, number> | undefined
  const invoicesOverdue    = content?.invoices_overdue    ?? 0
  const leadsHot           = content?.leads_hot           ?? 0
  const appointmentsToday  = content?.appointments_today  ?? 0

  const narrative =
    report?.narrative ||
    buildFallbackNarrative({ callsTotal, leadsNew, appointmentsBooked, revenueCollected })

  const revenueDisplay =
    revenueCollected >= 1000
      ? `$${(revenueCollected / 1000).toFixed(1)}k`
      : `$${Math.round(revenueCollected)}`

  const hasPriorities = invoicesOverdue > 0 || leadsHot > 0 || appointmentsToday > 0

  return (
    <HeroShell>
      {/* Greeting header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="h-5 w-5 text-[#2DD4BF]" />
            <span className="text-[11px] uppercase tracking-widest font-semibold text-[#2DD4BF]">
              Morning Briefing
            </span>
            <span className="text-[10px] text-[#64748B] hidden sm:inline">· {todayFormatted}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] leading-tight">
            {greeting}, {firstName}.
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-[rgba(45,212,191,0.1)] border border-[rgba(45,212,191,0.25)] px-3 py-1.5 flex-shrink-0">
          <Sparkles className="h-3 w-3 text-[#2DD4BF]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2DD4BF]">AI Team On Duty</span>
        </div>
      </div>

      {/* Narrative — the headline story */}
      <p className="text-base sm:text-lg text-[#F8FAFC] leading-relaxed mb-6 max-w-3xl">
        {narrative}
      </p>

      {/* Hero metric row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <HeroMetric
          icon={<Phone className="h-3.5 w-3.5" />}
          value={callsTotal}
          label="Calls"
        />
        <HeroMetric
          icon={<Target className="h-3.5 w-3.5" />}
          value={leadsNew}
          label="New Leads"
        />
        <HeroMetric
          icon={<Calendar className="h-3.5 w-3.5" />}
          value={appointmentsBooked}
          label="Jobs Booked"
          accent="text-[#f97316]"
        />
        <HeroMetric
          icon={<DollarSign className="h-3.5 w-3.5" />}
          value={revenueDisplay}
          label="Revenue"
          accent="text-[#f97316]"
        />
      </div>

      {/* Priorities */}
      {hasPriorities && (
        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#64748B] mb-2">
            Today&apos;s Priorities
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-[rgba(148,163,184,0.08)]">
        <button className="flex items-center gap-1.5 rounded-lg bg-teal-500/15 border border-teal-500/25 px-3 py-1.5 text-xs font-medium text-teal-400 hover:bg-teal-500/25 transition-colors cursor-pointer">
          <Phone className="h-3 w-3" />
          Call Hot Leads
        </button>
        <button className="flex items-center gap-1.5 rounded-lg bg-[rgba(148,163,184,0.08)] border border-[rgba(148,163,184,0.12)] px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-[rgba(148,163,184,0.12)] transition-colors cursor-pointer">
          <Calendar className="h-3 w-3" />
          View Schedule
        </button>
        <button className="flex items-center gap-1.5 rounded-lg bg-[rgba(148,163,184,0.08)] border border-[rgba(148,163,184,0.12)] px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-[rgba(148,163,184,0.12)] transition-colors cursor-pointer">
          <Zap className="h-3 w-3" />
          Run Automations
        </button>
        {reviewsNew > 0 && !hasPriorities && (
          <span className="ml-auto text-xs text-[#64748B]">
            {reviewsNew} new review{reviewsNew !== 1 ? 's' : ''} posted
          </span>
        )}
      </div>
    </HeroShell>
  )
}
