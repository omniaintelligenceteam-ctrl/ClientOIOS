'use client'

import { useState, useEffect } from 'react'
import { X, UserCheck, Tag, Download, Megaphone, Loader2, ChevronDown } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useToast } from '@/components/ui/toast'
import type { Lead, TeamMember } from '@/lib/types'

type LeadNoteRow = Pick<Lead, 'id' | 'notes'>

function exportCSV(leads: Lead[]) {
  const headers = ['First Name', 'Last Name', 'Phone', 'Email', 'Status', 'Priority', 'Score', 'Source', 'Service Needed', 'Estimated Value', 'Notes', 'Created At']
  const rows = leads.map(l => [
    l.first_name, l.last_name, l.phone, l.email ?? '',
    l.status, l.priority, l.score, l.source, l.service_needed,
    l.estimated_value, l.notes ?? '', l.created_at,
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function BulkActionsBar({
  selectedIds,
  allLeads,
  organizationId,
  onClear,
  onRefresh,
}: {
  selectedIds: string[]
  allLeads: Lead[]
  organizationId: string
  onClear: () => void
  onRefresh: () => void
}) {
  const toast = useToast()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [showAssign, setShowAssign] = useState(false)
  const [showTag, setShowTag] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    supabase.from('team_members').select('*').eq('organization_id', organizationId).limit(20)
      .then(({ data }: { data: TeamMember[] | null }) => { if (data) setTeamMembers(data) })
  }, [organizationId])

  if (selectedIds.length === 0) return null

  const selectedLeads = allLeads.filter(l => selectedIds.includes(l.id))

  const handleAssign = async (memberId: string) => {
    setLoading('assign')
    setShowAssign(false)
    const { error } = await supabase.from('leads').update({ assigned_to: memberId }).in('id', selectedIds)
    setLoading(null)
    if (error) {
      toast.error('Could not assign selected leads.')
      return
    }
    toast.success(`Assigned ${selectedIds.length} lead${selectedIds.length === 1 ? '' : 's'}.`)
    onRefresh()
  }

  const handleTag = async () => {
    if (!tagInput.trim()) return
    setLoading('tag')
    setShowTag(false)
    // Fetch current tags for selected leads
    const { data } = await supabase.from('leads').select('id,notes').in('id', selectedIds)
    const leadsWithNotes = (data ?? []) as LeadNoteRow[]
    // We'll store tags in notes as a convention since tags column may not exist
    // Update notes to include tag
    for (const lead of leadsWithNotes) {
      const current = lead.notes ?? ''
      const tagLine = `[TAG: ${tagInput.trim()}]`
      if (!current.includes(tagLine)) {
        await supabase.from('leads').update({ notes: current ? `${current}\n${tagLine}` : tagLine }).eq('id', lead.id)
      }
    }
    setTagInput('')
    setLoading(null)
    toast.success(`Tag added to ${selectedIds.length} lead${selectedIds.length === 1 ? '' : 's'}.`)
    onRefresh()
  }

  const handleExport = () => {
    exportCSV(selectedLeads)
    toast.success('CSV export started.')
  }

  const handleCampaign = async () => {
    setLoading('campaign')
    const now = new Date().toISOString()
    const note = `[CAMPAIGN_QUEUE: ${now}]`
    const { data, error } = await supabase.from('leads').select('id,notes').in('id', selectedIds)
    const leadsWithNotes = (data ?? []) as LeadNoteRow[]

    if (error) {
      setLoading(null)
      toast.error('Could not queue selected leads for campaign.')
      return
    }

    for (const lead of leadsWithNotes) {
      const current = lead.notes ?? ''
      if (!current.includes(note)) {
        await supabase
          .from('leads')
          .update({ notes: current ? `${current}\n${note}` : note })
          .eq('id', lead.id)
      }
    }

    setLoading(null)
    toast.success(`Queued ${selectedIds.length} lead${selectedIds.length === 1 ? '' : 's'} for campaign.`)
    onRefresh()
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#2DD4BF]/20 bg-[#2DD4BF]/5 px-4 py-3">
      {/* Count + clear */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-[#2DD4BF]">{selectedIds.length} selected</span>
        <button onClick={onClear} aria-label="Clear selection" className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2DD4BF]/10 text-[#2DD4BF] hover:bg-[#2DD4BF]/20">
          <X size={12} />
        </button>
      </div>

      <div className="mx-2 h-4 w-px bg-[rgba(148,163,184,0.1)]" />

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Assign */}
        <div className="relative">
          <button
            onClick={() => { setShowAssign(a => !a); setShowTag(false) }}
            disabled={loading === 'assign'}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 text-xs font-medium text-slate-300 transition-colors hover:border-[#2DD4BF]/30 hover:text-[#2DD4BF] disabled:opacity-50">
            {loading === 'assign' ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
            Assign
            <ChevronDown size={11} />
          </button>
          {showAssign && (
            <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] shadow-2xl">
              {teamMembers.length === 0 && (
                <p className="px-4 py-3 text-xs text-slate-500">No team members found</p>
              )}
              {teamMembers.map(m => (
                <button key={m.id} onClick={() => handleAssign(m.id)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-300 transition-colors hover:bg-white/[0.04] hover:text-[#F8FAFC]">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#2DD4BF]/10 text-[10px] font-bold text-[#2DD4BF]">
                    {m.name.charAt(0)}
                  </div>
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tag */}
        <div className="relative">
          <button
            onClick={() => { setShowTag(t => !t); setShowAssign(false) }}
            disabled={loading === 'tag'}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 text-xs font-medium text-slate-300 transition-colors hover:border-[#2DD4BF]/30 hover:text-[#2DD4BF] disabled:opacity-50">
            {loading === 'tag' ? <Loader2 size={13} className="animate-spin" /> : <Tag size={13} />}
            Tag
          </button>
          {showTag && (
            <div className="absolute left-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 shadow-2xl">
              <p className="mb-2 text-xs text-slate-500">Add tag to {selectedIds.length} leads</p>
              <div className="flex gap-2">
                <input
                  type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleTag() }}
                  placeholder="Tag name..." autoFocus
                  className="flex-1 rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-3 py-1.5 text-xs text-[#F8FAFC] outline-none focus:border-[#2DD4BF]/50" />
                <button onClick={handleTag}
                  className="rounded-lg bg-[#2DD4BF] px-3 py-1.5 text-xs font-semibold text-[#0B1120] hover:opacity-90">
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Export CSV */}
        <button onClick={handleExport}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 text-xs font-medium text-slate-300 transition-colors hover:border-[#2DD4BF]/30 hover:text-[#2DD4BF]">
          <Download size={13} />
          Export CSV
        </button>

        {/* Add to Campaign */}
        <button
          onClick={handleCampaign}
          disabled={loading === 'campaign'}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 text-xs font-medium text-slate-300 transition-colors hover:border-[#2DD4BF]/30 hover:text-[#2DD4BF]">
          {loading === 'campaign' ? <Loader2 size={13} className="animate-spin" /> : <Megaphone size={13} />}
          Campaign
        </button>
      </div>
    </div>
  )
}
