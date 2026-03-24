'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  Phone,
  Search,
  Calendar,
  Clock,
  ArrowUpRight,
  Smile,
  Meh,
  Frown,
  AlertCircle,
  Eye,
  BarChart3,
  PhoneIncoming,
  PhoneMissed,
  Timer,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import type { Call, Sentiment } from '@/lib/types'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDuration(seconds: number): string {
  if (seconds === 0) return '\u2014'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const statusColors: Record<string, string> = {
  answered: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  missed: 'bg-red-500/20 text-red-400 border-red-500/30',
  voicemail: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  transferred: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  abandoned: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

function SentimentIcon({ sentiment }: { sentiment: Sentiment }) {
  switch (sentiment) {
    case 'positive':
      return <Smile className="h-5 w-5 text-emerald-400" />
    case 'neutral':
      return <Meh className="h-5 w-5 text-yellow-400" />
    case 'negative':
      return <Frown className="h-5 w-5 text-red-400" />
    case 'urgent':
      return <AlertCircle className="h-5 w-5 text-red-500" />
    default:
      return <Meh className="h-5 w-5 text-slate-500" />
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CallLogPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sentimentFilter, setSentimentFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const supabase = createSupabaseBrowserClient()

  const fetchCalls = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('calls')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100)

    if (data) setCalls(data as unknown as Call[])
    setLoading(false)
  }

  const syncCalls = async () => {
    setSyncing(true)
    await fetch('/api/calls/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 50 }),
    })
    await fetchCalls()
    setSyncing(false)
  }

  useEffect(() => { fetchCalls() }, [])

  const stats = useMemo(() => {
    const total = calls.length
    if (total === 0) return { total: 0, answerRate: 0, avgDuration: 0, escalationRate: 0 }
    const answered = calls.filter((c) => c.status === 'answered').length
    const answerRate = Math.round((answered / total) * 100)
    const totalDuration = calls.reduce((sum, c) => sum + c.duration_seconds, 0)
    const avgDuration = answered > 0 ? Math.round(totalDuration / answered) : 0
    const escalated = calls.filter((c) => c.escalated_to_human).length
    const escalationRate = Math.round((escalated / total) * 100)
    return { total, answerRate, avgDuration, escalationRate }
  }, [calls])

  const filtered = useMemo(() => {
    return calls.filter((call) => {
      if (statusFilter !== 'all' && call.status !== statusFilter) return false
      if (sentimentFilter !== 'all' && call.sentiment !== sentimentFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const name = (call.caller_name ?? '').toLowerCase()
        const phone = call.caller_phone.toLowerCase()
        const summary = (call.transcript_summary ?? '').toLowerCase()
        if (!name.includes(q) && !phone.includes(q) && !summary.includes(q)) return false
      }
      return true
    })
  }, [calls, statusFilter, sentimentFilter, search])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Call Center</h1>
          <p className="mt-1 text-sm text-slate-400">Live calls from your AI receptionist</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={syncCalls} disabled={syncing} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-[#2DD4BF]/40 hover:text-[#2DD4BF] disabled:opacity-50">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncing ? 'Syncing...' : 'Sync Retell'}
          </button>
          <div className="flex items-center gap-1 rounded-xl bg-[#111827] p-1 border border-[rgba(148,163,184,0.1)]">
            <button className="rounded-lg bg-[#2DD4BF]/15 px-4 py-2 text-sm font-medium text-[#2DD4BF]">Log</button>
            <Link href="/dashboard/calls/analytics" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
              <span className="flex items-center gap-1.5"><BarChart3 className="h-4 w-4" />Analytics</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Calls', value: stats.total.toString(), icon: Phone, color: 'text-[#2DD4BF]' },
          { label: 'Answer Rate', value: `${stats.answerRate}%`, icon: PhoneIncoming, color: 'text-emerald-400' },
          { label: 'Avg Duration', value: formatDuration(stats.avgDuration), icon: Timer, color: 'text-blue-400' },
          { label: 'Escalation Rate', value: `${stats.escalationRate}%`, icon: ArrowUpRight, color: 'text-orange-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className={`mt-2 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2DD4BF]/50 focus:ring-1 focus:ring-[#2DD4BF]/30">
          <option value="all">All Statuses</option>
          <option value="answered">Answered</option>
          <option value="missed">Missed</option>
          <option value="voicemail">Voicemail</option>
          <option value="transferred">Transferred</option>
        </select>
        <select value={sentimentFilter} onChange={(e) => setSentimentFilter(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2DD4BF]/50 focus:ring-1 focus:ring-[#2DD4BF]/30">
          <option value="all">All Sentiments</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
          <option value="urgent">Urgent</option>
        </select>
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-400">
          <Calendar className="h-4 w-4" /><span>Last 7 days</span>
        </div>
        <div className="relative ml-auto min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search calls..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800/60 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-[#2DD4BF]/50 focus:ring-1 focus:ring-[#2DD4BF]/30" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-medium">Date / Time</th>
                <th className="px-4 py-3 font-medium">Caller</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Sentiment</th>
                <th className="px-4 py-3 font-medium">AI Summary</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((call) => (
                <tr key={call.id} className="group cursor-pointer transition-colors hover:bg-slate-800/50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      {formatDateTime(call.started_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {call.caller_name ?? <span className="text-slate-500 italic">Unknown</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">{call.caller_phone}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-300">{formatDuration(call.duration_seconds)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[call.status] ?? statusColors.abandoned}`}>
                      {call.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <SentimentIcon sentiment={call.sentiment} />
                      <span className="hidden text-xs capitalize text-slate-400 lg:inline">{call.sentiment}</span>
                    </div>
                  </td>
                  <td className="max-w-[260px] px-4 py-3">
                    <p className="truncate text-slate-400">
                      {call.transcript_summary ?? <span className="italic text-slate-600">No summary</span>}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:border-[#2DD4BF]/40 hover:text-[#2DD4BF]">
                      <Eye className="h-3.5 w-3.5" />View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <PhoneMissed className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                    No calls match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
