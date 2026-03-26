'use client'

import { useEffect, useState } from 'react'
import { Check, Clock, MapPin, User } from 'lucide-react'
import type { AppointmentStatus } from '@/lib/types'

interface JobStatusTrackerProps {
  status: AppointmentStatus
  techName?: string | null
  eta?: string | null
  scheduledDate?: string | null
  scheduledTimeStart?: string | null
}

const STEPS: { key: AppointmentStatus | string; label: string; description: string }[] = [
  { key: 'scheduled', label: 'Scheduled', description: 'Your appointment is confirmed' },
  { key: 'confirmed', label: 'Tech Dispatched', description: 'Technician has been assigned' },
  { key: 'en_route', label: 'En Route', description: 'Technician is on the way' },
  { key: 'arrived', label: 'Arrived', description: 'Technician has arrived' },
  { key: 'in_progress', label: 'In Progress', description: 'Work is underway' },
  { key: 'completed', label: 'Complete', description: 'Job finished successfully' },
]

const STATUS_TO_STEP: Record<string, number> = {
  scheduled: 0,
  confirmed: 1,
  en_route: 2,
  arrived: 3,
  in_progress: 4,
  completed: 5,
}

export function JobStatusTracker({
  status,
  techName,
  eta,
  scheduledDate,
  scheduledTimeStart,
}: JobStatusTrackerProps) {
  const [animated, setAnimated] = useState(false)
  const currentStep = STATUS_TO_STEP[status] ?? 0

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="rounded-2xl p-6 space-y-6"
      style={{ background: '#111827', border: '1px solid rgba(148,163,184,0.1)' }}
    >
      <h2 className="text-lg font-semibold" style={{ color: '#F8FAFC' }}>
        Job Status
      </h2>

      {/* Tech info */}
      {(techName || eta || scheduledDate) && (
        <div
          className="rounded-xl p-4 flex flex-col gap-2"
          style={{ background: 'rgba(45,212,191,0.05)', border: '1px solid rgba(45,212,191,0.15)' }}
        >
          {techName && (
            <div className="flex items-center gap-3">
              {/* Photo placeholder */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(45,212,191,0.15)' }}
              >
                <User size={18} style={{ color: '#2DD4BF' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: '#F8FAFC' }}>
                  {techName}
                </p>
                <p className="text-xs" style={{ color: '#94A3B8' }}>
                  Your technician
                </p>
              </div>
            </div>
          )}
          {eta && (
            <div className="flex items-center gap-2 text-sm" style={{ color: '#94A3B8' }}>
              <Clock size={14} style={{ color: '#2DD4BF' }} />
              <span>ETA: <span style={{ color: '#F8FAFC' }}>{eta}</span></span>
            </div>
          )}
          {scheduledDate && scheduledTimeStart && (
            <div className="flex items-center gap-2 text-sm" style={{ color: '#94A3B8' }}>
              <MapPin size={14} style={{ color: '#2DD4BF' }} />
              <span>
                Scheduled:{' '}
                <span style={{ color: '#F8FAFC' }}>
                  {new Date(scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                  at {scheduledTimeStart}
                </span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-0">
        {STEPS.map((step, i) => {
          const isDone = i < currentStep
          const isCurrent = i === currentStep
          const isFuture = i > currentStep

          return (
            <div key={step.key} className="flex gap-3">
              {/* Line + dot column */}
              <div className="flex flex-col items-center" style={{ width: 28 }}>
                {/* Dot */}
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-500"
                  style={{
                    width: 28,
                    height: 28,
                    background: isDone
                      ? '#22c55e'
                      : isCurrent
                      ? '#2DD4BF'
                      : 'rgba(148,163,184,0.1)',
                    border: isCurrent ? '2px solid #2DD4BF' : 'none',
                    opacity: animated ? 1 : 0,
                    transform: animated ? 'scale(1)' : 'scale(0.5)',
                    transitionDelay: `${i * 80}ms`,
                  }}
                >
                  {isDone ? (
                    <Check size={14} color="#fff" />
                  ) : isCurrent ? (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: '#0B1120' }}
                    />
                  ) : null}
                </div>

                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div
                    className="flex-1 w-px transition-all duration-700"
                    style={{
                      minHeight: 24,
                      background: isDone
                        ? '#22c55e'
                        : 'rgba(148,163,184,0.15)',
                      transitionDelay: `${i * 80 + 200}ms`,
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <div className="pb-5" style={{ paddingTop: 4 }}>
                <p
                  className="text-sm font-medium transition-all duration-300"
                  style={{
                    color: isDone ? '#22c55e' : isCurrent ? '#2DD4BF' : '#64748B',
                    transitionDelay: `${i * 80}ms`,
                  }}
                >
                  {step.label}
                  {isCurrent && (
                    <span
                      className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(45,212,191,0.15)', color: '#2DD4BF' }}
                    >
                      Current
                    </span>
                  )}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: isFuture ? '#374151' : '#94A3B8' }}
                >
                  {step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
