'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import type { Appointment } from '@/lib/types'
import { MapPin, X } from 'lucide-react'

interface JobDot {
  id: string
  x: number
  y: number
  status: Appointment['status']
  service_type: string
  address: string
  scheduled_time_start: string
  scheduled_time_end: string
  estimated_value: number | null
}

const STATUS_COLORS: Record<Appointment['status'], string> = {
  scheduled: '#2DD4BF',
  confirmed: '#2DD4BF',
  in_progress: '#F59E0B',
  completed: '#22C55E',
  cancelled: '#EF4444',
  no_show: '#EF4444',
  rescheduled: '#8B5CF6',
}

const STATUS_LABELS: Record<Appointment['status'], string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
  rescheduled: 'Rescheduled',
}

function hashAddress(address: string, index: number): { x: number; y: number } {
  let hash = 0
  for (let i = 0; i < address.length; i++) {
    hash = ((hash << 5) - hash) + address.charCodeAt(i)
    hash |= 0
  }
  const seed = Math.abs(hash) + index * 1337
  const x = 8 + (seed % 84)
  const y = 8 + ((seed * 7919) % 84)
  return { x, y }
}

export function JobMap() {
  const { organization } = useAuth()
  const [jobs, setJobs] = useState<JobDot[]>([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<{ job: JobDot; mx: number; my: number } | null>(null)

  const fetchJobs = useCallback(async () => {
    if (!organization?.id) return
    const supabase = createSupabaseBrowserClient()
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('appointments')
      .select('id, status, service_type, address, scheduled_time_start, scheduled_time_end, estimated_value')
      .eq('organization_id', organization.id)
      .eq('scheduled_date', today)
      .order('scheduled_time_start')

    if (!error && data) {
      const dots: JobDot[] = data.map((a: any, i: number) => {
        const { x, y } = hashAddress(a.address || '', i)
        return {
          id: a.id,
          x,
          y,
          status: a.status as Appointment['status'],
          service_type: a.service_type,
          address: a.address,
          scheduled_time_start: a.scheduled_time_start,
          scheduled_time_end: a.scheduled_time_end,
          estimated_value: a.estimated_value,
        }
      })
      setJobs(dots)
    }
    setLoading(false)
  }, [organization?.id])

  useEffect(() => {
    fetchJobs()
    const supabase = createSupabaseBrowserClient()
    if (!organization?.id) return
    const today = new Date().toISOString().split('T')[0]
    const channel = supabase
      .channel('job-map-appointments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `organization_id=eq.${organization.id}`,
      }, (payload: any) => {
        const updated = payload.new as Appointment
        if (updated?.scheduled_date === today) fetchJobs()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchJobs, organization?.id])

  const statusCounts = jobs.reduce((acc, j) => {
    acc[j.status] = (acc[j.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#2DD4BF]" />
          <h2 className="text-lg font-semibold text-[#F8FAFC]">Today&apos;s Job Map</h2>
        </div>
        <span className="text-sm text-[#94A3B8]">{jobs.length} jobs today</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(STATUS_COLORS).map(([status, color]) => {
          const count = statusCounts[status] || 0
          if (count === 0) return null
          return (
            <div key={status} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-[#94A3B8]">{STATUS_LABELS[status as Appointment['status']]} ({count})</span>
            </div>
          )
        })}
      </div>

      {/* SVG Map */}
      <div className="relative w-full aspect-square max-h-[400px] overflow-hidden rounded-xl bg-[#0B1120] border border-[rgba(148,163,184,0.05)]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#2DD4BF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            onClick={() => setTooltip(null)}
          >
            {/* Grid lines */}
            {[20, 40, 60, 80].map(v => (
              <g key={v}>
                <line x1={v} y1="0" x2={v} y2="100" stroke="rgba(148,163,184,0.05)" strokeWidth="0.3" />
                <line x1="0" y1={v} x2="100" y2={v} stroke="rgba(148,163,184,0.05)" strokeWidth="0.3" />
              </g>
            ))}

            {/* Decorative city blocks */}
            {[
              { x: 15, y: 15, w: 12, h: 8 },
              { x: 35, y: 25, w: 10, h: 10 },
              { x: 55, y: 15, w: 14, h: 7 },
              { x: 20, y: 50, w: 8, h: 12 },
              { x: 60, y: 50, w: 16, h: 8 },
              { x: 40, y: 70, w: 12, h: 9 },
              { x: 70, y: 70, w: 8, h: 10 },
            ].map((b, i) => (
              <rect
                key={i}
                x={b.x} y={b.y} width={b.w} height={b.h}
                fill="rgba(45,212,191,0.03)"
                stroke="rgba(45,212,191,0.08)"
                strokeWidth="0.3"
                rx="0.5"
              />
            ))}

            {/* Roads */}
            <line x1="0" y1="40" x2="100" y2="40" stroke="rgba(148,163,184,0.1)" strokeWidth="0.8" />
            <line x1="0" y1="65" x2="100" y2="65" stroke="rgba(148,163,184,0.1)" strokeWidth="0.8" />
            <line x1="33" y1="0" x2="33" y2="100" stroke="rgba(148,163,184,0.1)" strokeWidth="0.8" />
            <line x1="67" y1="0" x2="67" y2="100" stroke="rgba(148,163,184,0.1)" strokeWidth="0.8" />

            {/* Job dots */}
            {jobs.map((job) => {
              const color = STATUS_COLORS[job.status] || '#94A3B8'
              return (
                <g key={job.id}>
                  {/* Pulse ring */}
                  {job.status === 'in_progress' && (
                    <circle
                      cx={job.x} cy={job.y} r="4"
                      fill="none"
                      stroke={color}
                      strokeWidth="0.5"
                      opacity="0.4"
                    />
                  )}
                  <circle
                    cx={job.x} cy={job.y} r="2.2"
                    fill={color}
                    stroke="rgba(11,17,32,0.8)"
                    strokeWidth="0.5"
                    className="cursor-pointer"
                    style={{ filter: `drop-shadow(0 0 2px ${color}88)` }}
                    onClick={(e) => {
                      e.stopPropagation()
                      const rect = (e.currentTarget.closest('svg') as SVGSVGElement).getBoundingClientRect()
                      const svgX = (job.x / 100) * rect.width + rect.left
                      const svgY = (job.y / 100) * rect.height + rect.top
                      setTooltip({ job, mx: svgX, my: svgY })
                    }}
                  />
                </g>
              )
            })}

            {jobs.length === 0 && (
              <text x="50" y="50" textAnchor="middle" fill="#64748B" fontSize="4">
                No jobs scheduled today
              </text>
            )}
          </svg>
        )}

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-10 bg-[#1E293B] border border-[rgba(148,163,184,0.2)] rounded-xl p-3 shadow-xl text-sm pointer-events-none"
            style={{
              left: '50%',
              top: '10px',
              transform: 'translateX(-50%)',
              maxWidth: '220px',
              width: '220px',
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="font-semibold text-[#F8FAFC] text-xs">{tooltip.job.service_type}</span>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: `${STATUS_COLORS[tooltip.job.status]}22`,
                  color: STATUS_COLORS[tooltip.job.status],
                }}
              >
                {STATUS_LABELS[tooltip.job.status]}
              </span>
            </div>
            <p className="text-[#94A3B8] text-xs mb-1">{tooltip.job.address}</p>
            <p className="text-[#64748B] text-xs">
              {tooltip.job.scheduled_time_start} – {tooltip.job.scheduled_time_end}
            </p>
            {tooltip.job.estimated_value && (
              <p className="text-[#2DD4BF] text-xs mt-1 font-medium">
                ${tooltip.job.estimated_value.toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
