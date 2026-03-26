'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  X,
  Phone,
  PhoneOutgoing,
  PhoneIncoming,
  Play,
  Pause,
  Clock,
  Tag,
  Link2,
  Calendar,
  UserPlus,
  FileText,
  Loader2,
  ExternalLink,
  AlertCircle,
  Smile,
  Meh,
  Frown,
} from 'lucide-react'
import type { Call, Sentiment } from '@/lib/types'

interface CallDetailDrawerProps {
  call: Call | null
  onClose: () => void
  organizationId: string
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const sentimentConfig: Record<Sentiment, { label: string; color: string; bg: string; Icon: (props: { className?: string }) => JSX.Element }> = {
  positive: { label: 'Positive', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30', Icon: Smile },
  neutral: { label: 'Neutral', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30', Icon: Meh },
  negative: { label: 'Negative', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30', Icon: Frown },
  urgent: { label: 'Urgent', color: 'text-red-500', bg: 'bg-red-500/20 border-red-500/30', Icon: AlertCircle },
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  answered: { label: 'Answered', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' },
  missed: { label: 'Missed', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
  voicemail: { label: 'Voicemail', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  transferred: { label: 'Transferred', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
  abandoned: { label: 'Abandoned', color: 'text-slate-400', bg: 'bg-slate-500/20 border-slate-500/30' },
}

export function CallDetailDrawer({ call, onClose, organizationId }: CallDetailDrawerProps) {
  const [playing, setPlaying] = useState(false)
  const [creatingLead, setCreatingLead] = useState(false)
  const [leadId, setLeadId] = useState<string | null>(call?.lead_id ?? null)
  const [loggingNote, setLoggingNote] = useState(false)

  if (!call) return null

  const sent = sentimentConfig[call.sentiment] ?? sentimentConfig.neutral
  const SentimentIcon = sent.Icon
  const status = statusConfig[call.status] ?? statusConfig.abandoned

  const handleCreateLead = async () => {
    if (!call) return
    setCreatingLead(true)
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from('leads')
      .insert({
        organization_id: organizationId,
        source: 'phone_call',
        status: 'new',
        priority: call.sentiment === 'urgent' ? 'hot' : 'warm',
        score: call.sentiment === 'urgent' ? 80 : 50,
        first_name: call.caller_name?.split(' ')[0] ?? 'Unknown',
        last_name: call.caller_name?.split(' ').slice(1).join(' ') ?? '',
        phone: call.caller_phone,
        service_needed: call.intent ?? 'General inquiry',
        estimated_value: 0,
      })
      .select('id')
      .single()

    if (!error && data) {
      await supabase.from('calls').update({ lead_id: data.id }).eq('id', call.id)
      setLeadId(data.id)
    }
    setCreatingLead(false)
  }

  const handleLogNote = async () => {
    setLoggingNote(true)
    const note = prompt('Enter a note about this call:')
    if (note) {
      const supabase = createSupabaseBrowserClient()
      await supabase.from('activity_feed').insert({
        organization_id: organizationId,
        actor: 'Human',
        action: `Note logged on call from ${call.caller_phone}: ${note}`,
        entity_type: 'call',
        entity_id: call.id,
        importance: 'medium',
        metadata: { note },
      })
    }
    setLoggingNote(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-lg bg-[#111827] border-l border-slate-800 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-[#111827] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2DD4BF]/10">
              <Phone className="h-5 w-5 text-[#2DD4BF]" />
            </div>
            <div>
              <h2 className="font-semibold text-white">
                {call.caller_name ?? 'Unknown Caller'}
              </h2>
              <p className="text-sm text-slate-400">{call.caller_phone}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium capitalize ${call.direction === 'inbound' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-purple-500/20 border-purple-500/30 text-purple-400'}`}>
              {call.direction === 'inbound' ? <PhoneIncoming className="h-3 w-3" /> : <PhoneOutgoing className="h-3 w-3" />}
              {call.direction}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium capitalize ${status.bg} ${status.color}`}>
              {call.status}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium capitalize ${sent.bg} ${sent.color}`}>
              <SentimentIcon className="h-3 w-3" />
              {sent.label}
            </span>
            <span className="text-xs text-slate-500 ml-auto">{formatDateTime(call.started_at)}</span>
          </div>

          {/* Duration + Recording */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">Duration</span>
              </div>
              <span className="font-mono text-white">{formatDuration(call.duration_seconds)}</span>
            </div>

            {call.recording_url && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <button
                  onClick={() => setPlaying(!playing)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2DD4BF] text-[#0B1120] transition-colors hover:bg-[#14B8A6]"
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <audio src={call.recording_url} className="hidden" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-300">Recording</p>
                  <p className="text-xs text-slate-500 truncate">{call.recording_url.split('/').pop()}</p>
                </div>
                <a href={call.recording_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#2DD4BF]">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>

          {/* AI Summary */}
          {call.transcript_summary && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
                <FileText className="h-4 w-4 text-[#2DD4BF]" />
                AI Summary
              </h3>
              <blockquote className="rounded-xl border-l-4 border-[#2DD4BF] bg-slate-900/50 px-4 py-3 text-sm italic text-slate-300 leading-relaxed">
                {call.transcript_summary}
              </blockquote>
            </div>
          )}

          {/* Transcript */}
          {call.transcript && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-300">Full Transcript</h3>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{call.transcript}</p>
              </div>
            </div>
          )}

          {/* Intent */}
          {call.intent && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Tag className="h-4 w-4 text-slate-500" />
                Intent
              </h3>
              <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-300">
                {call.intent}
              </span>
            </div>
          )}

          {/* Tags */}
          {call.tags && call.tags.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-300">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {call.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Related */}
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Link2 className="h-4 w-4 text-slate-500" />
              Related
            </h3>
            <div className="space-y-2">
              {call.lead_id ? (
                <a
                  href={`/dashboard/leads?highlight=${call.lead_id}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-[#2DD4BF]/40 hover:text-[#2DD4BF]"
                >
                  <UserPlus className="h-4 w-4" />
                  View Lead #{call.lead_id.slice(0, 8)}
                </a>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/30 px-3 py-2 text-sm text-slate-500">
                  <UserPlus className="h-4 w-4" />
                  No linked lead
                </div>
              )}
              {call.appointment_id && (
                <a
                  href={`/dashboard/calendar?highlight=${call.appointment_id}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-[#2DD4BF]/40 hover:text-[#2DD4BF]"
                >
                  <Calendar className="h-4 w-4" />
                  View Appointment #{call.appointment_id.slice(0, 8)}
                </a>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            {!leadId && (
              <button
                onClick={handleCreateLead}
                disabled={creatingLead}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2DD4BF] px-4 py-2.5 text-sm font-semibold text-[#0B1120] transition-colors hover:bg-[#14B8A6] disabled:opacity-50"
              >
                {creatingLead ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {creatingLead ? 'Creating Lead...' : 'Create Lead from Call'}
              </button>
            )}
            <button
              onClick={handleLogNote}
              disabled={loggingNote}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-[#2DD4BF]/40 hover:text-[#2DD4BF] disabled:opacity-50"
            >
              {loggingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {loggingNote ? 'Logging...' : 'Log Note'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
