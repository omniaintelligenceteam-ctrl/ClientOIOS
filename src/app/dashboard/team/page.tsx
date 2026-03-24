'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  HardHat,
  Phone,
  Mail,
  Star,
  Briefcase,
  MapPin,
  Clock,
  CheckCircle2,
  Truck,
} from 'lucide-react'
import type { TeamMember } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cardClass = 'bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6'

/** Extract initials from a full name. */
function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Role -> avatar ring color. */
function roleColor(role: string): string {
  if (role.toLowerCase().includes('owner')) return '#2DD4BF'
  if (role.toLowerCase().includes('lead')) return '#60a5fa'
  return '#f97316'
}

/** Render stars (filled / half / empty) for a rating out of 5. */
function StarRating({ score }: { score: number }) {
  const full = Math.floor(score)
  const hasHalf = score - full >= 0.3
  const empty = 5 - full - (hasHalf ? 1 : 0)

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f-${i}`} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      ))}
      {hasHalf && (
        <div className="relative h-3.5 w-3.5">
          <Star className="absolute h-3.5 w-3.5 text-slate-600" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          </div>
        </div>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e-${i}`} className="h-3.5 w-3.5 text-slate-600" />
      ))}
      <span className="ml-1.5 text-xs text-slate-400">{score.toFixed(1)}</span>
    </div>
  )
}

/** Circular score badge (simulated with ring). */
function ScoreBadge({ score }: { score: number }) {
  // score is out of 10 — convert to percentage
  const pct = (score / 10) * 100
  const circumference = 2 * Math.PI * 18 // r=18
  const offset = circumference - (pct / 100) * circumference

  let color = '#2DD4BF'
  if (score < 8) color = '#f97316'
  if (score < 6) color = '#ef4444'

  return (
    <div className="relative flex items-center justify-center h-14 w-14 flex-shrink-0">
      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="rgba(148,163,184,0.1)"
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>
        {score.toFixed(1)}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setTeamMembers(data as unknown as TeamMember[])
    }
    fetchData()
  }, [])

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <HardHat className="h-8 w-8 text-[#2DD4BF]" />
          Team Management
        </h1>
        <p className="text-slate-400 mt-1">
          {teamMembers.length} members
        </p>
      </div>

      {/* ── Team Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {teamMembers.map((member) => {
          const color = roleColor(member.role)
          const memberInitials = initials(member.name)

          return (
            <div key={member.id} className={`${cardClass} flex flex-col`}>
              {/* Top section — avatar, name, status */}
              <div className="flex items-start gap-4 mb-5">
                {/* Avatar */}
                <div
                  className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold"
                  style={{
                    backgroundColor: `${color}20`,
                    color,
                    border: `2px solid ${color}`,
                  }}
                >
                  {memberInitials}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-100 truncate">
                      {member.name}
                    </h3>
                    {member.is_on_call && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full flex-shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                        On Call
                      </span>
                    )}
                    {!member.is_on_call && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full flex-shrink-0">
                        Available
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">{member.role}</p>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Phone className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                  {member.phone}
                </div>
                {member.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Mail className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                )}
              </div>

              {/* Skills */}
              {member.skills && member.skills.length > 0 && (
                <div className="mb-5">
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-2">
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {member.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[rgba(148,163,184,0.08)] text-slate-300 border border-[rgba(148,163,184,0.1)]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance section */}
              <div className="mt-auto pt-5 border-t border-[rgba(148,163,184,0.08)]">
                <div className="flex items-center gap-4">
                  {/* Score circle */}
                  {member.performance_score !== null && (
                    <ScoreBadge score={member.performance_score} />
                  )}

                  <div className="flex-1 space-y-2">
                    {/* Jobs completed */}
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                      <span className="text-slate-400">Jobs:</span>
                      <span className="font-semibold text-slate-200">
                        {member.total_jobs_completed.toLocaleString()}
                      </span>
                    </div>

                    {/* Review score */}
                    {member.average_review_score !== null && (
                      <div className="flex items-center gap-2">
                        <StarRating score={member.average_review_score} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Dispatch Summary ────────────────────────────────────────── */}
      <div className={cardClass}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Truck className="h-5 w-5 text-[#2DD4BF]" />
          Dispatch Summary
        </h2>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 rounded-lg bg-[rgba(148,163,184,0.06)] p-2">
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div>
            <p className="text-sm text-slate-200 font-medium">Today&apos;s Assignments</p>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
                <span className="text-slate-300">
                  <span className="font-medium text-amber-400">Jake</span> &mdash; Emergency service at Gilbert Grill (Commercial Drain Cleaning)
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="text-slate-300">
                  <span className="font-medium text-blue-400">Carlos</span> &mdash; At office, available for dispatch
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-[#2DD4BF] flex-shrink-0" />
                <span className="text-slate-300">
                  <span className="font-medium text-[#2DD4BF]">Mike</span> &mdash; On call, handling estimates and callbacks
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
