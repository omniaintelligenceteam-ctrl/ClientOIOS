// Phase Eta: AR Age Buckets
'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Invoice { id: string; customer_name: string; amount: number; due_days: number; status: string }

interface ARBucket {
  label: string
  range: string
  color: string
  textColor: string
  invoices: Invoice[]
  total: number
}

const BUCKETS = [
  { label: '0–7 Days', range: '0-7', color: 'bg-green-500/10 border-green-500/30', textColor: 'text-green-400', badge: 'bg-green-500/20 text-green-400' },
  { label: '8–14 Days', range: '8-14', color: 'bg-yellow-500/10 border-yellow-500/30', textColor: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400' },
  { label: '15–30 Days', range: '15-30', color: 'bg-orange-500/10 border-orange-500/30', textColor: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-400' },
  { label: '30+ Days', range: '30+', color: 'bg-red-500/10 border-red-500/30', textColor: 'text-red-400', badge: 'bg-red-500/20 text-red-400' },
]

function getBucket(dueDays: number): number {
  if (dueDays <= 7) return 0
  if (dueDays <= 14) return 1
  if (dueDays <= 30) return 2
  return 3
}

interface ARAgeBucketsProps { organizationId: string }

export function ARAgeBuckets({ organizationId }: ARAgeBucketsProps) {
  const [buckets, setBuckets] = useState<ARBucket[]>(BUCKETS.map((b) => ({ ...b, invoices: [], total: 0 })))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) return
    const supabase = createSupabaseBrowserClient()
    supabase
      .from('invoices')
      .select('id, customer:customers(full_name), total_amount, status')
      .eq('organization_id', organizationId)
      .in('status', ['sent', 'viewed', 'overdue'])
      .then(({ data }: { data: any }) => {
        if (!data) return
        const today = new Date()
        const filled = BUCKETS.map((b) => ({ ...b, invoices: [] as Invoice[], total: 0 }))
        data.forEach((inv: any) => {
          const dueDate = new Date(inv.created_at)
          const dueDays = Math.floor((today.getTime() - dueDate.getTime()) / 86400000)
          const bi = getBucket(dueDays)
          filled[bi].invoices.push({
            id: inv.id,
            customer_name: inv.customer?.full_name || 'Unknown',
            amount: inv.total_amount || 0,
            due_days: dueDays,
            status: inv.status,
          })
          filled[bi].total += inv.total_amount || 0
        })
        setBuckets(filled)
        setLoading(false)
      })
  }, [organizationId])

  if (loading) return <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {buckets.map((bucket, i) => (
        <div key={i} className={`panel p-4 border ${bucket.color}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold ${bucket.textColor}`}>{bucket.label}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${bucket.badge}`}>{bucket.invoices.length}</span>
          </div>
          <p className="text-xl font-bold font-mono text-white">
            ${bucket.total.toLocaleString()}
          </p>
          <div className="mt-2 space-y-1 max-h-20 overflow-y-auto">
            {bucket.invoices.slice(0, 3).map((inv) => (
              <div key={inv.id} className="text-[10px] text-slate-400 flex justify-between">
                <span className="truncate">{inv.customer_name}</span>
                <span className="shrink-0">${inv.amount.toLocaleString()}</span>
              </div>
            ))}
            {bucket.invoices.length > 3 && (
              <p className="text-[10px] text-slate-500">+{bucket.invoices.length - 3} more</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
