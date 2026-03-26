'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Clock,
  TrendingUp,
  MapPin,
  Loader2,
  User,
  Check,
  Star,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Lead, Customer, FollowUpType } from '@/lib/types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Tab = 'overview' | 'activity' | 'followups'

interface CallRecord {
  id: string
  caller_phone: string
  caller_name: string | null
  direction: 'inbound' | 'outbound'
  status: string
  duration_seconds: number
  started_at: string
  sentiment: string
  transcript_summary: string | null
}

interface AppointmentRecord {
  id: string
  service_type: string
  status: string
  scheduled_date: string
  scheduled_time_start: string
  address: string
  estimated_value: number | null
}

interface ActivityItem {
  id: string
  actor: string
  action: string
  entity_type: string
  metadata: Record<string, unknown> | null
  importance: string
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function getSourceLabel(source: string): string {
  const map: Record<string, string> = {
    phone_call: 'Phone', web_form: 'Web', referral: 'Referral',
    social_media: 'Social', marketing_campaign: 'Campaign', walk_in: 'Walk-in', manual: 'Manual',
  }
  return map[source] ?? source
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    new: 'New', contacted: 'Contacted', qualified: 'Qualified',
    proposal_sent: 'Proposal Sent', won: 'Won', lost: 'Lost', dormant: 'Dormant',
  }
  return map[status] ?? status
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-emerald-400'
  if (score >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

function getScoreBg(score: number) {
  if (score >= 80) return 'bg-emerald-500/20'
  if (score >= 50) return 'bg-yellow-500/20'
  return 'bg-red-500/20'
}

function getScoreStroke(score: number) {
  if (score >= 80) return '#34d399'
  if (score >= 50) return '#fbbf24'
  return '#f87171'
}

/* ------------------------------------------------------------------ */
/*  Score Circle                                                       */
/* ------------------------------------------------------------------ */

function ScoreCircle({ score }: { score: number }) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative flex h-20 w-20 flex-shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={radius}
          fill="none" stroke={getScoreStroke(score)} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold ${getScoreColor(score)}`}>{score}</span>
        <span className="text-[10px] text-slate-500">score</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Activity Icon                                                      */
/* ------------------------------------------------------------------ */

function ActivityIcon({ type, subtype }: { type: string; subtype?: string }) {
  if (type === 'call') {
    return (
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20">
        <Phone size={14} className="text-blue-400" />
      </div>
    )
  }
  if (type === 'appointment') {
    return (
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20">
        <Calendar size={14} className="text-purple-400" />
      </div>
    )
  }
  if (type === 'follow_up') {
    const Icon = subtype === 'email' ? Mail : subtype === 'sms' ? MessageSquare : Phone
    const cls = subtype === 'email' ? 'bg-blue-500/20 text-blue-400' : subtype === 'sms' ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'
    return (
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${cls}`}>
        <Icon size={14} />
      </div>
    )
  }
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-500/20">
      <Star size={14} className="text-slate-400" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Follow-up Form                                                     */
/* ------------------------------------------------------------------ */

