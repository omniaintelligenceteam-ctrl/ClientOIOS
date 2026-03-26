'use client'

import { useState } from 'react'
import { Calendar, Loader2, Check } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { FollowUpType } from '@/lib/types'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function FollowUpScheduler({
  leadId,
  organizationId,
  onScheduled,
}: {
  leadId: string
  organizationId: string
  onScheduled: () => void
}) {
  const [date, setDate] = useState('')
  const [type, setType] = useState<FollowUpType>('call')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createSupabaseBrowserClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) return
    setLoading(true)

    const followUpDate = new Date(date).toISOString()

    // Update lead's follow_up_date
    await supabase
      .from('leads')
      .update({ follow_up_date: followUpDate })
      .eq('id', leadId)

    // Create activity_feed entry
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
    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      setDate('')
      setNotes('')
      onScheduled()
    }, 1200)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-5"
    >
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-[#2DD4BF]" />
        <h3 className="text-sm font-semibold text-[#F8FAFC]">Schedule Follow-up</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Date & Time</label>
          <input
            type="datetime-local"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="w-full rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none focus:border-[#2DD4BF]/50"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Type</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as FollowUpType)}
            className="w-full rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none focus:border-[#2DD4BF]/50"
          >
            <option value="call">📞 Call</option>
            <option value="sms">💬 SMS</option>
            <option value="email">📧 Email</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="What do you want to discuss?"
          className="w-full resize-none rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-3 py-2.5 text-sm text-[#F8FAFC] outline-none focus:border-[#2DD4BF]/50"
        />
      </div>

      <button
        type="submit"
        disabled={loading || success || !date}
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all disabled:opacity-50 ${
          success
            ? 'bg-emerald-500 text-white'
            : 'bg-[#2DD4BF] text-[#0B1120] hover:opacity-90'
        }`}
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        {success && <Check size={15} />}
        {success ? 'Scheduled!' : loading ? 'Saving...' : 'Schedule Follow-up'}
      </button>
    </form>
  )
}
