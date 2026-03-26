'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { PhoneMissed, Phone, UserPlus, X, Loader2, Clock, AlertCircle, ArrowRight } from 'lucide-react'
import type { Call } from '@/lib/types'
import Link from 'next/link'

interface MissedCallQueueProps {
  organizationId: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function MissedCallQueue({ organizationId }: MissedCallQueueProps) {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [convertingId, setConvertingId] = useState<string | null>(null)

  const fetchMissed = async () => {
    const supabase = createSupabaseBrowserClient()
    const since = new Date()
    since.setDate(since.getDate() - 7)

    const { data } = await supabase
      .from('calls')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'missed')
      .gte('started_at', since.toISOString())
      .order('started_at', { ascending: false })
      .limit(20)

    setCalls((data as unknown as Call[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchMissed() }, [organizationId])

  const handleDismiss = async (callId: string) => {
    setDismissed((prev: Set<string>) => new Set([...prev, callId]))
  }

  const handleConvertToLead = async (call: Call) => {
    setConvertingId(call.id)
    const supabase = createSupabaseBrowserClient()
    const { data } = await supabase
      .from('leads')
      .insert({
        organization_id: organizationId,
        source: 'phone_call',
        status: 'new',
        priority: call.sentiment === 'urgent' ? 'hot' : 'warm',
        score: call.sentiment === 'urgent' ? 80 : 40,
        first_name: call.caller_name?.split(' ')[0] ?? 'Unknown',
        last_name: call.caller_name?.split(' ').slice(1).join(' ') ?? '',
        phone: call.caller_phone,
        service_needed: call.intent ?? 'Missed call follow-up',
        estimated_value: 0,
      })
      .select('id')
      .single()

    if (data) {
      await supabase.from('calls').update({ lead_id: data.id }).eq('id', call.id)
      setCalls((prev: Call[]) => prev.map((c: Call) => c.id === call.id ? { ...c, lead_id: data.id } : c))
    }
    setConvertingId(null)
  }

  const visible = calls.filter((c) => !dismissed.has(c.id))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-[#2DD4BF]" />
      </div>
    )
  }

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-500">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800">
          <PhoneMissed className="h-6 w-6 text-slate-600" />
        </div>
        <p className="text-sm font-medium">All caught up!</p>
        <p className="text-xs text-slate-600">No missed calls in the last 7 days</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{visible.length} missed call{visible.length !== 1 ? 's' : ''} in the last 7 days</span>
        <Link
          href="/dashboard/calls?status=missed"
          className="flex items-center gap-1 text-xs font-medium text-[#2DD4BF] hover:underline"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {visible.map((call) => (
        <div
          key={call.id}
          className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                <PhoneMissed className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white text-sm">
                    {call.caller_name ?? call.caller_phone}
                  </p>
                  {call.sentiment === 'urgent' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-xs font-medium text-red-400">
                      <AlertCircle className="h-2.5 w-2.5" /> Urgent
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-500">{call.caller_phone}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />{timeAgo(call.started_at)}
                  </span>
                  {call.duration_seconds > 0 && (
                    <span className="text-xs text-slate-500 font-mono">{formatDuration(call.duration_seconds)}</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDismiss(call.id)}
              className="rounded p-1 text-slate-600 hover:text-slate-400 hover:bg-slate-800 transition-colors flex-shrink-0"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <a
              href={`tel:${call.caller_phone}`}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-[#2DD4BF]/40 hover:text-[#2DD4BF]"
            >
              <Phone className="h-3.5 w-3.5" /> Callback
            </a>
            {!call.lead_id ? (
              <button
                onClick={() => handleConvertToLead(call)}
                disabled={convertingId === call.id}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-[#2DD4BF]/40 hover:text-[#2DD4BF] disabled:opacity-50"
              >
                {convertingId === call.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
                {convertingId === call.id ? 'Converting...' : 'Convert to Lead'}
              </button>
            ) : (
              <Link
                href={`/dashboard/leads?highlight=${call.lead_id}`}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400"
              >
                <UserPlus className="h-3.5 w-3.5" /> Lead Created
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
