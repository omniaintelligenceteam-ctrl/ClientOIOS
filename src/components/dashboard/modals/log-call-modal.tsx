'use client'

import { useState } from 'react'
import { X, Phone, User, Clock, FileText } from 'lucide-react'

interface LogCallModalProps {
  open: boolean
  onClose: () => void
}

export function LogCallModal({ open, onClose }: LogCallModalProps) {
  const [form, setForm] = useState({
    caller_name: '',
    caller_phone: '',
    duration_seconds: '',
    notes: '',
    direction: 'inbound',
    status: 'answered',
  })

  if (!open) return null

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: wire to Supabase insert
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2DD4BF]/10">
              <Phone size={18} className="text-[#2DD4BF]" />
            </div>
            <h2 className="text-lg font-semibold text-[#F8FAFC]">Log Call</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#64748B] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Caller Name</label>
            <div className="relative">
              <User size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                name="caller_name"
                value={form.caller_name}
                onChange={handleChange}
                placeholder="Jane Doe"
                className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-8 pr-3 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Phone Number</label>
            <div className="relative">
              <Phone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                name="caller_phone"
                value={form.caller_phone}
                onChange={handleChange}
                placeholder="(555) 000-0000"
                required
                className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-8 pr-3 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Direction</label>
              <select
                name="direction"
                value={form.direction}
                onChange={handleChange}
                className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-3 text-sm text-[#F8FAFC] outline-none focus:border-[#2DD4BF]/40"
              >
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-3 text-sm text-[#F8FAFC] outline-none focus:border-[#2DD4BF]/40"
              >
                <option value="answered">Answered</option>
                <option value="missed">Missed</option>
                <option value="voicemail">Voicemail</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Duration (seconds)</label>
            <div className="relative">
              <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                name="duration_seconds"
                type="number"
                min="0"
                value={form.duration_seconds}
                onChange={handleChange}
                placeholder="0"
                className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-8 pr-3 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Notes</label>
            <div className="relative">
              <FileText size={14} className="pointer-events-none absolute left-3 top-3 text-[#64748B]" />
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Call summary..."
                rows={3}
                className="w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-8 pr-3 pt-2 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20 resize-none"
              />
            </div>
          </div>

          <div className="mt-1 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[rgba(148,163,184,0.1)] py-2 text-sm font-medium text-[#94A3B8] transition-colors hover:bg-white/[0.04] hover:text-[#F8FAFC]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-[#2DD4BF] py-2 text-sm font-semibold text-[#0B1120] transition-all hover:bg-[#5EEAD4] active:scale-95"
            >
              Log Call
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
