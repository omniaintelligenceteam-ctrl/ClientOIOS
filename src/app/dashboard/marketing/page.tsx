'use client'

import { useState } from 'react'
import {
  Megaphone,
  Mail,
  MessageSquare,
  Send,
  Eye,
  MousePointerClick,
  DollarSign,
  CalendarDays,
  Star,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types & mock data
// ---------------------------------------------------------------------------

interface Campaign {
  id: string
  name: string
  channel: 'Email' | 'SMS' | 'SMS/Email'
  sent: number
  metric1Label: string
  metric1Value: string
  metric2Label: string
  metric2Value: string
  revenueLabel?: string
  revenueValue?: string
  status: 'active' | 'completed' | 'scheduled'
  color: string
}

const campaigns: Campaign[] = [
  {
    id: 'camp-1',
    name: 'Spring Maintenance Special',
    channel: 'Email',
    sent: 156,
    metric1Label: 'Open Rate',
    metric1Value: '42%',
    metric2Label: 'Conversions',
    metric2Value: '8',
    revenueLabel: 'Revenue',
    revenueValue: '$2,400',
    status: 'active',
    color: '#2DD4BF',
  },
  {
    id: 'camp-2',
    name: 'Dormant Customer Re-engagement',
    channel: 'SMS',
    sent: 45,
    metric1Label: 'Responses',
    metric1Value: '28',
    metric2Label: 'Appointments Booked',
    metric2Value: '6',
    status: 'active',
    color: '#f97316',
  },
  {
    id: 'camp-3',
    name: 'Review Request Campaign',
    channel: 'SMS/Email',
    sent: 30,
    metric1Label: 'Reviews Received',
    metric1Value: '12',
    metric2Label: 'Avg Rating',
    metric2Value: '4.8',
    status: 'active',
    color: '#a78bfa',
  },
]

const stats = [
  { label: 'Total Sent', value: '231', icon: Send, color: '#2DD4BF' },
  { label: 'Open Rate', value: '38%', icon: Eye, color: '#60a5fa' },
  { label: 'Conversions', value: '14', icon: MousePointerClick, color: '#f97316' },
  { label: 'Revenue', value: '$2,400', icon: DollarSign, color: '#34d399' },
]

// Calendar dot data: day -> color(s)
const calendarDots: Record<number, string[]> = {
  3: ['#2DD4BF'],
  5: ['#f97316'],
  8: ['#2DD4BF', '#a78bfa'],
  11: ['#f97316'],
  14: ['#2DD4BF'],
  17: ['#a78bfa'],
  19: ['#2DD4BF', '#f97316'],
  22: ['#f97316'],
  24: ['#2DD4BF'],
  26: ['#a78bfa', '#2DD4BF'],
  28: ['#f97316'],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cardClass = 'bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6'

function channelIcon(channel: string) {
  switch (channel) {
    case 'Email':
      return Mail
    case 'SMS':
      return MessageSquare
    default:
      return Send
  }
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MarketingPage() {
  const now = new Date()
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [calYear, setCalYear] = useState(now.getFullYear())

  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11)
      setCalYear((y) => y - 1)
    } else {
      setCalMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0)
      setCalYear((y) => y + 1)
    } else {
      setCalMonth((m) => m + 1)
    }
  }

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Megaphone className="h-8 w-8 text-[#2DD4BF]" />
          Marketing &amp; Campaigns
        </h1>
        <p className="text-slate-400 mt-1">
          Create, manage, and track your outreach campaigns.
        </p>
      </div>

      {/* ── Campaign Stats ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className={cardClass}>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${s.color}20` }}
                >
                  <Icon className="h-5 w-5" style={{ color: s.color }} />
                </div>
                <p className="text-sm text-slate-400">{s.label}</p>
              </div>
              <p className="text-3xl font-bold">{s.value}</p>
            </div>
          )
        })}
      </div>

      {/* ── Active Campaigns ────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#2DD4BF]" />
          Active Campaigns
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {campaigns.map((c) => {
            const ChannelIcon = channelIcon(c.channel)
            return (
              <div key={c.id} className={`${cardClass} relative overflow-hidden`}>
                {/* Accent bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                  style={{ backgroundColor: c.color }}
                />

                {/* Channel badge */}
                <div className="flex items-center justify-between mb-4 mt-1">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: `${c.color}15`,
                      color: c.color,
                    }}
                  >
                    <ChannelIcon className="h-3.5 w-3.5" />
                    {c.channel}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>

                {/* Name */}
                <h3 className="text-base font-semibold text-slate-100 mb-4">
                  {c.name}
                </h3>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[rgba(148,163,184,0.04)] rounded-lg p-3">
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-0.5">
                      Sent
                    </p>
                    <p className="text-lg font-bold text-slate-100">{c.sent}</p>
                  </div>
                  <div className="bg-[rgba(148,163,184,0.04)] rounded-lg p-3">
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-0.5">
                      {c.metric1Label}
                    </p>
                    <p className="text-lg font-bold text-slate-100">{c.metric1Value}</p>
                  </div>
                  <div className="bg-[rgba(148,163,184,0.04)] rounded-lg p-3">
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-0.5">
                      {c.metric2Label}
                    </p>
                    <p className="text-lg font-bold text-slate-100">{c.metric2Value}</p>
                  </div>
                  {c.revenueLabel && (
                    <div className="bg-[rgba(148,163,184,0.04)] rounded-lg p-3">
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-0.5">
                        {c.revenueLabel}
                      </p>
                      <p className="text-lg font-bold text-green-400">{c.revenueValue}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Content Calendar ────────────────────────────────────────── */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#2DD4BF]" />
            Content Calendar
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-slate-200 min-w-[140px] text-center">
              {MONTH_NAMES[calMonth]} {calYear}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_HEADERS.map((d) => (
            <div
              key={d}
              className="text-center text-[11px] uppercase tracking-wider font-medium text-slate-500 py-2"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Leading empty cells */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dots = calendarDots[day] || []
            const isToday =
              day === now.getDate() &&
              calMonth === now.getMonth() &&
              calYear === now.getFullYear()

            return (
              <div
                key={day}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg transition-colors relative ${
                  isToday
                    ? 'bg-[#2DD4BF]/10 border border-[#2DD4BF]/30'
                    : 'hover:bg-white/[0.03]'
                }`}
              >
                <span
                  className={`text-sm ${
                    isToday ? 'font-bold text-[#2DD4BF]' : 'text-slate-300'
                  }`}
                >
                  {day}
                </span>
                {dots.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dots.map((color, idx) => (
                      <span
                        key={idx}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[rgba(148,163,184,0.08)]">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2DD4BF]" />
            <span className="text-xs text-slate-400">Email Campaign</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
            <span className="text-xs text-slate-400">SMS Campaign</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#a78bfa]" />
            <span className="text-xs text-slate-400">Review Request</span>
          </div>
        </div>
      </div>
    </div>
  )
}