function FollowUpForm({ leadId, organizationId, onScheduled }: {
  leadId: string
  organizationId: string
  onScheduled: () => void
}) {
  const [date, setDate] = useState('')
  const [type, setType] = useState<FollowUpType>('call')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createSupabaseBrowserClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) return
    setLoading(true)
    const followUpDate = new Date(date).toISOString()
    await supabase.from('leads').update({ follow_up_date: followUpDate }).eq('id', leadId)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('activity_feed').insert({
      organization_id: organizationId,
      actor: user?.email ?? 'System',
      action: `Scheduled ${type} follow-up for ${formatDate(followUpDate)}`,
      entity_type: 'follow_up',
      entity_id: leadId,
      metadata: { follow_up_type: type, follow_up_date: followUpDate, notes },
      importance: 'medium',
    })
    setLoading(false)
    setDate('')
    setNotes('')
    onScheduled()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] p-4">
      <p className="text-sm font-semibold text-[#F8FAFC]">Schedule Follow-up</p>
      <div>
        <label className="mb-1 block text-xs text-slate-500">Date & Time</label>
        <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} required
          className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-[#F8FAFC] outline-none focus:border-[#2DD4BF]/50" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500">Type</label>
        <select value={type} onChange={e => setType(e.target.value as FollowUpType)}
          className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-[#F8FAFC] outline-none focus:border-[#2DD4BF]/50">
          <option value="call">📞 Call</option>
          <option value="sms">💬 SMS</option>
          <option value="email">📧 Email</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-slate-500">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes..."
          className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-[#F8FAFC] outline-none focus:border-[#2DD4BF]/50 resize-none" />
      </div>
      <button type="submit" disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2DD4BF] px-4 py-2 text-sm font-semibold text-[#0B1120] transition-opacity hover:opacity-90 disabled:opacity-50">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
        Schedule
      </button>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Drawer Component                                              */
/* ------------------------------------------------------------------ */

export function LeadDetailDrawer({ lead, customer, onClose, onLeadUpdated }: {
  lead: Lead
  customer: Customer | null
  onClose: () => void
  onLeadUpdated?: (updated: Lead) => void
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [followUps, setFollowUps] = useState<ActivityItem[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [showFollowUpForm, setShowFollowUpForm] = useState(false)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (tab === 'activity' || tab === 'followups') {
      fetchActivities()
    }
  }, [tab, lead.id])

  const fetchActivities = async () => {
    setLoadingActivities(true)
    try {
      const [callsRes, apptsRes, feedRes] = await Promise.all([
        supabase.from('calls').select('id,caller_phone,caller_name,direction,status,duration_seconds,started_at,sentiment,transcript_summary')
          .eq('lead_id', lead.id).order('started_at', { ascending: false }).limit(20),
        supabase.from('appointments').select('id,service_type,status,scheduled_date,scheduled_time_start,address,estimated_value')
          .eq('lead_id', lead.id).order('scheduled_date', { ascending: false }).limit(20),
        supabase.from('activity_feed').select('*')
          .eq('organization_id', lead.organization_id).eq('entity_type', 'follow_up')
          .eq('entity_id', lead.id).order('created_at', { ascending: false }).limit(20),
      ])
      if (callsRes.data) setCalls(callsRes.data as unknown as CallRecord[])
      if (apptsRes.data) setAppointments(apptsRes.data as unknown as AppointmentRecord[])
      if (feedRes.data) setFollowUps(feedRes.data as unknown as ActivityItem[])
    } catch (err) {
      console.error('Failed to fetch lead activities:', err)
    } finally {
      setLoadingActivities(false)
    }
  }

  const handleNotesSave = async () => {
    setNotesSaving(true)
    await supabase.from('leads').update({ notes }).eq('id', lead.id)
    setNotesSaving(false)
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
    if (onLeadUpdated) onLeadUpdated({ ...lead, notes })
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer - desktop: right slide-over, mobile: bottom sheet */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-[rgba(148,163,184,0.1)] bg-white/[0.03] shadow-2xl">

        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[rgba(148,163,184,0.1)] px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#2DD4BF]/10">
              <User size={18} className="text-[#2DD4BF]" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-[#F8FAFC]" title={`${lead.first_name} ${lead.last_name}`}>
                {lead.first_name} {lead.last_name}
              </h2>
              <p className="truncate text-xs text-slate-500" title={lead.service_needed}>{lead.service_needed}</p>
            </div>
          </div>
          <button onClick={onClose}
            aria-label="Close lead details"
            className="ml-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-shrink-0 gap-1 border-b border-[rgba(148,163,184,0.1)] px-4 pt-3">
          {(['overview', 'activity', 'followups'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-all ${tab === t
                ? 'border-b-2 border-[#2DD4BF] text-[#2DD4BF]'
                : 'text-slate-500 hover:text-slate-300'}`}>
              {t === 'followups' ? 'Follow-ups' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* === OVERVIEW === */}
          {tab === 'overview' && (
            <div className="space-y-6">

              {/* Score + reasons */}
              <div className="flex items-start gap-4">
                <ScoreCircle score={lead.score} />
                <div className="flex-1">
                  <p className="mb-2 text-xs text-slate-500">Score Reasons</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(lead.score_reasons ?? []).filter(Boolean).map((r, i) => (
                      <span key={i} className="inline-flex items-center rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-400">{r}</span>
                    ))}
                    {(!lead.score_reasons || lead.score_reasons.filter(Boolean).length === 0) && (
                      <span className="text-xs italic text-slate-600">No reasons recorded</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-2">
                {lead.phone && (
                  <a href={`tel:${lead.phone}`}
                    className="flex items-center gap-3 rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] p-3 transition-colors hover:border-[#2DD4BF]/30">
                    <Phone size={16} className="flex-shrink-0 text-[#2DD4BF]" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-500">Phone (tap to call)</p>
                      <p className="text-sm font-medium text-[#F8FAFC]">{lead.phone}</p>
                    </div>
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`}
                    className="flex items-center gap-3 rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] p-3 transition-colors hover:border-[#2DD4BF]/30">
                    <Mail size={16} className="flex-shrink-0 text-[#2DD4BF]" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-500">Email</p>
                      <p className="truncate text-sm font-medium text-[#F8FAFC]" title={lead.email ?? undefined}>{lead.email}</p>
                    </div>
                  </a>
                )}
                {lead.address && (
                  <div className="flex items-center gap-3 rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] p-3">
                    <MapPin size={16} className="flex-shrink-0 text-[#2DD4BF]" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-500">Address</p>
                      <p className="text-sm font-medium text-[#F8FAFC]">{lead.address}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400">
                  <span className="sr-only">Source: </span>{getSourceLabel(lead.source)}
                </span>
                <span className="inline-flex items-center rounded-md bg-slate-500/10 px-2.5 py-1 text-xs font-semibold text-slate-400">
                  <span className="sr-only">Status: </span>{getStatusLabel(lead.status)}
                </span>
                <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${getScoreBg(lead.score)} ${getScoreColor(lead.score)}`}>
                  Score: {lead.score}
                </span>
                <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
                  lead.priority === 'hot' ? 'bg-red-500/10 text-red-400' :
                  lead.priority === 'warm' ? 'bg-orange-500/10 text-orange-400' :
                  'bg-blue-500/10 text-blue-400'}`}>
                  <span className="sr-only">Priority: </span>{lead.priority === 'hot' ? '🔥 Hot' : lead.priority === 'warm' ? '🌡️ Warm' : '❄️ Cold'}
                </span>
              </div>

              {/* Estimated Value */}
              <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] p-4">
                <p className="text-xs text-slate-500">Estimated Value</p>
                <p className="mt-1 text-2xl font-bold text-[#2DD4BF]">{formatCurrency(lead.estimated_value)}</p>
                {lead.follow_up_date && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={12} />
                    Follow-up: {formatDate(lead.follow_up_date)}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#F8FAFC]">Notes</p>
                  <span className="flex items-center gap-1 text-xs">
                    {notesSaving && <Loader2 size={11} className="animate-spin text-[#2DD4BF]" />}
                    {notesSaved && !notesSaving && <><Check size={11} className="text-emerald-400" /><span className="text-emerald-400">Saved</span></>}
                  </span>
                </div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={handleNotesSave}
                  rows={4} placeholder="Add notes about this lead..."
                  className="w-full resize-none rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-4 py-3 text-sm text-[#F8FAFC] outline-none focus:border-[#2DD4BF]/50" />
              </div>

              {/* Quick Actions */}
              <div>
                <p className="mb-3 text-sm font-semibold text-[#F8FAFC]">Quick Actions</p>
                <div className="grid grid-cols-4 gap-2">
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`}
                      className="flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] p-3 transition-all hover:border-blue-500/30 hover:bg-blue-500/5">
                      <Phone size={18} className="text-blue-400" />
                      <span className="text-[10px] text-slate-400">Call</span>
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`}
                      className="flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] p-3 transition-all hover:border-purple-500/30 hover:bg-purple-500/5">
                      <Mail size={18} className="text-purple-400" />
                      <span className="text-[10px] text-slate-400">Email</span>
                    </a>
                  )}
                  {lead.phone && (
                    <a href={`sms:${lead.phone}`}
                      className="flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] p-3 transition-all hover:border-orange-500/30 hover:bg-orange-500/5">
                      <MessageSquare size={18} className="text-orange-400" />
                      <span className="text-[10px] text-slate-400">SMS</span>
                    </a>
                  )}
                  <button onClick={() => { setTab('followups'); setShowFollowUpForm(true) }}
                    className="flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] p-3 transition-all hover:border-[#2DD4BF]/30 hover:bg-[#2DD4BF]/5">
                    <Calendar size={18} className="text-[#2DD4BF]" />
                    <span className="text-[10px] text-slate-400">Schedule</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* === ACTIVITY === */}
          {tab === 'activity' && (
            <div className="space-y-3">
              {loadingActivities ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-[#2DD4BF]" />
                </div>
              ) : calls.length === 0 && appointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <Phone size={36} className="mb-3 text-slate-700" />
                  <p className="text-sm text-slate-500">No activity yet</p>
                  <p className="mt-1 text-xs text-slate-600">Calls and appointments will appear here</p>
                </div>
              ) : (
                <>
                  {calls.map(call => (
                    <div key={call.id} className="flex gap-3 rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] p-4">
                      <ActivityIcon type="call" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-[#F8FAFC]">
                            {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'} Call
                          </p>
                          <span className="flex-shrink-0 text-[10px] text-slate-500">
                            {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{call.caller_phone}</p>
                        {call.transcript_summary && (
                          <p className="mt-2 line-clamp-2 text-xs text-slate-400" title={call.transcript_summary}>{call.transcript_summary}</p>
                        )}
                        <p className="mt-1 text-[10px] text-slate-600">{formatDateTime(call.started_at)}</p>
                      </div>
                    </div>
                  ))}
                  {appointments.map(appt => (
                    <div key={appt.id} className="flex gap-3 rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] p-4">
                      <ActivityIcon type="appointment" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-[#F8FAFC]">{appt.service_type}</p>
                          <span className="inline-flex flex-shrink-0 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-purple-400">
                            {appt.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{appt.address}</p>
                        <p className="text-xs text-slate-500">{formatDate(appt.scheduled_date)} · {appt.scheduled_time_start}</p>
                        {appt.estimated_value && (
                          <p className="mt-1 text-xs font-semibold text-[#2DD4BF]">{formatCurrency(appt.estimated_value)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* === FOLLOW-UPS === */}
          {tab === 'followups' && (
            <div className="space-y-4">
              <button
                onClick={() => setShowFollowUpForm(f => !f)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[rgba(148,163,184,0.2)] bg-[#0B1120] px-4 py-3 text-sm font-medium text-[#2DD4BF] transition-all hover:border-[#2DD4BF]/50 hover:bg-[#2DD4BF]/5">
                <Calendar size={16} />
                {showFollowUpForm ? 'Cancel' : 'Schedule Follow-up'}
              </button>

              {showFollowUpForm && (
                <FollowUpForm leadId={lead.id} organizationId={lead.organization_id}
                  onScheduled={() => { setShowFollowUpForm(false); fetchActivities() }} />
              )}

              {loadingActivities ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-[#2DD4BF]" />
                </div>
              ) : followUps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock size={36} className="mb-3 text-slate-700" />
                  <p className="text-sm text-slate-500">No follow-ups yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followUps.map(item => (
                    <div key={item.id} className="flex gap-3 rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] p-4">
                      <ActivityIcon type="follow_up" subtype={(item.metadata?.follow_up_type as string) ?? 'call'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#F8FAFC]">{item.action}</p>
                        {item.metadata?.notes ? (
                          <p className="mt-1 text-xs text-slate-400">{String(item.metadata.notes)}</p>
                        ) : null}
                        <p className="mt-1 text-[10px] text-slate-600">{formatDateTime(item.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
