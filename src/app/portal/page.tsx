'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { JobStatusTracker } from '@/components/portal/job-status-tracker'
import type { Appointment, Customer, Organization } from '@/lib/types'
import { MapPin, Phone, Clock, Wrench, Share2 } from 'lucide-react'

interface PortalData {
  appointment: Appointment
  customer: Customer
  organization: Organization
}

function PortalContent() {
  const searchParams = useSearchParams()
  const jobId = searchParams.get('job')
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedShare, setCopiedShare] = useState(false)

  useEffect(() => {
    if (!jobId) {
      setError('No job ID provided')
      setLoading(false)
      return
    }

    async function fetchJobData() {
      const supabase = createSupabaseBrowserClient()
      if (!supabase) {
        setError('Unable to connect to database')
        setLoading(false)
        return
      }

      try {
        const { data: appointment, error: apptError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', jobId!)
          .single()

        if (apptError || !appointment) {
          setError('Job not found')
          setLoading(false)
          return
        }

        const [customerResult, orgResult] = await Promise.all([
          supabase.from('customers').select('*').eq('id', appointment.customer_id).single(),
          supabase.from('organizations').select('*').eq('id', appointment.organization_id).single(),
        ])

        setData({
          appointment: appointment as Appointment,
          customer: customerResult.data as Customer,
          organization: orgResult.data as Organization,
        })
      } catch {
        setError('Unable to load job information')
      } finally {
        setLoading(false)
      }
    }

    fetchJobData()
  }, [jobId])

  if (!jobId) {
    return (
      <div className="text-center py-16" style={{ color: '#94A3B8' }}>
        <p className="text-lg">No job ID provided.</p>
        <p className="text-sm mt-2">Please use a valid portal link.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-6 animate-pulse"
            style={{ background: '#111827', height: 120 }}
          />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: '#111827', border: '1px solid rgba(148,163,184,0.1)' }}
      >
        <p style={{ color: '#F8FAFC' }} className="font-medium">
          {error || 'Job not found'}
        </p>
        <p className="text-sm mt-2" style={{ color: '#64748B' }}>
          Please contact the company for assistance.
        </p>
      </div>
    )
  }

  const { appointment, customer, organization } = data

  return (
    <div className="space-y-4">
      {/* Company branding card */}
      <div
        className="rounded-2xl p-6"
        style={{ background: '#111827', border: '1px solid rgba(148,163,184,0.1)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#F8FAFC' }}>
              {organization.name}
            </h1>
            <p className="text-sm mt-1 capitalize" style={{ color: '#2DD4BF' }}>
              {organization.trade}
            </p>
          </div>
          {organization.phone_number && (
            <a
              href={`tel:${organization.phone_number}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-opacity hover:opacity-80"
              style={{ background: 'rgba(45,212,191,0.1)', color: '#2DD4BF' }}
            >
              <Phone size={14} />
              Call Us
            </a>
          )}
        </div>
      </div>

      {/* Customer greeting */}
      <div
        className="rounded-2xl p-5"
        style={{ background: '#111827', border: '1px solid rgba(148,163,184,0.1)' }}
      >
        <p className="text-sm" style={{ color: '#94A3B8' }}>
          Hi, {customer.first_name}! Here&apos;s the status of your service appointment.
        </p>
      </div>

      {/* Job details */}
      <div
        className="rounded-2xl p-6 space-y-3"
        style={{ background: '#111827', border: '1px solid rgba(148,163,184,0.1)' }}
      >
        <h2 className="text-base font-semibold" style={{ color: '#F8FAFC' }}>
          Appointment Details
        </h2>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <Wrench size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#2DD4BF' }} />
            <span style={{ color: '#94A3B8' }}>
              Service: <span style={{ color: '#F8FAFC' }}>{appointment.service_type}</span>
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Clock size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#2DD4BF' }} />
            <span style={{ color: '#94A3B8' }}>
              Date:{' '}
              <span style={{ color: '#F8FAFC' }}>
                {new Date(appointment.scheduled_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}{' '}
                - {appointment.scheduled_time_start} to {appointment.scheduled_time_end}
              </span>
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <MapPin size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#2DD4BF' }} />
            <span style={{ color: '#94A3B8' }}>
              Address: <span style={{ color: '#F8FAFC' }}>{appointment.address}</span>
            </span>
          </div>
        </div>
        {appointment.notes && (
          <p className="text-xs mt-2 p-3 rounded-lg" style={{ background: 'rgba(148,163,184,0.05)', color: '#94A3B8' }}>
            Notes: {appointment.notes}
          </p>
        )}
      </div>

      {/* Status tracker */}
      <JobStatusTracker
        status={appointment.status}
        scheduledDate={appointment.scheduled_date}
        scheduledTimeStart={appointment.scheduled_time_start}
      />

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href={`/portal/review?job=${appointment.id}`}
          className="rounded-xl p-4 text-center text-sm font-medium transition-opacity hover:opacity-80"
          style={{ background: 'rgba(45,212,191,0.1)', color: '#2DD4BF', border: '1px solid rgba(45,212,191,0.2)' }}
        >
          Leave a Review
        </a>
        <button
          onClick={() => {
            const url = `${window.location.origin}/portal?job=${appointment.id}`
            navigator.clipboard.writeText(url).then(() => {
              setCopiedShare(true)
              window.setTimeout(() => setCopiedShare(false), 2000)
            })
          }}
          className="rounded-xl p-4 text-center text-sm font-medium transition-opacity hover:opacity-80 flex items-center justify-center gap-2"
          style={{ background: 'rgba(148,163,184,0.05)', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.1)' }}
        >
          <Share2 size={14} />
          {copiedShare ? 'Copied' : 'Share'}
        </button>
      </div>
    </div>
  )
}

export default function ClientPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl p-6 animate-pulse"
              style={{ background: '#111827', height: 120 }}
            />
          ))}
        </div>
      }
    >
      <PortalContent />
    </Suspense>
  )
}
