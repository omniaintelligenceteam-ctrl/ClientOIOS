'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  CreditCard,
  TrendingUp,
  Zap,
  ExternalLink,
  Clock,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OrgTier = 'answering_service' | 'office_manager' | 'growth_engine'

interface PlanInfo {
  name: string
  price: string
  minutesLabel: string
  minutesIncluded: number | null // null = unlimited
  description: string
}

interface UsageData {
  calls_count: number
  total_minutes: number
  minutes_included: number
  minutes_remaining: number
  usage_percentage: number
}

/* ------------------------------------------------------------------ */
/*  Plan definitions                                                   */
/* ------------------------------------------------------------------ */

const PLANS: Record<OrgTier, PlanInfo> = {
  answering_service: {
    name: 'Answering Service',
    price: '$197',
    minutesLabel: '500 minutes',
    minutesIncluded: 500,
    description:
      'AI-powered call answering, message taking, and basic call routing for small businesses getting started.',
  },
  office_manager: {
    name: 'Office Manager',
    price: '$497',
    minutesLabel: '1,500 minutes',
    minutesIncluded: 1500,
    description:
      'Full call handling with lead capture, appointment scheduling, customer management, and review requests.',
  },
  growth_engine: {
    name: 'Growth Engine',
    price: '$997',
    minutesLabel: 'Unlimited minutes',
    minutesIncluded: null,
    description:
      'Everything in Office Manager plus invoicing, marketing automation, team management, and priority support.',
  },
}

/* ------------------------------------------------------------------ */
/*  Mock billing history                                               */
/* ------------------------------------------------------------------ */

