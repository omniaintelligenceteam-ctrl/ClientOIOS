'use client'

import { useState, useEffect, useMemo } from 'react'
import { Star, MessageSquare, TrendingUp, Globe } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Review, ReviewPlatform } from '@/lib/types'

interface Props {
  organizationId: string
}

const cardClass =
  'backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5'

const PLATFORM_COLORS: Record<ReviewPlatform, string> = {
  google: '#60a5fa',
  yelp: '#f87171',
  facebook: '#3b82f6',
  homeadvisor: '#fb923c',
  angi: '#4ade80',
  bbb: '#60a5fa',
  other: '#94a3b8',
}

export function ReviewStats({ organizationId }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (!organizationId) return
    const fetchReviews = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('organization_id', organizationId)
        .order('review_date', { ascending: false })
      if (data) setReviews(data as unknown as Review[])
      setLoading(false)
    }
    fetchReviews()
  }, [organizationId])

  const stats = useMemo(() => {
    if (reviews.length === 0)
      return {
        avgRating: 0,
        total: 0,
        thisMonth: 0,
        responseRate: 0,
        breakdown: [0, 0, 0, 0, 0],
        platformCounts: {} as Record<string, number>,
        last30Days: 0,
      }

    const avgRating =
      Math.round(
        (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10
      ) / 10

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonth = reviews.filter(
      (r) => new Date(r.review_date) >= thisMonthStart
    ).length

    const responded = reviews.filter(
      (r) =>
        r.response_status === 'posted' ||
        r.response_status === 'approved' ||
        r.response_status === 'drafted'
    ).length
    const responseRate = Math.round((responded / reviews.length) * 100)

    const breakdown = [0, 0, 0, 0, 0]
    reviews.forEach((r) => {
      const idx = Math.min(Math.max(r.rating - 1, 0), 4)
      breakdown[idx]++
    })

    const platformCounts: Record<string, number> = {}
    reviews.forEach((r) => {
      platformCounts[r.platform] = (platformCounts[r.platform] || 0) + 1
    })

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const last30Days = reviews.filter(
      (r) => new Date(r.review_date) >= thirtyDaysAgo
    ).length

    return { avgRating, total: reviews.length, thisMonth, responseRate, breakdown, platformCounts, last30Days }
  }, [reviews])

  const platformEntries = Object.entries(stats.platformCounts).sort(
    (a, b) => b[1] - a[1]
  )
  const maxPlatformCount = Math.max(...platformEntries.map(([, v]) => v), 1)

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`${cardClass} animate-pulse`}>
            <div className="h-4 w-20 rounded bg-slate-700 mb-3" />
            <div className="h-10 w-16 rounded bg-slate-700" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Average rating */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Avg Rating</p>
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          </div>
          <p className="text-4xl font-extrabold text-[#F8FAFC]">{stats.avgRating}</p>
          <div className="mt-1.5 flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={12}
                className={
                  s <= Math.round(stats.avgRating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-700'
                }
              />
            ))}
          </div>
        </div>

        {/* Total reviews */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Reviews</p>
            <MessageSquare className="h-4 w-4 text-teal-400" />
          </div>
          <p className="text-4xl font-extrabold text-[#F8FAFC]">{stats.total}</p>
          <p className="mt-1.5 text-xs text-slate-500">{stats.last30Days} in last 30 days</p>
        </div>

        {/* This month */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">This Month</p>
            <TrendingUp className="h-4 w-4 text-[#f97316]" />
          </div>
          <p className="text-4xl font-extrabold text-[#F8FAFC]">{stats.thisMonth}</p>
          <p className="mt-1.5 text-xs text-slate-500">new reviews</p>
        </div>

        {/* Response rate */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Response Rate</p>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </div>
          <p className="text-4xl font-extrabold text-[#F8FAFC]">{stats.responseRate}%</p>
          <p className="mt-1.5 text-xs text-slate-500">
            {stats.total > 0 ? Math.round((stats.responseRate / 100) * stats.total) : 0} of {stats.total} responded
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Rating breakdown */}
        <div className={cardClass}>
          <p className="mb-4 text-sm font-semibold text-[#F8FAFC]">Rating Breakdown</p>
          <div className="space-y-2.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = stats.breakdown[stars - 1]
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
              return (
                <div key={stars} className="flex items-center gap-3">
                  <span className="flex items-center gap-1 w-10 text-xs text-slate-400 font-medium">
                    {stars}
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-[rgba(148,163,184,0.08)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-slate-500">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Platform distribution */}
        <div className={cardClass}>
          <p className="mb-4 text-sm font-semibold text-[#F8FAFC]">Platform Distribution</p>
          <div className="space-y-3">
            {platformEntries.map(([platform, count]) => {
              const pct = (count / maxPlatformCount) * 100
              const color = PLATFORM_COLORS[platform as ReviewPlatform] || '#94a3b8'
              return (
                <div key={platform} className="flex items-center gap-3">
                  <Globe size={13} style={{ color }} className="flex-shrink-0" />
                  <span className="w-24 truncate text-xs capitalize text-slate-400">{platform}</span>
                  <div className="flex-1 h-2 rounded-full bg-[rgba(148,163,184,0.08)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs text-slate-500">{count}</span>
                </div>
              )
            })}
            {platformEntries.length === 0 && (
              <p className="text-xs text-slate-600">No platform data yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
