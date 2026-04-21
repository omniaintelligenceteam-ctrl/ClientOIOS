'use client'

import { useState } from 'react'
import { CalendarDays, User, Phone, Clock, Briefcase, MapPin } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/toast'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'

interface BookJobModalProps {
  open: boolean
  onClose: () => void
}

export function BookJobModal({ open, onClose }: BookJobModalProps) {
  const { organization, profile } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    address: '',
    service_type: '',
    scheduled_date: '',
    scheduled_time: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setForm({
      customer_name: '',
      customer_phone: '',
      address: '',
      service_type: '',
      scheduled_date: '',
      scheduled_time: '',
      notes: '',
    })
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function splitName(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    const firstName = parts[0] || 'Customer'
    const lastName = parts.slice(1).join(' ') || 'Unknown'
    return { firstName, lastName }
  }

  function addHour(time: string) {
    const [hours, minutes] = time.split(':').map((v) => Number(v))
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return time
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    date.setMinutes(date.getMinutes() + 60)
    return date.toTimeString().slice(0, 5)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!organization?.id || !profile?.id) {
      toast.error('Your account is missing organization context. Please refresh.')
      return
    }

    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      toast.error('Could not connect to database.')
      return
    }

    const phone = form.customer_phone.trim()
    const customerName = form.customer_name.trim()
    const address = form.address.trim()
    const serviceType = form.service_type.trim()

    if (!phone || !customerName || !address || !serviceType || !form.scheduled_date || !form.scheduled_time) {
      toast.error('Please complete all required fields.')
      return
    }

    setSaving(true)
    const now = new Date().toISOString()
    let customerId: string | null = null

    const existingCustomer = await supabase
      .from('customers')
      .select('id')
      .eq('organization_id', organization.id)
      .eq('phone', phone)
      .maybeSingle()

    if (existingCustomer.error) {
      setSaving(false)
      toast.error('Failed to find customer record.')
      return
    }

    if (existingCustomer.data?.id) {
      customerId = existingCustomer.data.id
      await supabase
        .from('customers')
        .update({
          address,
          last_contact_at: now,
          updated_at: now,
        })
        .eq('id', customerId)
    } else {
      const { firstName, lastName } = splitName(customerName)
      const createdCustomer = await supabase
        .from('customers')
        .insert({
          organization_id: organization.id,
          first_name: firstName,
          last_name: lastName,
          phone,
          address,
          total_jobs: 0,
          total_revenue: 0,
          lifetime_value: 0,
          first_contact_at: now,
          last_contact_at: now,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single()

      if (createdCustomer.error || !createdCustomer.data?.id) {
        setSaving(false)
        toast.error('Failed to create customer for this appointment.')
        return
      }
      customerId = createdCustomer.data.id
    }

    const startTime = form.scheduled_time
    const endTime = addHour(startTime)

    const { error } = await supabase.from('appointments').insert({
      organization_id: organization.id,
      customer_id: customerId,
      service_type: serviceType,
      status: 'scheduled',
      scheduled_date: form.scheduled_date,
      scheduled_time_start: startTime,
      scheduled_time_end: endTime,
      address,
      notes: form.notes.trim() || null,
      reminder_sent: false,
      confirmation_sent: false,
      customer_confirmed: false,
      created_by: profile.id,
      created_at: now,
      updated_at: now,
    })

    setSaving(false)

    if (error) {
      toast.error('Failed to book job. Please try again.')
      return
    }

    toast.success('Job booked successfully.')
    resetForm()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} size="md">
      <ModalHeader
        onClose={onClose}
        icon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2DD4BF]/10">
            <CalendarDays size={18} className="text-[#2DD4BF]" />
          </div>
        }
      >
        Book Job
      </ModalHeader>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <ModalBody className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Customer Name</label>
            <div className="relative">
              <User size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                name="customer_name"
                value={form.customer_name}
                onChange={handleChange}
                placeholder="Jane Smith"
                required
                className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-8 pr-3 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Phone</label>
            <div className="relative">
              <Phone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                name="customer_phone"
                value={form.customer_phone}
                onChange={handleChange}
                placeholder="(555) 000-0000"
                required
                className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-8 pr-3 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Address</label>
            <div className="relative">
              <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="123 Main St, City, State"
                required
                className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-8 pr-3 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Service Type</label>
            <div className="relative">
              <Briefcase size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                name="service_type"
                value={form.service_type}
                onChange={handleChange}
                placeholder="AC repair, drain cleaning, etc."
                required
                className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-8 pr-3 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Date</label>
              <div className="relative">
                <CalendarDays size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  name="scheduled_date"
                  type="date"
                  value={form.scheduled_date}
                  onChange={handleChange}
                  required
                  className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-8 pr-2 text-sm text-[#F8FAFC] outline-none focus:border-[#2DD4BF]/40"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#94A3B8]">Time</label>
              <div className="relative">
                <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  name="scheduled_time"
                  type="time"
                  value={form.scheduled_time}
                  onChange={handleChange}
                  required
                  className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-8 pr-2 text-sm text-[#F8FAFC] outline-none focus:border-[#2DD4BF]/40"
                />
              </div>
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
            {saving ? 'Booking...' : 'Book Job'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
