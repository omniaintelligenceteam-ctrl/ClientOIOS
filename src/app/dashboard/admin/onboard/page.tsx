'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import {
  ShieldAlert,
  Building2,
  UserPlus,
  ClipboardCheck,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TRADES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'landscape_lighting', label: 'Landscape Lighting' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'locksmith', label: 'Locksmith' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'painting', label: 'Painting' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'dental', label: 'Dental' },
  { value: 'auto_repair', label: 'Auto Repair' },
  { value: 'other', label: 'Other' },
]

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
]

const TIERS = [
  { value: 'answering_service', label: 'Answering Service', description: 'AI call handling & messages' },
  { value: 'office_manager', label: 'Office Manager', description: 'Leads, scheduling & CRM' },
  { value: 'growth_engine', label: 'Growth Engine', description: 'Full suite with marketing & invoicing' },
]

const STEPS = [
  { number: 1, label: 'Business', icon: Building2 },
  { number: 2, label: 'Account', icon: UserPlus },
  { number: 3, label: 'Review', icon: ClipboardCheck },
]

/* ------------------------------------------------------------------ */
/*  Form State Types                                                   */
/* ------------------------------------------------------------------ */

interface FormData {
  // Step 1 - Business
  companyName: string
  trade: string
  phone: string
  timezone: string
  weekdayOpen: string
  weekdayClose: string
  // Step 2 - Owner
  ownerName: string
  ownerEmail: string
  ownerPassword: string
  tier: string
}

interface FormErrors {
  [key: string]: string
}

