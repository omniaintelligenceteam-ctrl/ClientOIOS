// Phase Eta: Invoice Threat Board
'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Bell } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface ThreatInvoice { id: string; customer_name: string; amount: number; overdue_days: number; last_reminder: string | null }

interface InvoiceThreatBoardProps { organizationId: string }

export function InvoiceThreatBoard({ organizationId }: InvoiceThreatBoardProps) {
  const [threats, setThreats] = useState<ThreatInvoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) return
    const supabase = createSupabaseBrowserClient()
    const today = new Date()
    const cutoff = new Date(today.getTime() - 15 * 86400000).toISOString()
    supabase
      .from('invoices')
      .select('id, customer:customers(full_name), total_amount, created_at')
      .eq('organization_id', organizationId)
      .in('status', ['sent', 'overdue'])
      .lt('created_at', cutoff)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!data) return
        setThreats(data.map((inv: any) => {
          const dueDays = Math.floor((today.getTime() - new Date(inv.created_at).getTime()) / 86400000)
          return {
            id: inv.id,
            customer_name: inv.customer?.full_name || 'Unknown',
            amount: inv.total_amount || 0,
            overdue_days: dueDays,
            last_reminder: null,
          }
        }))
        setLoading(false)
      })
  }, [organizationId])

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>

  if (threats.length === 0) {
    return (
      <div className="panel p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-green-400 mx-auto mb-2 opacity-50" />
        <p className="text-sm text-slate-400">No overdue invoices. Clean books.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {threats.map((inv) => (
        <div key={inv.id} className="panel p-4 border border-red-500/20 hover:border-red-500/50 transition-colors group">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-white text-sm">{inv.customer_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">Overdue {inv.overdue_days} days</p>
            </div>
            <span className="relative flex h-2 w-2 mt-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-red-400 mt-2">${inv.amount.toLocaleString()}</p>
          <button
            className="mt-3 w-full py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1.5 group-hover:animate-bounce"
          >
            <Bell className="h-3 w-3" /> Send Reminder
          </button>
        </div>
      ))}
    </div>
  )
}
