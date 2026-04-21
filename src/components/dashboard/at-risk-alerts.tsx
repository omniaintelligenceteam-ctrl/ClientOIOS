'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import { Clock, CalendarX, Receipt, CheckCircle2, Bell } from 'lucide-react'

interface AlertCounts {
  overdueFollowUps: number
  tomorrowUnconfirmed: number
  overdueInvoices: number
}

interface AtRiskAlertsProps {
  organizationId: string
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function AtRiskAlerts({ organizationId }: AtRiskAlertsProps) {
  const [counts, setCounts] = useState<AlertCounts>({
    overdueFollowUps: 0,
    tomorrowUnconfirmed: 0,
    overdueInvoices: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) return
    const supabase = createSupabaseBrowserClient()

    async function fetchAll() {
      const today = new Date()
      const twoDaysAgo = new Date(today.getTime() - 2 * 86_400_000)
      const tomorrow = new Date(today.getTime() + 86_400_000)
      const fourteenDaysAgo = new Date(today.getTime() - 14 * 86_400_000)

      const [followUpsRes, appointmentsRes, invoicesRes] = await Promise.all([
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .lt('follow_up_date', toDateStr(twoDaysAgo))
          .not('status', 'eq', 'won')
          .not('status', 'eq', 'lost'),

        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('scheduled_date', toDateStr(tomorrow))
          .not('status', 'eq', 'cancelled')
          .not('status', 'eq', 'completed')
          .not('customer_confirmed', 'eq', true),

        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .lt('due_date', toDateStr(fourteenDaysAgo))
          .not('status', 'eq', 'paid'),
      ])

      setCounts({
        overdueFollowUps: followUpsRes.count || 0,
        tomorrowUnconfirmed: appointmentsRes.count || 0,
        overdueInvoices: invoicesRes.count || 0,
      })
      setLoading(false)
    }

    fetchAll()
  }, [organizationId])

  if (loading) {
    return (
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse flex-shrink-0 h-9 w-32 bg-[rgba(148,163,184,0.06)] rounded-full"
          />
        ))}
      </div>
    )
  }

  const { overdueFollowUps, tomorrowUnconfirmed, overdueInvoices } = counts
  const hasAlerts = overdueFollowUps > 0 || tomorrowUnconfirmed > 0 || overdueInvoices > 0

  if (!hasAlerts) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/20 px-4 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
          <span className="text-sm text-green-400 font-medium">All Clear</span>
        </div>
        <span className="text-xs text-slate-500">No at-risk items detected</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <Bell className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
      <span className="text-xs text-slate-500 flex-shrink-0">Alerts:</span>

      {overdueFollowUps > 0 && (
        <Link
          href="/dashboard/leads?filter=overdue"
          className="flex-shrink-0 flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/25 px-3 py-2 min-h-[44px] hover:bg-amber-500/25 transition-colors"
        >
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs text-amber-300 font-medium">
            {overdueFollowUps} Overdue Follow-up{overdueFollowUps !== 1 ? 's' : ''}
          </span>
        </Link>
      )}

      {tomorrowUnconfirmed > 0 && (
        <Link
          href="/dashboard/schedule?filter=tomorrow-unconfirmed"
          className="flex-shrink-0 flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-500/25 px-3 py-2 min-h-[44px] hover:bg-red-500/25 transition-colors"
        >
          <CalendarX className="h-3.5 w-3.5 text-red-400" />
          <span className="text-xs text-red-300 font-medium">
            {tomorrowUnconfirmed} No-Show Risk{tomorrowUnconfirmed !== 1 ? 's' : ''}
          </span>
        </Link>
      )}

      {overdueInvoices > 0 && (
        <Link
          href="/dashboard/invoicing?filter=overdue"
          className="flex-shrink-0 flex items-center gap-1.5 rounded-full bg-red-500/15 border border-red-500/25 px-3 py-2 min-h-[44px] hover:bg-red-500/25 transition-colors"
        >
          <Receipt className="h-3.5 w-3.5 text-red-400" />
          <span className="text-xs text-red-300 font-medium">
            {overdueInvoices} Overdue Invoice{overdueInvoices !== 1 ? 's' : ''}
          </span>
        </Link>
      )}
    </div>
  )
}
