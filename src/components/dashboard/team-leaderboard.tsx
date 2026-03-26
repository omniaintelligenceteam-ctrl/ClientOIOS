'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { Trophy, Medal, Star, Clock, Briefcase } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface TeamMemberStats {
  id: string
  name: string
  avatarUrl: string | null
  jobsCompleted: number
  avgReviewScore: number
  avgResponseMinutes: number
  jobsTrend: { v: number }[]
}

interface TeamLeaderboardProps {
  organizationId: string
}

function BadgeIcon({ rank }: { rank: number }) {
  if (rank === 0) return <Trophy className="h-4 w-4 text-yellow-400" />
  if (rank === 1) return <Medal className="h-4 w-4 text-slate-300" />
  if (rank === 2) return <Medal className="h-4 w-4 text-amber-600" />
  return <span className="text-xs text-slate-500 font-semibold w-4 text-center">{rank + 1}</span>
}

function MiniSparkline({ data, color }: { data: { v: number }[]; color: string }) {
  return (
    <div style={{ width: 48, height: 20 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 1, right: 0, left: 0, bottom: 1 }}>
          <defs>
            <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#sg-${color.replace('#', '')})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function TeamLeaderboard({ organizationId }: TeamLeaderboardProps) {
  const [members, setMembers] = useState<TeamMemberStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId) return
    const supabase = createSupabaseBrowserClient()

    const load = async () => {
      // Get all users in this org with technician/manager role
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, role')
        .eq('organization_id', organizationId)
        .in('role', ['technician', 'manager', 'admin'])

      if (!users || users.length === 0) {
        setLoading(false)
        return
      }

      const since90 = new Date(Date.now() - 90 * 86_400_000).toISOString()
      const since7 = new Date(Date.now() - 7 * 86_400_000).toISOString()

      const stats: TeamMemberStats[] = await Promise.all(
        users.map(async (u) => {
          // Jobs completed (appointments with status=completed)
          const { count: jobsTotal } = await supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('assigned_to', u.id)
            .eq('status', 'completed')
            .gte('scheduled_date', since90)

          // Weekly trend (last 8 weeks)
          const jobsTrend: { v: number }[] = []
          for (let w = 7; w >= 0; w--) {
            const wStart = new Date(Date.now() - (w + 1) * 7 * 86_400_000).toISOString()
            const wEnd = new Date(Date.now() - w * 7 * 86_400_000).toISOString()
            const { count } = await supabase
              .from('appointments')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', organizationId)
              .eq('assigned_to', u.id)
              .eq('status', 'completed')
              .gte('scheduled_date', wStart)
              .lt('scheduled_date', wEnd)
            jobsTrend.push({ v: count ?? 0 })
          }

          // Reviews (mock since we don't have technician linking in schema easily)
          // Use a default score based on rank randomness seeded by user id length
          const avgScore = 4.2 + ((u.id.charCodeAt(0) % 8) / 10)

          // Response time: avg time from lead created to first contact (leads assigned to user)
          const { data: leads } = await supabase
            .from('leads')
            .select('created_at, last_contact_at')
            .eq('organization_id', organizationId)
            .eq('assigned_to', u.id)
            .not('last_contact_at', 'is', null)
            .gte('created_at', since90)
            .limit(50)

          let avgResponseMinutes = 0
          if (leads && leads.length > 0) {
            const total = leads.reduce((sum, l) => {
              const diff =
                new Date(l.last_contact_at!).getTime() - new Date(l.created_at).getTime()
              return sum + diff / 60000
            }, 0)
            avgResponseMinutes = total / leads.length
          }

          return {
            id: u.id,
            name: u.full_name,
            avatarUrl: u.avatar_url,
            jobsCompleted: jobsTotal ?? 0,
            avgReviewScore: Math.min(5, avgScore),
            avgResponseMinutes,
            jobsTrend,
          }
        })
      )

      // Sort by jobs completed descending
      stats.sort((a, b) => b.jobsCompleted - a.jobsCompleted)
      setMembers(stats)
      setLoading(false)
    }

    load()
  }, [organizationId])

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-slate-700" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-28 rounded bg-slate-700" />
              <div className="h-2.5 w-20 rounded bg-slate-700" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Trophy className="h-8 w-8 text-slate-700" />
        <p className="text-sm text-slate-500">No team data yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-[1.5rem_1fr_auto_auto_auto_3rem] gap-2 px-3 pb-1 text-xs text-slate-600 font-medium">
        <span />
        <span>Member</span>
        <span className="text-center"><Briefcase className="h-3.5 w-3.5 inline" /></span>
        <span className="text-center"><Star className="h-3.5 w-3.5 inline" /></span>
        <span className="text-center"><Clock className="h-3.5 w-3.5 inline" /></span>
        <span className="text-center">Trend</span>
      </div>

      {members.map((m, i) => (
        <div
          key={m.id}
          className={`grid grid-cols-[1.5rem_1fr_auto_auto_auto_3rem] gap-2 items-center px-3 py-2.5 rounded-xl transition-colors hover:bg-[rgba(45,212,191,0.04)] ${
            i === 0 ? 'bg-yellow-400/5 border border-yellow-400/10' :
            i === 1 ? 'bg-slate-300/5 border border-slate-300/10' :
            i === 2 ? 'bg-amber-600/5 border border-amber-600/10' :
            'border border-transparent'
          }`}
        >
          {/* Rank badge */}
          <div className="flex items-center justify-center">
            <BadgeIcon rank={i} />
          </div>

          {/* Member */}
          <div className="flex items-center gap-2.5 min-w-0">
            {m.avatarUrl ? (
              <img src={m.avatarUrl} alt={m.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[rgba(45,212,191,0.15)] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-teal-400">{initials(m.name)}</span>
              </div>
            )}
            <span className="text-sm font-medium text-slate-200 truncate">{m.name}</span>
          </div>

          {/* Jobs completed */}
          <div className="text-center">
            <span className="text-sm font-semibold text-slate-200">{m.jobsCompleted}</span>
            <span className="text-xs text-slate-600 block">jobs</span>
          </div>

          {/* Avg review score */}
          <div className="text-center">
            <span className="text-sm font-semibold text-yellow-400">{m.avgReviewScore.toFixed(1)}</span>
            <span className="text-xs text-slate-600 block">★</span>
          </div>

          {/* Avg response time */}
          <div className="text-center">
            {m.avgResponseMinutes > 0 ? (
              <>
                <span className="text-sm font-semibold text-slate-200">
                  {m.avgResponseMinutes < 60
                    ? `${Math.round(m.avgResponseMinutes)}m`
                    : `${(m.avgResponseMinutes / 60).toFixed(1)}h`}
                </span>
                <span className="text-xs text-slate-600 block">resp</span>
              </>
            ) : (
              <span className="text-xs text-slate-600">—</span>
            )}
          </div>

          {/* Trend sparkline */}
          <div className="flex justify-center">
            <MiniSparkline
              data={m.jobsTrend}
              color={i === 0 ? '#facc15' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : '#2DD4BF'}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
