'use client'

import { useState, useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import type { Customer } from '@/lib/types'

interface Props {
  customers: Customer[]
  initialDate?: string
  onClose: () => void
  onCreated: () => void
}

interface FormErrors {
  customer_id?: string
  service_type?: string
  scheduled_date?: string
  scheduled_time_start?: string
  scheduled_time_end?: string
  address?: string
}

export function NewAppointmentModal({ customers, initialDate, onClose, onCreated }: Props) {
  const { profile, organization } = useAuth()
  const supabase = createSupabaseBrowserClient()

  const [form, setForm] = useState({
    customer_id: '',
    phone: '',
    service_type: '',
    scheduled_date: initialDate ?? new Date().toISOString().split('T')[0],
    scheduled_time_start: '09:00',
    scheduled_time_end: '10:00',
    address: '',
    notes: '',
    estimated_value: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [customerQuery, setCustomerQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filteredCustomers = customers.filter((c) => {
    const name = `${c.first_name} ${c.last_name}`.toLowerCase()
    const q = customerQuery.toLowerCase()
    return name.includes(q) || (c.phone ?? '').includes(q)
  })

  const selectCustomer = (c: Customer) => {
    setForm((f) => ({ ...f, customer_id: c.id, phone: c.phone ?? '', address: f.address || c.address || '' }))
    setCustomerQuery(`${c.first_name} ${c.last_name}`)
    setShowDropdown(false)
    if (errors.customer_id) setErrors((e) => ({ ...e, customer_id: undefined }))
  }

  const validate = (): boolean => {
    const errs: FormErrors = {}
    if (!form.customer_id) errs.customer_id = 'Please select a customer'
    if (!form.service_type.trim()) errs.service_type = 'Service type is required'
    if (!form.scheduled_date) errs.scheduled_date = 'Date is required'
    if (!form.scheduled_time_start) errs.scheduled_time_start = 'Start time is required'
    if (!form.scheduled_time_end) errs.scheduled_time_end = 'End time is required'
    if (!form.address.trim()) errs.address = 'Address is required'
    if (form.scheduled_time_end <= form.scheduled_time_start) {
      errs.scheduled_time_end = 'End time must be after start time'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    if (!organization?.id || !profile?.id) return

    setSaving(true)
    const { error } = await supabase.from('appointments').insert({
      organization_id: organization.id,
      customer_id: form.customer_id,
      service_type: form.service_type,
      status: 'scheduled',
      scheduled_date: form.scheduled_date,
      scheduled_time_start: form.scheduled_time_start,
      scheduled_time_end: form.scheduled_time_end,
      address: form.address,
      notes: form.notes || null,
      estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
      reminder_sent: false,
      confirmation_sent: false,
      customer_confirmed: false,
      created_by: profile.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    if (!error) {
      onCreated()
    } else {
      console.error('Error creating appointment:', error)
    }
  }

  const field = (label: string, children: React.ReactNode, error?: string) => (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-400">{label}</label>
      {children}
      {error && <p className="mt-1 text-[11px] text-[#ef4444]">{error}</p>}
    </div>
  )

  const inputClass = (hasError?: boolean) =>
    `h-10 w-full rounded-lg border ${hasError ? 'border-[#ef4444]' : 'border-[rgba(148,163,184,0.1)]'} bg-[#0B1120] px-3 text-sm text-[#F8FAFC] placeholder-slate-600 outline-none transition-colors focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20`

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-4 bottom-4 top-4 z-50 mx-auto flex max-w-lg flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90vh] sm:-translate-x-1/2 sm:-translate-y-1/2">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.1)] px-5 py-4">
          <h2 className="text-base font-semibold text-[#F8FAFC]">New Appointment</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex flex-col gap-4">

              {/* Customer autocomplete */}
              {field('Customer *', (
                <div ref={dropdownRef} className="relative">
                  <input
                    type="text"
                    value={customerQuery}
                    onChange={(e) => {
                      setCustomerQuery(e.target.value)
                      setShowDropdown(true)
                      if (!e.target.value) {
                        setForm((f) => ({ ...f, customer_id: '', phone: '' }))
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search customer..."
                    className={inputClass(!!errors.customer_id)}
                  />
                  {showDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#1E293B] shadow-lg">
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectCustomer(c)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2DD4BF]/15 text-xs font-bold text-[#2DD4BF]">
                            {c.first_name[0]}{c.last_name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#F8FAFC]">{c.first_name} {c.last_name}</p>
                            <p className="text-xs text-slate-500">{c.phone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ), errors.customer_id)}

              {/* Phone (auto-filled) */}
              {field('Phone', (
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Auto-filled from customer"
                  className={inputClass()}
                />
              ))}

              {/* Service type */}
              {field('Service Type *', (
                <input
                  type="text"
                  value={form.service_type}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, service_type: e.target.value }))
                    if (errors.service_type) setErrors((e) => ({ ...e, service_type: undefined }))
                  }}
                  placeholder="e.g. HVAC Installation, Plumbing Repair"
                  className={inputClass(!!errors.service_type)}
                />
              ), errors.service_type)}

              {/* Date */}
              {field('Date *', (
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, scheduled_date: e.target.value }))
                    if (errors.scheduled_date) setErrors((e) => ({ ...e, scheduled_date: undefined }))
                  }}
                  className={inputClass(!!errors.scheduled_date)}
                />
              ), errors.scheduled_date)}

              {/* Time range */}
              <div className="grid grid-cols-2 gap-3">
                {field('Start Time *', (
                  <input
                    type="time"
                    value={form.scheduled_time_start}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, scheduled_time_start: e.target.value }))
                      if (errors.scheduled_time_start) setErrors((e) => ({ ...e, scheduled_time_start: undefined }))
                    }}
                    className={inputClass(!!errors.scheduled_time_start)}
                  />
                ), errors.scheduled_time_start)}

                {field('End Time *', (
                  <input
                    type="time"
                    value={form.scheduled_time_end}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, scheduled_time_end: e.target.value }))
                      if (errors.scheduled_time_end) setErrors((e) => ({ ...e, scheduled_time_end: undefined }))
                    }}
                    className={inputClass(!!errors.scheduled_time_end)}
                  />
                ), errors.scheduled_time_end)}
              </div>

              {/* Address */}
              {field('Address *', (
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, address: e.target.value }))
                    if (errors.address) setErrors((e) => ({ ...e, address: undefined }))
                  }}
                  placeholder="123 Main St, City, State"
                  className={inputClass(!!errors.address)}
                />
              ), errors.address)}

              {/* Estimated Value */}
              {field('Estimated Value ($)', (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estimated_value}
                  onChange={(e) => setForm((f) => ({ ...f, estimated_value: e.target.value }))}
                  placeholder="0.00"
                  className={inputClass()}
                />
              ))}

              {/* Notes */}
              {field('Notes', (
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Any additional notes..."
                  className="w-full resize-none rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] p-3 text-sm text-[#F8FAFC] placeholder-slate-600 outline-none transition-colors focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
                />
              ))}

            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-[rgba(148,163,184,0.1)] p-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[rgba(148,163,184,0.1)] py-2.5 text-sm font-medium text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-[#2DD4BF] py-2.5 text-sm font-semibold text-[#0B1120] shadow-lg shadow-[#2DD4BF]/20 transition-all hover:bg-[#5EEAD4] disabled:opacity-60 active:scale-[0.98]"
            >
              {saving ? 'Creating...' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
