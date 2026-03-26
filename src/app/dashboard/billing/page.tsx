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
  Phone,
  Mail,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UsageData {
  calls_count: number
  total_minutes: number
  minutes_included: number
  minutes_remaining: number
  usage_percentage: number
}

const TIER_LABELS: Record<string, string> = {
  answering_service: 'Answering Service',
  receptionist: 'Receptionist',
  office_manager: 'Office Manager',
  growth_engine: 'Growth Engine',
  coo: 'COO',
}

const TIER_DESCRIPTIONS: Record<string, string> = {
  answering_service: 'AI-powered call answering, message taking, and basic call routing.',
  receptionist: 'AI receptionist with call handling and message capture.',
  office_manager: 'Full call handling with lead capture, scheduling, customer management, and reviews.',
  growth_engine: 'Everything in Office Manager plus invoicing, marketing automation, and team management.',
  coo: 'Full-stack AI operations — the complete OIOS experience.',
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BillingPage() {
  const { organization, isLoading: authLoading } = useAuth()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [usageLoading, setUsageLoading] = useState(true)

  const tier = organization?.tier || 'office_manager'
  const planName = TIER_LABELS[tier] || tier
  const planDescription = TIER_DESCRIPTIONS[tier] || ''

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
        // Silently degrade
      } finally {
        if (!cancelled) setUsageLoading(false)
      }
    }
    if (!authLoading) fetchUsage()
    return () => { cancelled = true }
  }, [authLoading])

  const minutesUsed = usage?.total_minutes ?? organization?.monthly_minutes_used ?? 0
  const minutesIncluded = usage?.minutes_included ?? organization?.monthly_minutes_included ?? 0
  const isUnlimited = minutesIncluded === 0 || minutesIncluded >= 99999
  const usagePercent = isUnlimited ? 0 : minutesIncluded > 0 ? Math.min(Math.round((minutesUsed / minutesIncluded) * 100), 100) : 0
  const minutesRemaining = isUnlimited ? Infinity : Math.max(minutesIncluded - minutesUsed, 0)

  const barColor = usagePercent >= 90 ? 'from-red-500 to-orange-500' : usagePercent >= 70 ? 'from-orange-500 to-amber-400' : 'from-teal-500 to-teal-400'

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2DD4BF] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Billing &amp; Usage</h1>
        <p className="mt-1 text-sm text-slate-400">Track your usage and manage your account.</p>
      </div>

      {/* Current Plan */}
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2DD4BF]/10">
                <Zap size={20} className="text-[#2DD4BF]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">{planName}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Custom plan</span>
                  <span className="ml-2 rounded-full bg-[#2DD4BF]/10 px-2.5 py-0.5 text-xs font-semibold text-[#2DD4BF]">
                    Active
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{planDescription}</p>
            {minutesIncluded > 0 && !isUnlimited && (
              <p className="mt-2 text-sm text-slate-500">
                <span className="font-medium text-slate-300">{minutesIncluded.toLocaleString()} minutes</span> included per month
              </p>
            )}
            {isUnlimited && (
              <p className="mt-2 text-sm text-slate-500">
                <span className="font-medium text-[#2DD4BF]">Unlimited minutes</span> included
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <a
              href="mailto:team@getoios.com?subject=Plan%20Change%20Request"
              className="flex items-center gap-2 rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-[#2DD4BF]/40 hover:text-[#2DD4BF]"
            >
              <Mail size={16} />
              Request Plan Change
            </a>
            <a
              href="tel:+18667821303"
              className="flex items-center gap-2 rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-5 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-300"
            >
              <Phone size={16} />
              (866) 782-1303
            </a>
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-slate-400" />
          <h3 className="text-base font-semibold text-slate-200">Monthly Usage</h3>
          {usageLoading && (
            <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-[#2DD4BF] border-t-transparent" />
          )}
        </div>

        {isUnlimited ? (
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-slate-100">{Math.round(minutesUsed)}</span>
            <span className="mb-1 text-sm text-slate-400">minutes used this month</span>
            <span className="mb-1 ml-auto rounded-full bg-[#2DD4BF]/10 px-3 py-1 text-xs font-semibold text-[#2DD4BF]">Unlimited</span>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-end justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-100">{Math.round(minutesUsed)}</span>
                <span className="text-sm text-slate-400">/ {minutesIncluded.toLocaleString()} minutes</span>
              </div>
              <span className="text-sm font-semibold text-slate-300">{usagePercent}%</span>
            </div>
            <div className="mb-3 h-3 overflow-hidden rounded-full bg-slate-700/60">
              <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`} style={{ width: `${usagePercent}%` }} />
            </div>
            <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="text-slate-400">
                <span className="font-medium text-slate-300">{Math.round(minutesRemaining).toLocaleString()}</span> minutes remaining
              </span>
              {usagePercent >= 90 && (
                <span className="flex items-center gap-1 text-orange-400">
                  <Clock size={14} />Nearing limit — contact us to adjust
                </span>
              )}
            </div>
          </>
        )}

        {usage && (
          <div className="mt-4 rounded-lg border border-[rgba(148,163,184,0.06)] bg-[#0B1120] px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total calls this month</span>
              <span className="font-semibold text-slate-200">{usage.calls_count}</span>
            </div>
          </div>
        )}
      </div>

      {/* Billing History */}
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-200">Billing History</h3>
          <span className="rounded-full bg-[#f97316]/10 px-3 py-1 text-xs font-medium text-[#f97316]">Coming soon</span>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CreditCard size={32} className="mb-3 text-slate-600" />
          <p className="text-sm text-slate-400">Billing history will appear here once payment processing is connected.</p>
          <p className="mt-1 text-xs text-slate-500">Contact team@getoios.com for current invoices.</p>
        </div>
      </div>

      {/* Support */}
      <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-teal-500/10">
            <ExternalLink size={20} className="text-teal-400" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-200">Questions about billing?</h4>
            <p className="mt-1 text-sm text-slate-400">
              Your plan is customized for your business. Reach out to discuss changes, usage, or payment.
            </p>
            <a href="mailto:team@getoios.com" className="mt-3 inline-block text-sm font-medium text-teal-400 transition-colors hover:text-teal-300">
              team@getoios.com &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
