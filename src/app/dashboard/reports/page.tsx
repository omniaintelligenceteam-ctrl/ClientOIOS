'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import {
  BarChart3,
  Phone,
  DollarSign,
  ArrowRight,
  FileText,
  PieChart,
  Users,
  Filter,
  LineChart,
  Clock,
  Star,
} from 'lucide-react'
import { MorningBriefingCard } from '@/components/dashboard/morning-briefing-card'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cardClass = 'backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6'

// ---------------------------------------------------------------------------
// Report definitions
// ---------------------------------------------------------------------------

interface ReportDef {
  title: string
  description: string
  icon: React.ElementType
  color: string
}

const reports: ReportDef[] = [
  {
    title: 'Weekly Performance Summary',
    description: 'Calls, leads, jobs booked, and revenue for the past 7 days.',
    icon: BarChart3,
    color: '#2DD4BF',
  },
  {
    title: 'Monthly Business Review',
    description: 'Full-month analysis of growth, retention, and KPIs.',
    icon: FileText,
    color: '#60a5fa',
  },
  {
    title: 'Revenue by Service Type',
    description: 'Breakdown of revenue across all plumbing service categories.',
    icon: PieChart,
    color: '#34d399',
  },
  {
    title: 'Customer Acquisition Report',
    description: 'New customers by source, cost per acquisition, and LTV.',
    icon: Users,
    color: '#f97316',
  },
  {
    title: 'Lead Conversion Funnel',
    description: 'Stage-by-stage conversion rates from inquiry to closed job.',
    icon: Filter,
    color: '#a78bfa',
  },
  {
    title: 'ROI Report',
    description: 'Return on investment for OIOS AI services and marketing spend.',
    icon: LineChart,
    color: '#f472b6',
  },
]

// ---------------------------------------------------------------------------
// Key metrics
// ---------------------------------------------------------------------------

interface MetricDef {
  label: string
  value: string
  subtext: string
  icon: React.ElementType
  color: string
}

interface ReportMetrics {
  answerRate: number
  minutesUsed: number
  minutesIncluded: number
  pipelineValue: number
  conversionRate: number
  reviewAverage: number
  totalReviews: number
  revenueThisMonth: number
  revenueLastMonth: number
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const { organization } = useAuth()
  const supabase = createSupabaseBrowserClient()

  const [metrics, setMetrics] = useState<ReportMetrics>({
    answerRate: 0,
    minutesUsed: 0,
    minutesIncluded: 0,
    pipelineValue: 0,
    conversionRate: 0,
    reviewAverage: 0,
    totalReviews: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
  })

  useEffect(() => {
    const load = async () => {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

      const [callsRes, leadsRes, reviewsRes, invoicesThisRes, invoicesLastRes] = await Promise.all([
        supabase.from('calls').select('id, status'),
        supabase.from('leads').select('id, status, estimated_value'),
        supabase.from('reviews').select('id, rating'),
        supabase.from('invoices').select('id, amount_paid, status').gte('paid_at', monthStart),
        supabase.from('invoices').select('id, amount_paid, status').gte('paid_at', lastMonthStart).lt('paid_at', monthStart),
      ])

      const calls = callsRes.data || []
      const totalCalls = calls.length
      const answeredCalls = calls.filter((c: any) => c.status === 'answered').length
      const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0

      const leads = leadsRes.data || []
      const wonLeads = leads.filter((l: any) => l.status === 'won').length
      const totalLeads = leads.length
      const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0
      const pipelineValue = leads
        .filter((l: any) => !['won', 'lost'].includes(l.status))
        .reduce((s: number, l: any) => s + (l.estimated_value || 0), 0)

      const reviews = reviewsRes.data || []
      const totalReviews = reviews.length
      const reviewAverage = totalReviews > 0
        ? Math.round((reviews.reduce((s: number, r: any) => s + r.rating, 0) / totalReviews) * 10) / 10
        : 0

      const revenueThisMonth = (invoicesThisRes.data || []).reduce((s: number, i: any) => s + (i.amount_paid || 0), 0)
      const revenueLastMonth = (invoicesLastRes.data || []).reduce((s: number, i: any) => s + (i.amount_paid || 0), 0)

      setMetrics({
        answerRate,
        minutesUsed: organization?.monthly_minutes_used ?? 0,
        minutesIncluded: organization?.monthly_minutes_included ?? 0,
        pipelineValue,
        conversionRate,
        reviewAverage,
        totalReviews,
        revenueThisMonth,
        revenueLastMonth,
      })
    }
    load()
  }, [organization])

  const keyMetrics: MetricDef[] = [
    {
      label: 'Answer Rate',
      value: `${metrics.answerRate}%`,
      subtext: 'Industry avg: 72%',
      icon: Phone,
      color: '#2DD4BF',
    },
    {
      label: 'Minutes Used',
      value: `${metrics.minutesUsed}/${metrics.minutesIncluded}`,
      subtext: metrics.minutesIncluded > 0 ? `${Math.round((metrics.minutesUsed / metrics.minutesIncluded) * 100)}% of plan` : '0% of plan',
      icon: Clock,
      color: '#60a5fa',
    },
    {
      label: 'Pipeline Value',
      value: `$${metrics.pipelineValue.toLocaleString()}`,
      subtext: `${metrics.conversionRate}% conversion rate`,
      icon: DollarSign,
      color: '#f97316',
    },
    {
      label: 'Review Average',
      value: String(metrics.reviewAverage),
      subtext: `${metrics.totalReviews} total reviews`,
      icon: Star,
      color: '#fbbf24',
    },
  ]

  const revenueChange = metrics.revenueLastMonth > 0
    ? ((metrics.revenueThisMonth - metrics.revenueLastMonth) / metrics.revenueLastMonth) * 100
    : 0

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-[#2DD4BF]" />
          Reports &amp; Analytics
        </h1>
        <p className="text-slate-400 mt-1">
          Insights, briefings, and performance reports.
        </p>
      </div>

      {/* ── Morning Briefing ────────────────────────────────────────── */}
      <MorningBriefingCard organizationId={organization?.id || ''} />

      {/* ── Key Metrics ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {keyMetrics.map((m) => {
          const Icon = m.icon
          return (
            <div key={m.label} className={cardClass}>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${m.color}20` }}
                >
                  <Icon className="h-5 w-5" style={{ color: m.color }} />
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-1">{m.label}</p>
              <p className="text-3xl font-bold text-slate-100">{m.value}</p>
              <p className="text-xs text-slate-500 mt-1">{m.subtext}</p>
            </div>
          )
        })}
      </div>

      {/* ── Pre-built Reports ───────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#2DD4BF]" />
          Pre-built Reports
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => {
            const Icon = report.icon
            return (
              <button
                key={report.title}
                className={`${cardClass} text-left group hover:border-[rgba(148,163,184,0.2)] transition-all duration-200 hover:shadow-lg hover:shadow-black/10`}
              >
                <div className="flex items-start gap-4 mb-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                    style={{ backgroundColor: `${report.color}15` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: report.color }} />
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-slate-100 mb-1.5 group-hover:text-[#2DD4BF] transition-colors">
                  {report.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  {report.description}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#2DD4BF] group-hover:gap-2 transition-all">
                  View Report
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