const INITIAL_FORM: FormData = {
  companyName: '',
  trade: '',
  phone: '',
  timezone: 'America/New_York',
  weekdayOpen: '08:00',
  weekdayClose: '17:00',
  ownerName: '',
  ownerEmail: '',
  ownerPassword: '',
  tier: 'answering_service',
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminOnboardPage() {
  const { isSuperAdmin, isLoading: authLoading } = useAuth()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(INITIAL_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [createdOrg, setCreatedOrg] = useState<{
    id: string
    name: string
    slug: string
    tier: string
    ownerEmail: string
  } | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  /* ---- Auth gate ---- */

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#2DD4BF]" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-8 text-center max-w-md">
          <ShieldAlert size={48} className="mx-auto mb-4 text-[#f97316]" />
          <h2 className="text-xl font-bold text-[#F8FAFC] mb-2">Access Denied</h2>
          <p className="text-sm text-[#94A3B8]">
            You must be a super admin to access the client onboarding wizard.
          </p>
        </div>
      </div>
    )
  }

  /* ---- Helpers ---- */

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    // Clear error for this field when user types
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  function validateStep1(): boolean {
    const errs: FormErrors = {}
    if (!form.companyName.trim()) errs.companyName = 'Company name is required'
    if (!form.trade) errs.trade = 'Please select a trade'
    if (form.phone && !/^[\d\s\-+()]{7,20}$/.test(form.phone)) {
      errs.phone = 'Enter a valid phone number'
    }
    if (!form.weekdayOpen || !form.weekdayClose) {
      errs.weekdayOpen = 'Business hours are required'
    } else if (form.weekdayOpen >= form.weekdayClose) {
      errs.weekdayClose = 'Close time must be after open time'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateStep2(): boolean {
    const errs: FormErrors = {}
    if (!form.ownerName.trim()) errs.ownerName = 'Owner name is required'
    if (!form.ownerEmail.trim()) {
      errs.ownerEmail = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail)) {
      errs.ownerEmail = 'Enter a valid email address'
    }
    if (!form.ownerPassword) {
      errs.ownerPassword = 'Password is required'
    } else if (form.ownerPassword.length < 8) {
      errs.ownerPassword = 'Password must be at least 8 characters'
    }
    if (!form.tier) errs.tier = 'Please select a tier'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function goNext() {
    if (step === 1 && validateStep1()) setStep(2)
    else if (step === 2 && validateStep2()) setStep(3)
  }

  function goBack() {
    setErrors({})
    if (step > 1) setStep(step - 1)
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const body = {
        company_name: form.companyName.trim(),
        trade: form.trade,
        phone: form.phone.trim() || null,
        timezone: form.timezone,
        business_hours: {
          monday: { open: form.weekdayOpen, close: form.weekdayClose },
          tuesday: { open: form.weekdayOpen, close: form.weekdayClose },
          wednesday: { open: form.weekdayOpen, close: form.weekdayClose },
          thursday: { open: form.weekdayOpen, close: form.weekdayClose },
          friday: { open: form.weekdayOpen, close: form.weekdayClose },
        },
        owner_name: form.ownerName.trim(),
        owner_email: form.ownerEmail.trim(),
        owner_password: form.ownerPassword,
        tier: form.tier,
      }

      const res = await fetch('/api/admin/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server error (${res.status})`)
      }

      const data = await res.json()
      setCreatedOrg({
        id: data.organization?.id ?? data.id ?? '',
        name: form.companyName.trim(),
        slug: data.organization?.slug ?? data.slug ?? '',
        tier: form.tier,
        ownerEmail: form.ownerEmail.trim(),
      })
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetWizard() {
    setForm(INITIAL_FORM)
    setStep(1)
    setErrors({})
    setSubmitError(null)
    setCreatedOrg(null)
    setShowPassword(false)
  }

  /* ---- Render pieces ---- */

  const inputClasses =
    'w-full rounded-lg border border-slate-700 bg-[#0B1120] px-4 py-2.5 text-sm text-slate-200 placeholder-[#64748B] outline-none transition-colors focus:border-[#2DD4BF]/50 focus:ring-1 focus:ring-[#2DD4BF]/20'

  const inputErrorClasses =
    'w-full rounded-lg border border-red-500/60 bg-[#0B1120] px-4 py-2.5 text-sm text-slate-200 placeholder-[#64748B] outline-none transition-colors focus:border-red-400 focus:ring-1 focus:ring-red-400/20'

  const selectClasses =
    'w-full rounded-lg border border-slate-700 bg-[#0B1120] px-4 py-2.5 text-sm text-slate-200 outline-none transition-colors focus:border-[#2DD4BF]/50 focus:ring-1 focus:ring-[#2DD4BF]/20 appearance-none cursor-pointer'

  const labelClasses = 'block text-sm font-medium text-[#94A3B8] mb-1.5'

  /* ---------------------------------------------------------------- */
  /*  Success State                                                    */
  /* ---------------------------------------------------------------- */

  if (createdOrg) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#2DD4BF]/10">
            <CheckCircle2 size={36} className="text-[#2DD4BF]" />
          </div>
          <h2 className="text-2xl font-bold text-[#F8FAFC] mb-2">Client Created Successfully</h2>
          <p className="text-[#94A3B8] mb-8">
            The organization and owner account have been set up.
          </p>

          <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] p-6 text-left mb-8">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#64748B] mb-4">
              New Organization Details
            </h3>
            <div className="space-y-3">
              <DetailRow label="Organization" value={createdOrg.name} />
              {createdOrg.id && <DetailRow label="Org ID" value={createdOrg.id} mono />}
              {createdOrg.slug && <DetailRow label="Slug" value={createdOrg.slug} mono />}
              <DetailRow
                label="Tier"
                value={TIERS.find((t) => t.value === createdOrg.tier)?.label ?? createdOrg.tier}
              />
              <DetailRow label="Owner Email" value={createdOrg.ownerEmail} />
            </div>
          </div>

          <button
            type="button"
            onClick={resetWizard}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-6 py-2.5 text-sm font-semibold text-[#0B1120] shadow-lg shadow-[#2DD4BF]/20 transition-all hover:shadow-[#2DD4BF]/30 active:scale-[0.98]"
          >
            Create Another Client
          </button>
        </div>
      </div>
    )
  }

  /* ---------------------------------------------------------------- */
  /*  Wizard                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="mx-auto max-w-2xl py-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Create Client</h1>
        <p className="mt-1 text-sm text-[#94A3B8]">
          Set up a new organization and owner account.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, idx) => {
            const Icon = s.icon
            const isActive = step === s.number
            const isCompleted = step > s.number

            return (
              <div key={s.number} className="flex flex-1 items-center">
                {/* Step circle + label */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                      isCompleted
                        ? 'border-[#2DD4BF] bg-[#2DD4BF]/10'
                        : isActive
                        ? 'border-[#2DD4BF] bg-[#2DD4BF]/5'
                        : 'border-slate-700 bg-[#0B1120]'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={18} className="text-[#2DD4BF]" />
                    ) : (
                      <Icon
                        size={18}
                        className={isActive ? 'text-[#2DD4BF]' : 'text-[#64748B]'}
                      />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      isActive || isCompleted ? 'text-[#2DD4BF]' : 'text-[#64748B]'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>

                {/* Connector line */}
                {idx < STEPS.length - 1 && (
                  <div className="mx-3 mt-[-1.25rem] h-[2px] flex-1">
                    <div
                      className={`h-full rounded-full transition-colors duration-200 ${
                        step > s.number ? 'bg-[#2DD4BF]' : 'bg-slate-700'
                      }`}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Card Body */}
      <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-6 sm:p-8">
        {/* Step 1: Business Details */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-1">Business Details</h2>
            <p className="text-sm text-[#64748B] mb-6">
              Basic information about the client&apos;s business.
            </p>

            {/* Company Name */}
            <div>
              <label className={labelClasses}>
                Company Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                placeholder="e.g. Acme Plumbing Co."
                className={errors.companyName ? inputErrorClasses : inputClasses}
              />
              {errors.companyName && (
                <p className="mt-1 text-xs text-red-400">{errors.companyName}</p>
              )}
            </div>

            {/* Trade */}
            <div>
              <label className={labelClasses}>
                Trade / Industry <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.trade}
                  onChange={(e) => updateField('trade', e.target.value)}
                  className={`${errors.trade ? inputErrorClasses : selectClasses}`}
                >
                  <option value="">Select a trade...</option>
                  {TRADES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <ChevronRight
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#64748B]"
                />
              </div>
              {errors.trade && <p className="mt-1 text-xs text-red-400">{errors.trade}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className={labelClasses}>Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(555) 123-4567"
                className={errors.phone ? inputErrorClasses : inputClasses}
              />
              {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
            </div>

            {/* Timezone */}
            <div>
              <label className={labelClasses}>Timezone</label>
              <div className="relative">
                <select
                  value={form.timezone}
                  onChange={(e) => updateField('timezone', e.target.value)}
                  className={selectClasses}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                <ChevronRight
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#64748B]"
                />
              </div>
            </div>

            {/* Business Hours */}
            <div>
              <label className={labelClasses}>Weekday Business Hours</label>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={form.weekdayOpen}
                  onChange={(e) => updateField('weekdayOpen', e.target.value)}
                  className={`flex-1 ${errors.weekdayOpen ? inputErrorClasses : inputClasses}`}
                />
                <span className="text-sm text-[#64748B]">to</span>
                <input
                  type="time"
                  value={form.weekdayClose}
                  onChange={(e) => updateField('weekdayClose', e.target.value)}
                  className={`flex-1 ${errors.weekdayClose ? inputErrorClasses : inputClasses}`}
                />
              </div>
              {(errors.weekdayOpen || errors.weekdayClose) && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.weekdayOpen || errors.weekdayClose}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Owner Account */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-1">Owner Account</h2>
            <p className="text-sm text-[#64748B] mb-6">
              Create the primary owner account for this organization.
            </p>

            {/* Owner Name */}
            <div>
              <label className={labelClasses}>
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.ownerName}
                onChange={(e) => updateField('ownerName', e.target.value)}
                placeholder="Jane Smith"
                className={errors.ownerName ? inputErrorClasses : inputClasses}
              />
              {errors.ownerName && (
                <p className="mt-1 text-xs text-red-400">{errors.ownerName}</p>
              )}
            </div>

            {/* Owner Email */}
            <div>
              <label className={labelClasses}>
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={form.ownerEmail}
                onChange={(e) => updateField('ownerEmail', e.target.value)}
                placeholder="jane@acmeplumbing.com"
                className={errors.ownerEmail ? inputErrorClasses : inputClasses}
              />
              {errors.ownerEmail && (
                <p className="mt-1 text-xs text-red-400">{errors.ownerEmail}</p>
              )}
            </div>

            {/* Owner Password */}
            <div>
              <label className={labelClasses}>
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.ownerPassword}
                  onChange={(e) => updateField('ownerPassword', e.target.value)}
                  placeholder="Min 8 characters"
                  className={errors.ownerPassword ? inputErrorClasses : inputClasses}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#94A3B8] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.ownerPassword && (
                <p className="mt-1 text-xs text-red-400">{errors.ownerPassword}</p>
              )}
              {!errors.ownerPassword && form.ownerPassword.length > 0 && (
                <p
                  className={`mt-1 text-xs ${
                    form.ownerPassword.length >= 8 ? 'text-[#2DD4BF]' : 'text-[#f97316]'
                  }`}
                >
                  {form.ownerPassword.length}/8 characters
                </p>
              )}
            </div>

            {/* Tier Selection */}
            <div>
              <label className={labelClasses}>
                Tier <span className="text-red-400">*</span>
              </label>
              <div className="space-y-2">
                {TIERS.map((t) => (
                  <label
                    key={t.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                      form.tier === t.value
                        ? 'border-[#2DD4BF]/40 bg-[#2DD4BF]/5'
                        : 'border-slate-700 bg-[#0B1120] hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tier"
                      value={t.value}
                      checked={form.tier === t.value}
                      onChange={(e) => updateField('tier', e.target.value)}
                      className="mt-0.5 accent-[#2DD4BF]"
                    />
                    <div>
                      <span className="text-sm font-medium text-[#F8FAFC]">{t.label}</span>
                      <p className="text-xs text-[#64748B] mt-0.5">{t.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.tier && <p className="mt-1 text-xs text-red-400">{errors.tier}</p>}
            </div>
          </div>
        )}

        {/* Step 3: Review & Create */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[#F8FAFC] mb-1">Review &amp; Create</h2>
            <p className="text-sm text-[#64748B] mb-6">
              Confirm the details below before creating the client.
            </p>

            {/* Business Section */}
            <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Building2 size={16} className="text-[#2DD4BF]" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Business Details
                </h3>
              </div>
              <div className="space-y-2.5">
                <DetailRow label="Company" value={form.companyName} />
                <DetailRow
                  label="Trade"
                  value={TRADES.find((t) => t.value === form.trade)?.label ?? form.trade}
                />
                <DetailRow label="Phone" value={form.phone || 'Not provided'} muted={!form.phone} />
                <DetailRow
                  label="Timezone"
                  value={TIMEZONES.find((tz) => tz.value === form.timezone)?.label ?? form.timezone}
                />
                <DetailRow
                  label="Hours (Weekdays)"
                  value={`${formatTime(form.weekdayOpen)} - ${formatTime(form.weekdayClose)}`}
                />
              </div>
            </div>

            {/* Account Section */}
            <div className="rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] p-5">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus size={16} className="text-[#2DD4BF]" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#94A3B8]">
                  Owner Account
                </h3>
              </div>
              <div className="space-y-2.5">
                <DetailRow label="Name" value={form.ownerName} />
                <DetailRow label="Email" value={form.ownerEmail} />
                <DetailRow label="Password" value={'*'.repeat(form.ownerPassword.length)} />
                <DetailRow
                  label="Tier"
                  value={TIERS.find((t) => t.value === form.tier)?.label ?? form.tier}
                />
              </div>
            </div>

            {/* Submit Error */}
            {submitError && (
              <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-400">Failed to create client</p>
                  <p className="mt-0.5 text-xs text-red-400/80">{submitError}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex items-center justify-between border-t border-[rgba(148,163,184,0.1)] pt-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-[#94A3B8] transition-colors hover:border-slate-600 hover:text-[#F8FAFC] disabled:opacity-50"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-5 py-2.5 text-sm font-semibold text-[#0B1120] shadow-lg shadow-[#2DD4BF]/20 transition-all hover:shadow-[#2DD4BF]/30 active:scale-[0.98]"
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-400 px-6 py-2.5 text-sm font-semibold text-[#0B1120] shadow-lg shadow-[#2DD4BF]/20 transition-all hover:shadow-[#2DD4BF]/30 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Create Client
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                              */
/* ------------------------------------------------------------------ */

function DetailRow({
  label,
  value,
  mono,
  muted,
}: {
  label: string
  value: string
  mono?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-[#64748B] flex-shrink-0">{label}</span>
      <span
        className={`text-sm text-right truncate ${
          muted ? 'text-[#64748B] italic' : 'text-[#F8FAFC]'
        } ${mono ? 'font-mono text-xs' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}

function formatTime(time: string): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}
