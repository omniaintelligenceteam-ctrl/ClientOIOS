'use client'

import { useState } from 'react'
import { UserPlus, Phone, Mail, Briefcase } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/toast'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'

interface NewLeadModalProps {
  open: boolean
  onClose: () => void
}

export function NewLeadModal({ open, onClose }: NewLeadModalProps) {
  const { organization } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    service_needed: '',
  })
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setForm({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      service_needed: '',
    })
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!organization?.id) {
      toast.error('Organization not found. Please refresh and try again.')
      return
    }

    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      toast.error('Could not connect to database.')
      return
    }

    setSaving(true)
    const now = new Date().toISOString()
    const firstName = form.first_name.trim()
    const lastName = form.last_name.trim()
    const serviceNeeded = form.service_needed.trim() || 'General service inquiry'
    const fullName = `${firstName} ${lastName}`.trim()

    const { error } = await supabase.from('leads').insert({
      organization_id: organization.id,
      source: 'manual',
      status: 'new',
      priority: 'warm',
      score: 50,
      score_reasons: ['Created manually'],
      name: fullName,
      first_name: firstName,
      last_name: lastName,
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      service_needed: serviceNeeded,
      estimated_value: 0,
      follow_up_count: 0,
      created_at: now,
      updated_at: now,
    })

    setSaving(false)

    if (error) {
      toast.error('Failed to create lead. Please try again.')
      return
    }

    toast.success('Lead created successfully.')
    resetForm()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} size="md">
      <ModalHeader
        onClose={onClose}
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2DD4BF]/10">
            <UserPlus size={18} className="text-[#2DD4BF]" />
          </div>
        }
      >
        New Lead
      </ModalHeader>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <ModalBody className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#94A3B8]">First Name</label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                placeholder="John"
                required
                className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-3 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Last Name</label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                placeholder="Smith"
                required
                className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-3 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Phone</label>
            <div className="relative">
              <Phone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="(555) 000-0000"
                required
                className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-8 pr-3 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Email (optional)</label>
            <div className="relative">
              <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-8 pr-3 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Service Needed</label>
            <div className="relative">
              <Briefcase size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                name="service_needed"
                value={form.service_needed}
                onChange={handleChange}
                placeholder="AC repair, plumbing, etc."
                className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-8 pr-3 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
              />
            </div>
          </div>

        </ModalBody>
        <ModalFooter className="mt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-[rgba(148,163,184,0.1)] py-2 text-sm font-medium text-[#94A3B8] transition-colors hover:bg-white/[0.04] hover:text-[#F8FAFC]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-lg bg-[#2DD4BF] py-2 text-sm font-semibold text-[#0B1120] transition-all hover:bg-[#5EEAD4] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Creating...' : 'Create Lead'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
