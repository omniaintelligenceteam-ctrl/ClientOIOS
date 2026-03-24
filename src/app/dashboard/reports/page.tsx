'use client'

import {
  BarChart3,
  Sun,
  Phone,
  Target,
  Calendar,
  DollarSign,
  TrendingUp,
  ArrowRight,
  FileText,
  PieChart,
  Users,
  Filter,
  LineChart,
  Award,
  Clock,
  Star,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { demoMetrics } from '@/lib/demo-data'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cardClass = 'bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6'

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

const keyMetrics: MetricDef[] = [
  {
    label: 'Answer Rate',
    value: `${demoMetrics.answerRate}%`,
    subtext: 'Industry avg: 72%',
    icon: Phone,
    color: '#2DD4BF',
  },
  {
    label: 'Minutes Used',
    value: `${demoMetrics.minutesUsed}/${demoMetrics.minutesIncluded}`,
    subtext: `${Math.round((demoMetrics.minutesUsed / demoMetrics.minutesIncluded) * 100)}% of plan`,
    icon: Clock,
    color: '#60a5fa',
  },
  {
    label: 'Pipeline Value',
    value: `$${demoMetrics.pipelineValue.toLocaleString()}`,
    subtext: `${demoMetrics.conversionRate}% conversion rate`,
    icon: DollarSign,
    color: '#f97316',
  },
  {
    label: 'Review Average',
    value: String(demoMetrics.reviewAverage),
    subtext: `${demoMetrics.totalReviews} total reviews`,
    icon: Star,
    color: '#fbbf24',
  },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const revenueChange =
    ((demoMetrics.revenueThisMonth - demoMetrics.revenueLastMonth) /
      demoMetrics.revenueLastMonth) *
    100

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
      <div
        className="bg-[#111827] rounded-2xl p-6 border-2 border-[#2DD4BF]/30 relative overflow-hidden"
      >
        {/* Subtle glow */}
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-[#2DD4BF]/5 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2DD4BF]/15">
              <Sun className="h-5 w-5 text-[#2DD4BF]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                Morning Briefing
              </h2>
              <p className="text-sm text-slate-400">
                Good morning, Mike. Here&apos;s your daily briefing.
              </p>
            </div>
          </div>

          {/* Yesterday stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-[rgba(148,163,184,0.04)] border border-[rgba(148,163,184,0.08)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="h-4 w-4 text-[#2DD4BF]" />
                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  Yesterday
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-100">6</p>
              <p className="text-xs text-slate-400 mt-0.5">calls answered</p>
            </div>
            <div className="bg-[rgba(148,163,184,0.04)] border border-[rgba(148,163,184,0.08)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-[#f97316]" />
                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  Leads
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-100">2</p>
              <p className="text-xs text-slate-400 mt-0.5">captured</p>
            </div>
            <div className="bg-[rgba(148,163,184,0.04)] border border-[rgba(148,163,184,0.08)] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-[#60a5fa]" />
                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  Booked
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-100">1</p>
              <p className="text-xs text-slate-400 mt-0.5">appointment</p>
            </div>
          </div>

          {/* Revenue highlight */}
          <div className="flex items-center gap-4 mb-6 bg-[rgba(148,163,184,0.04)] border border-[rgba(148,163,184,0.08)] rounded-xl p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-400/10 flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Revenue This Month</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-100">
                  ${demoMetrics.revenueThisMonth.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-green-400">
                  +{revenueChange.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Action items */}
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-3">
              Action Items
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-3 text-sm">
                <AlertCircle className="h-4 w-4 text-[#f97316] flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  Follow up with <span className="font-medium text-[#f97316]">Brandon Stewart</span> (sewer line $3,500)
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[#2DD4BF] flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  Review <span className="font-medium text-[#2DD4BF]">Maria&apos;s</span> 5-star Google review
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