const MOCK_INVOICES = [
  { id: 'INV-2024-003', date: 'Mar 1, 2024', amount: '$497.00', status: 'Paid' },
  { id: 'INV-2024-002', date: 'Feb 1, 2024', amount: '$497.00', status: 'Paid' },
  { id: 'INV-2024-001', date: 'Jan 1, 2024', amount: '$497.00', status: 'Paid' },
]

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function BillingPage() {
  const { organization, isLoading: authLoading } = useAuth()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [usageLoading, setUsageLoading] = useState(true)

  const tier: OrgTier =
    (organization?.tier as OrgTier) || 'office_manager'
  const plan = PLANS[tier] ?? PLANS.office_manager

  /* ---------- Fetch live usage from API ---------- */
  useEffect(() => {
    let cancelled = false

    async function fetchUsage() {
      try {
        const res = await fetch('/api/billing/usage')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setUsage(data)
        }
      } catch {
        // Silently degrade — fall back to org-level data
      } finally {
        if (!cancelled) setUsageLoading(false)
      }
    }

    if (!authLoading) fetchUsage()

    return () => {
      cancelled = true
    }
  }, [authLoading])

  /* ---------- Derived numbers ---------- */
  const minutesUsed =
    usage?.total_minutes ?? organization?.monthly_minutes_used ?? 0
  const minutesIncluded =
    usage?.minutes_included ?? organization?.monthly_minutes_included ?? plan.minutesIncluded ?? 0
  const isUnlimited = plan.minutesIncluded === null
  const usagePercent = isUnlimited
    ? 0
    : minutesIncluded > 0
      ? Math.min(Math.round((minutesUsed / minutesIncluded) * 100), 100)
      : 0
  const minutesRemaining = isUnlimited ? Infinity : Math.max(minutesIncluded - minutesUsed, 0)

  /* ---------- Usage bar color ---------- */
  const barColor =
    usagePercent >= 90
      ? 'from-red-500 to-orange-500'
      : usagePercent >= 70
        ? 'from-orange-500 to-amber-400'
        : 'from-teal-500 to-teal-400'

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2DD4BF] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Billing &amp; Usage</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your subscription, track usage, and view invoices.
        </p>
      </div>

      {/* ============================================================ */}
      {/*  Current Plan Card                                            */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2DD4BF]/10">
                <Zap size={20} className="text-[#2DD4BF]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">{plan.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-extrabold text-slate-100">{plan.price}</span>
                  <span className="text-sm text-slate-400">/ month</span>
                  <span className="ml-2 rounded-full bg-[#2DD4BF]/10 px-2.5 py-0.5 text-xs font-semibold text-[#2DD4BF]">
                    Active
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {plan.description}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              <span className="font-medium text-slate-300">{plan.minutesLabel}</span> included per
              month
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <a
              href="https://getoios.com/form"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#2DD4BF] to-[#5EEAD4] px-5 py-2.5 text-sm font-semibold text-[#0B1120] shadow-lg shadow-[#2DD4BF]/20 transition-all hover:shadow-[#2DD4BF]/30"
            >
              <ArrowUpRight size={16} />
              Upgrade Plan
            </a>
            <button
              disabled
              className="flex items-center gap-2 rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-5 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
              title="Coming soon with Stripe integration"
            >
              <CreditCard size={16} />
              Manage Payment Method
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Usage Card                                                   */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-slate-400" />
          <h3 className="text-base font-semibold text-slate-200">Monthly Usage</h3>
          {usageLoading && (
            <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-[#2DD4BF] border-t-transparent" />
          )}
        </div>

        {isUnlimited ? (
          /* Unlimited plan — simple display */
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-slate-100">
              {Math.round(minutesUsed)}
            </span>
            <span className="mb-1 text-sm text-slate-400">minutes used this month</span>
            <span className="mb-1 ml-auto rounded-full bg-[#2DD4BF]/10 px-3 py-1 text-xs font-semibold text-[#2DD4BF]">
              Unlimited
            </span>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-end justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-100">
                  {Math.round(minutesUsed)}
                </span>
                <span className="text-sm text-slate-400">
                  / {minutesIncluded.toLocaleString()} minutes
                </span>
              </div>
              <span className="text-sm font-semibold text-slate-300">{usagePercent}%</span>
            </div>

            {/* Progress bar */}
            <div className="mb-3 h-3 overflow-hidden rounded-full bg-slate-700/60">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>

            <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-slate-400">
                <span className="font-medium text-slate-300">
                  {Math.round(minutesRemaining).toLocaleString()}
                </span>{' '}
                minutes remaining this billing cycle
              </span>
              {usagePercent >= 90 && (
                <span className="flex items-center gap-1 text-orange-400">
                  <Clock size={14} />
                  Nearing limit — consider upgrading
                </span>
              )}
            </div>
          </>
        )}

        {/* Calls count */}
        {usage && (
          <div className="mt-4 rounded-lg border border-[rgba(148,163,184,0.06)] bg-[#0B1120] px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total calls this month</span>
              <span className="font-semibold text-slate-200">{usage.calls_count}</span>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  Plan Comparison                                              */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-6">
        <h3 className="mb-4 text-base font-semibold text-slate-200">All Plans</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.entries(PLANS) as [OrgTier, PlanInfo][]).map(([key, p]) => {
            const isCurrent = key === tier
            return (
              <div
                key={key}
                className={`rounded-lg border p-4 transition-colors ${
                  isCurrent
                    ? 'border-[#2DD4BF]/40 bg-[#2DD4BF]/5'
                    : 'border-[rgba(148,163,184,0.1)] bg-[#0B1120]'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">{p.name}</span>
                  {isCurrent && (
                    <span className="rounded-full bg-[#2DD4BF]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#2DD4BF]">
                      Current
                    </span>
                  )}
                </div>
                <div className="mb-1 text-xl font-bold text-slate-100">{p.price}</div>
                <div className="text-xs text-slate-400">{p.minutesLabel} / month</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Billing History                                              */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-200">Billing History</h3>
          <span className="rounded-full bg-[#f97316]/10 px-3 py-1 text-xs font-medium text-[#f97316]">
            Coming soon with Stripe integration
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-left">
                <th className="pb-3 pr-4 font-medium text-slate-400">Invoice</th>
                <th className="pb-3 pr-4 font-medium text-slate-400">Date</th>
                <th className="pb-3 pr-4 font-medium text-slate-400">Amount</th>
                <th className="pb-3 font-medium text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_INVOICES.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-slate-700/30 last:border-0"
                >
                  <td className="py-3 pr-4 font-medium text-slate-300">{inv.id}</td>
                  <td className="py-3 pr-4 text-slate-400">{inv.date}</td>
                  <td className="py-3 pr-4 text-slate-300">{inv.amount}</td>
                  <td className="py-3">
                    <span className="flex w-fit items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                      <CheckCircle2 size={12} />
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Need Help                                                    */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-teal-500/10">
            <ExternalLink size={20} className="text-teal-400" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-200">Questions about billing?</h4>
            <p className="mt-1 text-sm text-slate-400">
              Reach out to our team for help with plan changes, invoices, or payment issues.
            </p>
            <a
              href="https://getoios.com/form"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-medium text-teal-400 transition-colors hover:text-teal-300"
            >
              Contact support &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
