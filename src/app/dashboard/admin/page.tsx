'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ShieldAlert,
  Building2,
  Phone,
  CheckCircle2,
  Clock,
  Search,
  Loader2,
  Users,
  Activity,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import type { Organization, OnboardingStatus } from '@/lib/types'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const cardClass =
  'bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6'

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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatPhone(phone: string | null): string {
  if (!phone) return '\u2014'
  return phone
}

function formatTrade(trade: string): string {
  return trade
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OrgWithCalls extends Organization {
  callsThisWeek: number
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: OnboardingStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
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
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        TIER_STYLES[tier] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30'
      }`}
    >
      {TIER_LABELS[tier] ?? tier}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminOverviewPage() {
  const { isSuperAdmin, isLoading: authLoading } = useAuth()
  const supabase = createSupabaseBrowserClient()

  const [orgs, setOrgs] = useState<OrgWithCalls[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')

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

      // Compute week boundary
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const weekAgoIso = weekAgo.toISOString()

      // Fetch calls this week (all we can see via RLS)
      const { data: callData } = await supabase
        .from('calls')
        .select('id, organization_id')
        .gte('started_at', weekAgoIso)

      const calls = callData ?? []

      // Build a map of org_id -> call count this week
      const callCountMap: Record<string, number> = {}
      for (const call of calls) {
        const oid = (call as any).organization_id
        callCountMap[oid] = (callCountMap[oid] ?? 0) + 1
      }

      // Merge
      const merged: OrgWithCalls[] = organizations.map((org) => ({
        ...org,
        callsThisWeek: callCountMap[org.id] ?? 0,
      }))

      setOrgs(merged)
      setLoading(false)
    }

    load()
  }, [isSuperAdmin])

  /* ---- Derived stats ---- */

  const totalCalls = useMemo(
    () => orgs.reduce((sum, o) => sum + o.callsThisWeek, 0),
    [orgs]
  )

  const activeClients = useMemo(
    () => orgs.filter((o) => o.onboarding_status === 'live').length,
    [orgs]
  )

  const pendingOnboarding = useMemo(
    () =>
      orgs.filter((o) =>
        ['pending', 'configuring', 'testing'].includes(o.onboarding_status)
      ).length,
    [orgs]
  )

  /* ---- Filtered list ---- */

  const filtered = useMemo(() => {
    return orgs.filter((org) => {
      if (statusFilter !== 'all' && org.onboarding_status !== statusFilter) return false
      if (tierFilter !== 'all' && org.tier !== tierFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const name = org.name.toLowerCase()
        const trade = org.trade.toLowerCase()
        const phone = (org.phone_number ?? '').toLowerCase()
        if (!name.includes(q) && !trade.includes(q) && !phone.includes(q)) return false
      }
      return true
    })
  }, [orgs, statusFilter, tierFilter, search])

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
            You must be a super admin to access the admin overview.
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
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
            Admin Overview
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            All clients at a glance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/admin/clients"
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-[#2DD4BF]/40 hover:text-[#2DD4BF]"
          >
            <Activity className="h-4 w-4" />
            Client Health
          </Link>
          <Link
            href="/dashboard/admin/onboard"
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-4 py-2 text-sm font-semibold text-[#0B1120] shadow-lg shadow-[#2DD4BF]/20 transition-all hover:shadow-[#2DD4BF]/30 active:scale-[0.98]"
          >
            <ArrowUpRight className="h-4 w-4" />
            Onboard Client
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Clients"
          value={orgs.length}
          icon={Building2}
          color="text-[#2DD4BF]"
        />
        <StatCard
          label="Total Calls (Week)"
          value={totalCalls}
          icon={Phone}
          color="text-blue-400"
        />
        <StatCard
          label="Active Clients"
          value={activeClients}
          icon={CheckCircle2}
          color="text-emerald-400"
        />
        <StatCard
          label="Pending Onboarding"
          value={pendingOnboarding}
          icon={Clock}
          color="text-[#f97316]"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2DD4BF]/50 focus:ring-1 focus:ring-[#2DD4BF]/30"
        >
          <option value="all">All Statuses</option>
          <option value="live">Live</option>
          <option value="pending">Pending</option>
          <option value="configuring">Configuring</option>
          <option value="testing">Testing</option>
          <option value="paused">Paused</option>
        </select>

        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#2DD4BF]/50 focus:ring-1 focus:ring-[#2DD4BF]/30"
        >
          <option value="all">All Tiers</option>
          <option value="answering_service">Answering Service</option>
          <option value="office_manager">Office Manager</option>
          <option value="growth_engine">Growth Engine</option>
        </select>

        <div className="relative ml-auto min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/60 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-[#2DD4BF]/50 focus:ring-1 focus:ring-[#2DD4BF]/30"
          />
        </div>
      </div>

      {/* Client Table */}
      <div className="overflow-x-auto rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-medium">Company Name</th>
                <th className="px-4 py-3 font-medium">Trade</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Calls This Week</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((org) => (
                <tr
                  key={org.id}
                  className="group cursor-pointer transition-colors hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/admin/clients/${org.id}`}
                      className="font-medium text-[#F8FAFC] hover:text-[#2DD4BF] transition-colors"
                    >
                      {org.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatTrade(org.trade)}
                  </td>
                  <td className="px-4 py-3">
                    <TierBadge tier={org.tier} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={org.onboarding_status} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">
                    {org.callsThisWeek}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                    {formatPhone(org.phone_number)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                    {formatDate(org.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/admin/clients/${org.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:border-[#2DD4BF]/40 hover:text-[#2DD4BF]"
                    >
                      View
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <Users className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                    {orgs.length === 0
                      ? 'No clients found. Onboard your first client to get started.'
                      : 'No clients match your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer summary */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-[#64748B]">
          Showing {filtered.length} of {orgs.length} client{orgs.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
