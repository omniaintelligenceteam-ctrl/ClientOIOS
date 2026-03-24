'use client'

import Link from 'next/link'
import {
  Phone,
  PhoneIncoming,
  Timer,
  Gauge,
  ArrowLeft,
} from 'lucide-react'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

/* ------------------------------------------------------------------ */
/*  Mock chart data                                                    */
/* ------------------------------------------------------------------ */

const callsOverTime = (() => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const values = [3, 5, 4, 6, 8, 5, 4]
  return days.map((day, i) => ({ day, calls: values[i] }))
})()

const intentData = [
  { name: 'Schedule', value: 40, color: '#2DD4BF' },
  { name: 'Quote', value: 25, color: '#f97316' },
  { name: 'Emergency', value: 15, color: '#ef4444' },
  { name: 'General', value: 10, color: '#8b5cf6' },
  { name: 'Follow-up', value: 10, color: '#3b82f6' },
]

const sentimentData = [
  { name: 'Positive', count: 4, fill: '#34d399' },
  { name: 'Neutral', count: 1, fill: '#facc15' },
  { name: 'Negative', count: 1, fill: '#f87171' },
  { name: 'Urgent', count: 1, fill: '#ef4444' },
]

const peakHoursData = (() => {
  const hours = [
    { hour: '7am', calls: 1 },
    { hour: '8am', calls: 3 },
    { hour: '9am', calls: 5 },
    { hour: '10am', calls: 7 },
    { hour: '11am', calls: 4 },
    { hour: '12pm', calls: 2 },
    { hour: '1pm', calls: 3 },
    { hour: '2pm', calls: 6 },
    { hour: '3pm', calls: 5 },
    { hour: '4pm', calls: 4 },
    { hour: '5pm', calls: 2 },
    { hour: '6pm', calls: 1 },
  ]
  return hours
})()

/* ------------------------------------------------------------------ */
/*  Shared tooltip style                                               */
/* ------------------------------------------------------------------ */

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#1e293b',
    border: '1px solid rgba(148,163,184,0.15)',
    borderRadius: '0.75rem',
    color: '#e2e8f0',
    fontSize: '0.8rem',
  },
  itemStyle: { color: '#cbd5e1' },
  cursor: { stroke: 'rgba(45,212,191,0.3)' },
}

/* ------------------------------------------------------------------ */
/*  Custom pie label                                                   */
/* ------------------------------------------------------------------ */

const renderPieLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  name,
  value,
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  name: string
  value: number
}) => {
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 24
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="#94a3b8"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
    >
      {name} ({value}%)
    </text>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CallAnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/calls"
          className="flex items-center justify-center rounded-xl border border-slate-700 p-2 text-slate-400 transition-colors hover:border-[#2DD4BF]/40 hover:text-[#2DD4BF]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Call Analytics</h1>
          <p className="mt-1 text-sm text-slate-400">
            Performance insights for your AI receptionist
          </p>
        </div>
      </div>

      {/* ---- Stat Cards ---- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Total Calls',
            value: '7',
            sub: 'This period',
            icon: Phone,
            color: 'text-[#2DD4BF]',
          },
          {
            label: 'Answer Rate',
            value: '86%',
            sub: '6 of 7 answered',
            icon: PhoneIncoming,
            color: 'text-emerald-400',
          },
          {
            label: 'Avg Duration',
            value: '3:06',
            sub: '186 seconds',
            icon: Timer,
            color: 'text-blue-400',
          },
          {
            label: 'Minutes Used',
            value: '247 / 500',
            sub: '49% of plan',
            icon: Gauge,
            color: 'text-orange-400',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                {s.label}
              </span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className={`mt-2 text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs text-slate-500">{s.sub}</p>

            {/* Minutes progress bar */}
            {s.label === 'Minutes Used' && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2DD4BF] to-orange-400"
                  style={{ width: '49.4%' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ---- Charts Grid ---- */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calls Over Time */}
        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">
            Calls Over Time
          </h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={callsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(148,163,184,0.1)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip {...tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="#2DD4BF"
                  strokeWidth={2.5}
                  dot={{ fill: '#2DD4BF', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#2DD4BF', stroke: '#111827', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Intent Distribution */}
        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">
            Intent Distribution
          </h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={intentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  dataKey="value"
                  label={renderPieLabel}
                  paddingAngle={3}
                  stroke="none"
                >
                  {intentData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle.contentStyle}
                  itemStyle={tooltipStyle.itemStyle}
                  formatter={(value: number) => [`${value}%`, 'Share']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment Breakdown */}
        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">
            Sentiment Breakdown
          </h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sentimentData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(148,163,184,0.1)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {sentimentData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Hours */}
        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">
            Peak Hours
          </h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(148,163,184,0.1)' }}
                  tickLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={45}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="calls" fill="#2DD4BF" radius={[6, 6, 0, 0]}>
                  {peakHoursData.map((entry) => (
                    <Cell
                      key={entry.hour}
                      fill={entry.calls >= 6 ? '#f97316' : '#2DD4BF'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
