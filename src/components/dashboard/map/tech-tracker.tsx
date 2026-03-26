'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import type { TeamMember, Appointment } from '@/lib/types'
import { Users, MapPin, Clock, CheckCircle, Circle, Loader } from 'lucide-react'

type TechStatus = 'available' | 'on_job' | 'in_transit' | 'off'

interface TechWithStatus {
  member: TeamMember
  techStatus: TechStatus
  currentJob: Appointment | null
  nextJob: Appointment | null
}

const STATUS_CONFIG: Record<TechStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  available: { label: 'Available', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: CheckCircle },
  on_job: { label: 'On Job', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: Loader },
  in_transit: { label: 'In Transit', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', icon: MapPin },
  off: { label: 'Off', color: '#64748B', bg: 'rgba(100,116,139,0.12)', icon: Circle },
}

function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

export function TechTracker() {
  const { organization } = useAuth()
  const [techs, setTechs] = useState<TechWithStatus[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!organization?.id) return
    const supabase = createSupabaseBrowserClient()
    const today = new Date().toISOString().split('T')[0]
    const nowTime = new Date().toTimeString().slice(0, 5)

    const [membersRes, appointmentsRes] = await Promise.all([
      supabase
        .from('team_members')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name'),
      supabase
        .from('appointments')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('scheduled_date', today)
        .not('assigned_to', 'is', null)
        .order('scheduled_time_start'),
    ])

    if (membersRes.error || !membersRes.data) {
      setLoading(false)
      return
    }

    const members = membersRes.data as TeamMember[]
    const appointments = (appointmentsRes.data || []) as Appointment[]

    const result: TechWithStatus[] = members.map((member) => {
      const myJobs = appointments.filter(a => a.assigned_to === member.id || a.assigned_to === member.user_id)
      const currentJob = myJobs.find(a =>
        a.status === 'in_progress' ||
        (a.scheduled_time_start <= nowTime && a.scheduled_time_end >= nowTime && a.status !== 'completed' && a.status !== 'cancelled')
      ) || null
      const nextJob = myJobs.find(a =>
        a.scheduled_time_start > nowTime && a.status === 'scheduled'
      ) || null

      let techStatus: TechStatus = 'available'
      if (currentJob?.status === 'in_progress') techStatus = 'on_job'
      else if (currentJob) techStatus = 'on_job'
      else if (nextJob && nextJob.scheduled_time_start <= addMinutes(nowTime, 30)) techStatus = 'in_transit'

      return { member, techStatus, currentJob: currentJob || null, nextJob: nextJob || null }
    })

    setTechs(result)
    setLoading(false)
  }, [organization?.id])

  useEffect(() => {
    fetchData()
    const supabase = createSupabaseBrowserClient()
    if (!organization?.id) return
    const channel = supabase
      .channel('tech-tracker')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `organization_id=eq.${organization.id}`,
      }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData, organization?.id])

  return (
    <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#2DD4BF]" />
          <h2 className="text-lg font-semibold text-[#F8FAFC]">Tech Tracker</h2>
        </div>
        <div className="flex items-center gap-3">
          {(['available', 'on_job', 'in_transit', 'off'] as TechStatus[]).map(s => {
            const count = techs.filter(t => t.techStatus === s).length
            if (count === 0) return null
            return (
              <span key={s} className="text-xs text-[#64748B]">
                <span style={{ color: STATUS_CONFIG[s].color }}>{count}</span> {STATUS_CONFIG[s].label}
              </span>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 border-[#2DD4BF] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : techs.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-[#64748B] text-sm">
          No team members found
        </div>
      ) : (
        <div className="space-y-2">
          {techs.map(({ member, techStatus, currentJob, nextJob }) => {
            const cfg = STATUS_CONFIG[techStatus]
            const Icon = cfg.icon
            return (
              <div
                key={member.id}
                className="flex items-start gap-3 p-3 rounded-xl transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm"
                  style={{ backgroundColor: cfg.bg, color: cfg.color }}
                >
                  {member.name.slice(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-[#F8FAFC] text-sm">{member.name}</span>
                    <span
                      className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      <Icon className="w-2.5 h-2.5" />
                      {cfg.label}
                    </span>
                  </div>

                  {currentJob && (
                    <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mb-0.5">
                      <Clock className="w-3 h-3 text-[#F59E0B]" />
                      <span className="text-[#F59E0B] font-medium">Now:</span>
                      <span className="truncate">{currentJob.service_type}</span>
                      <span className="text-[#64748B]">· {formatTime(currentJob.scheduled_time_start)}</span>
                    </div>
                  )}

                  {nextJob && (
                    <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                      <Clock className="w-3 h-3" />
                      <span>Next:</span>
                      <span className="truncate text-[#94A3B8]">{nextJob.service_type}</span>
                      <span>· {formatTime(nextJob.scheduled_time_start)}</span>
                    </div>
                  )}

                  {!currentJob && !nextJob && techStatus !== 'off' && (
                    <span className="text-xs text-[#64748B]">No jobs scheduled</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function addMinutes(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + minutes
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${nh.toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`
}
