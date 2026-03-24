'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ShieldAlert,
  Loader2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Phone,
  Settings,
  Eye,
  HeartPulse,
  Building2,
  ArrowLeft,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import type { Organization, OnboardingStatus } from '@/lib/types'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<OnboardingStatus, string> = {
  live: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  configuring: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  testing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  paused: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const TIER_STYLES: Record<string, string> = {
  answering_service: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  receptionist: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  office_manager: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  growth_engine: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  coo: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

const TIER_LABELS: Record<string, string> = {
  answering_service: 'Answering Service',
  receptionist: 'Receptionist',
  office_manager: 'Office Manager',
  growth_engine: 'Growth Engine',
  coo: 'COO',
}

const ONBOARDING_SCORE: Record<OnboardingStatus, number> = {
  live: 30,
  testing: 20,
  configuring: 10,
  pending: 0,
  paused: 0,
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

function formatTrade(trade: string): string {
  return trade
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function healthColor(score: number): string {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

function healthBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500/20 border-emerald-500/30'
  if (score >= 50) return 'bg-yellow-500/20 border-yellow-500/30'
  return 'bg-red-500/20 border-red-500/30'
}

function healthBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-400'
  if (score >= 50) return 'bg-yellow-400'
  return 'bg-red-400'
}

function healthLabel(score: number): string {
  if (score >= 80) return 'Healthy'
  if (score >= 50) return 'Needs Attention'
  return 'At Risk'
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ClientHealth {
  org: Organization
  callsThisWeek: number
  callsLastWeek: number
  healthScore: number
  lastCallAt: string | null
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: OnboardingStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
        STATUS_COLORS[status] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      }`}
    >
      {status}
    </span>
  )
}

function TierBadge({ tier }: { tier: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
        TIER_STYLES[tier] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30'
      }`}
    >
      {TIER_LABELS[tier] ?? tier}
    </span>
  )
}

function TrendIndicator({
  current,
  previous,
}: {
  current: number
  previous: number
}) {
  if (previous === 0 && current === 0) {
    return <span className="text-xs text-slate-500">No calls</span>
  }

  const diff = current - previous
  const isUp = diff > 0
  const isDown = diff < 0

  return (
    <div className="flex items-center gap-1">
      <span className="text-sm font-semibold text-[#F8FAFC]">{current}</span>
      <span className="text-xs text-slate-500">vs {previous}</span>
      {isUp && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />}
      {isDown && <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />}
      {!isUp && !isDown && (
        <span className="text-[10px] text-slate-500">=</span>
      )}
    </div>
  )
}

function HealthCard({ client }: { client: ClientHealth }) {
  const { org, callsThisWeek, callsLastWeek, healthScore, lastCallAt } = client

  return (
    <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-5 transition-all hover:border-[rgba(148,163,184,0.2)] hover:bg-[#111827]/80">
      {/* Top row: name + health score */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[#F8FAFC] truncate">
            {org.name}
          </h3>
          <p className="text-xs text-[#64748B] mt-0.5">{formatTrade(org.trade)}</p>
        </div>
        <div
          className={`flex-shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1 ${healthBg(
            healthScore
          )}`}
        >
          <HeartPulse className={`h-3.5 w-3.5 ${healthColor(healthScore)}`} />
          <span
            className={`text-sm font-bold ${healthColor(healthScore)}`}
          >
            {healthScore}
          </span>
        </div>
      </div>

      {/* Health bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-xs font-medium ${healthColor(healthScore)}`}>
            {healthLabel(healthScore)}
          </span>
          <span className="text-[10px] text-[#64748B] uppercase tracking-wider">
            Health Score
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${healthBarColor(
              healthScore
            )}`}
            style={{ width: `${Math.min(healthScore, 100)}%` }}
          />
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 mb-4">
        <TierBadge tier={org.tier} />
        <StatusBadge status={org.onboarding_status} />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-[rgba(148,163,184,0.04)] border border-[rgba(148,163,184,0.08)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#64748B] mb-1">
            Calls (week)
          </p>
          <TrendIndicator current={callsThisWeek} previous={callsLastWeek} />
        </div>
        <div className="rounded-lg bg-[rgba(148,163,184,0.04)] border border-[rgba(148,163,184,0.08)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[#64748B] mb-1">
            Last Active
          </p>
          <p className="text-sm font-medium text-[#F8FAFC]">
            {lastCallAt ? relativeTime(lastCallAt) : 'Never'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/admin/clients/${org.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-[#2DD4BF]/40 hover:text-[#2DD4BF]"
        >
          <Eye className="h-3.5 w-3.5" />
          View Dashboard
        </Link>
        <Link
          href={`/dashboard/admin/clients/${org.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-[#f97316]/40 hover:text-[#f97316]"
        >
          <Settings className="h-3.5 w-3.5" />
          Edit Config
        </Link>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ClientHealthPage() {
  const { isSuperAdmin, isLoading: authLoading } = useAuth()
  const supabase = createSupabaseBrowserClient()

  const [clients, setClients] = useState<ClientHealth[]>([])
  const [loading, setLoading] = useState(true)

  /* ---- Data fetching ---- */

  useEffect(() => {
    if (!isSuperAdmin) return

    const load = async () => {
      setLoading(true)

      // Fetch organizations
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })

      const organizations = (orgData ?? []) as unknown as Organization[]

      // Time boundaries
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      // Fetch calls from last 2 weeks to compute both this week and last week
      const { data: callData } = await supabase
        .from('calls')
        .select('id, organization_id, started_at')
        .gte('started_at', twoWeeksAgo.toISOString())
        .order('started_at', { ascending: false })

      const calls = callData ?? []

      // Build per-org call stats
      const thisWeekMap: Record<string, number> = {}
      const lastWeekMap: Record<string, number> = {}
      const lastCallMap: Record<string, string> = {}

      for (const call of calls) {
        const oid = (call as any).organization_id
        const startedAt = (call as any).started_at as string

        // Track last call
        if (!lastCallMap[oid] || startedAt > lastCallMap[oid]) {
          lastCallMap[oid] = startedAt
        }

        const callDate = new Date(startedAt)
        if (callDate >= weekAgo) {
          thisWeekMap[oid] = (thisWeekMap[oid] ?? 0) + 1
        } else {
          lastWeekMap[oid] = (lastWeekMap[oid] ?? 0) + 1
        }
      }

      // Calculate health scores and build client health objects
      const clientHealth: ClientHealth[] = organizations.map((org) => {
        const callsThisWeek = thisWeekMap[org.id] ?? 0
        const callsLastWeek = lastWeekMap[org.id] ?? 0

        // Health score formula (0-100):
        // - Onboarding status: 0-30 points
        // - Call volume this week: 0-35 points (capped at 35)
        // - Call trend (week-over-week): 0-20 points
        // - Recency (time since last call): 0-15 points

        // 1. Onboarding component (30 pts max)
        const onboardingScore = ONBOARDING_SCORE[org.onboarding_status] ?? 0

        // 2. Call volume component (35 pts max)
        // 10+ calls/week = full score; scales linearly
        const volumeScore = Math.min(Math.round((callsThisWeek / 10) * 35), 35)

        // 3. Trend component (20 pts max)
        // Positive trend gets full points, flat gets half, declining gets less
        let trendScore = 10 // baseline
        if (callsLastWeek > 0) {
          const ratio = callsThisWeek / callsLastWeek
          if (ratio >= 1.2) trendScore = 20 // growing 20%+
          else if (ratio >= 1.0) trendScore = 15 // stable or slight growth
          else if (ratio >= 0.7) trendScore = 8 // slight decline
          else trendScore = 3 // significant decline
        } else if (callsThisWeek > 0) {
          trendScore = 18 // new activity where there was none
        } else {
          trendScore = 0 // no calls at all
        }

        // 4. Recency component (15 pts max)
        let recencyScore = 0
        const lastCall = lastCallMap[org.id]
        if (lastCall) {
          const hoursSinceLastCall =
            (now.getTime() - new Date(lastCall).getTime()) / (1000 * 60 * 60)
          if (hoursSinceLastCall < 24) recencyScore = 15
          else if (hoursSinceLastCall < 72) recencyScore = 12
          else if (hoursSinceLastCall < 168) recencyScore = 8
          else if (hoursSinceLastCall < 336) recencyScore = 4
          else recencyScore = 1
        }

        // Paused clients get a hard cap
        let healthScore =
          onboardingScore + volumeScore + trendScore + recencyScore
        if (org.onboarding_status === 'paused') {
          healthScore = Math.min(healthScore, 20)
        }

        return {
          org,
          callsThisWeek,
          callsLastWeek,
          healthScore: Math.min(healthScore, 100),
          lastCallAt: lastCallMap[org.id] ?? null,
        }
      })

      // Sort by health score ascending (worst first)
      clientHealth.sort((a, b) => a.healthScore - b.healthScore)

      setClients(clientHealth)
      setLoading(false)
    }

    load()
  }, [isSuperAdmin])

  /* ---- Derived stats ---- */

  const summary = useMemo(() => {
    const total = clients.length
    const healthy = clients.filter((c) => c.healthScore >= 80).length
    const needsAttention = clients.filter(
      (c) => c.healthScore >= 50 && c.healthScore < 80
    ).length
    const atRisk = clients.filter((c) => c.healthScore < 50).length
    const avgScore =
      total > 0
        ? Math.round(
            clients.reduce((sum, c) => sum + c.healthScore, 0) / total
          )
        : 0
    return { total, healthy, needsAttention, atRisk, avgScore }
  }, [clients])

  /* ---- Auth gates ---- */

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#2DD4BF]" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-8 text-center max-w-md">
          <ShieldAlert size={48} className="mx-auto mb-4 text-[#f97316]" />
          <h2 className="text-xl font-bold text-[#F8FAFC] mb-2">Access Denied</h2>
          <p className="text-sm text-[#94A3B8]">
            You must be a super admin to access client health monitoring.
          </p>
        </div>
      </div>
    )
  }

  /* ---- Render ---- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/dashboard/admin"
              className="flex items-center gap-1 text-sm text-[#94A3B8] hover:text-[#2DD4BF] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Admin
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
            Client Health
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Monitor client engagement and satisfaction
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Avg Score
            </span>
            <TrendingUp className={`h-4 w-4 ${healthColor(summary.avgScore)}`} />
          </div>
          <p className={`text-2xl font-bold ${healthColor(summary.avgScore)}`}>
            {summary.avgScore}
          </p>
        </div>
        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Total
            </span>
            <Building2 className="h-4 w-4 text-[#2DD4BF]" />
          </div>
          <p className="text-2xl font-bold text-[#2DD4BF]">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Healthy
            </span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{summary.healthy}</p>
        </div>
        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Attention
            </span>
            <Phone className="h-4 w-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-yellow-400">
            {summary.needsAttention}
          </p>
        </div>
        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              At Risk
            </span>
            <HeartPulse className="h-4 w-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{summary.atRisk}</p>
        </div>
      </div>

      {/* Client Health Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-12 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-600" />
          <p className="text-sm text-slate-500">
            No clients found. Onboard your first client to see health scores.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((client) => (
            <HealthCard key={client.org.id} client={client} />
          ))}
        </div>
      )}
    </div>
  )
}
