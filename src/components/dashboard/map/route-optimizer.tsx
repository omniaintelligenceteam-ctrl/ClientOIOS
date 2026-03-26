'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import type { Appointment, TeamMember } from '@/lib/types'
import { Route, GripVertical, Clock, MapPin, ChevronRight } from 'lucide-react'

interface TechRoute {
  techId: string
  techName: string
  jobs: Appointment[]
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#2DD4BF',
  confirmed: '#2DD4BF',
  in_progress: '#F59E0B',
  completed: '#22C55E',
  cancelled: '#EF4444',
  no_show: '#EF4444',
  rescheduled: '#8B5CF6',
}

function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function RouteOptimizer() {
  const { organization } = useAuth()
  const [routes, setRoutes] = useState<TechRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<{ techId: string; fromIdx: number } | null>(null)
  const [dragOver, setDragOver] = useState<{ techId: string; toIdx: number } | null>(null)

  const fetchData = useCallback(async () => {
    if (!organization?.id) return
    const supabase = createSupabaseBrowserClient()
    const today = new Date().toISOString().split('T')[0]

    const [membersRes, appointmentsRes] = await Promise.all([
      supabase
        .from('team_members')
        .select('id, user_id, name')
        .eq('organization_id', organization.id),
      supabase
        .from('appointments')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('scheduled_date', today)
        .not('assigned_to', 'is', null)
        .not('status', 'in', '(cancelled,no_show)')
        .order('scheduled_time_start'),
    ])

    const members = (membersRes.data || []) as Pick<TeamMember, 'id' | 'user_id' | 'name'>[]
    const appointments = (appointmentsRes.data || []) as Appointment[]

    const techMap = new Map<string, TechRoute>()
    for (const member of members) {
      const jobs = appointments.filter(
        a => a.assigned_to === member.id || a.assigned_to === member.user_id
      )
      if (jobs.length > 0) {
        techMap.set(member.id, { techId: member.id, techName: member.name, jobs })
      }
    }

    setRoutes(Array.from(techMap.values()))
    setLoading(false)
  }, [organization?.id])

  useEffect(() => { fetchData() }, [fetchData])

  function handleDragStart(techId: string, fromIdx: number) {
    setDragging({ techId, fromIdx })
  }

  function handleDragOver(e: React.DragEvent, techId: string, toIdx: number) {
    e.preventDefault()
    setDragOver({ techId, toIdx })
  }

  function handleDrop(techId: string, toIdx: number) {
    if (!dragging || dragging.techId !== techId) return
    const { fromIdx } = dragging
    if (fromIdx === toIdx) return

    setRoutes(prev => prev.map(route => {
      if (route.techId !== techId) return route
      const newJobs = [...route.jobs]
      const [moved] = newJobs.splice(fromIdx, 1)
      newJobs.splice(toIdx, 0, moved)
      return { ...route, jobs: newJobs }
    }))
    setDragging(null)
    setDragOver(null)
  }

  function handleDragEnd() {
    setDragging(null)
    setDragOver(null)
  }

  return (
    <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-[#2DD4BF]" />
          <h2 className="text-lg font-semibold text-[#F8FAFC]">Route Optimizer</h2>
        </div>
        <span className="text-xs text-[#64748B]">Drag to reorder</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 border-[#2DD4BF] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : routes.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-[#64748B] text-sm">
          No routes for today
        </div>
      ) : (
        <div className="space-y-6">
          {routes.map((route) => (
            <div key={route.techId}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-[rgba(45,212,191,0.12)] flex items-center justify-center text-xs font-bold text-[#2DD4BF]">
                  {route.techName.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-[#F8FAFC]">{route.techName}</span>
                <span className="text-xs text-[#64748B]">· {route.jobs.length} stops</span>
              </div>

              {/* Timeline */}
              <div className="relative pl-4">
                {/* Vertical line */}
                <div className="absolute left-4 top-4 bottom-4 w-px bg-[rgba(148,163,184,0.1)]" />

                <div className="space-y-1">
                  {route.jobs.map((job, idx) => {
                    const color = STATUS_COLORS[job.status] || '#94A3B8'
                    const isDraggingThis = dragging?.techId === route.techId && dragging.fromIdx === idx
                    const isDragTarget = dragOver?.techId === route.techId && dragOver.toIdx === idx

                    return (
                      <div key={job.id}>
                        {/* Drive segment */}
                        {idx > 0 && (
                          <div className="flex items-center gap-2 py-1 pl-6">
                            <div className="flex items-center gap-1 text-xs text-[#64748B]">
                              <MapPin className="w-3 h-3" />
                              <span>~15 min drive</span>
                              <ChevronRight className="w-3 h-3" />
                            </div>
                          </div>
                        )}

                        {/* Job card */}
                        <div
                          draggable
                          onDragStart={() => handleDragStart(route.techId, idx)}
                          onDragOver={(e) => handleDragOver(e, route.techId, idx)}
                          onDrop={() => handleDrop(route.techId, idx)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-start gap-3 p-2.5 rounded-xl cursor-grab active:cursor-grabbing transition-all border ${
                            isDragTarget
                              ? 'border-[#2DD4BF] bg-[rgba(45,212,191,0.06)]'
                              : 'border-transparent bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)]'
                          } ${isDraggingThis ? 'opacity-40' : 'opacity-100'}`}
                        >
                          {/* Drag handle */}
                          <GripVertical className="w-4 h-4 text-[#475569] flex-shrink-0 mt-0.5" />

                          {/* Stop indicator */}
                          <div className="flex-shrink-0 mt-1">
                            <div
                              className="w-2.5 h-2.5 rounded-full border-2"
                              style={{ borderColor: color, backgroundColor: `${color}33` }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-medium text-[#F8FAFC] truncate">{job.service_type}</span>
                              <span
                                className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: `${color}22`, color }}
                              >
                                {job.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[#64748B]">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(job.scheduled_time_start)}
                              </span>
                              <span className="truncate">{job.address}</span>
                            </div>
                          </div>

                          {job.estimated_value && (
                            <span className="text-xs font-semibold text-[#2DD4BF] flex-shrink-0">
                              ${job.estimated_value.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
