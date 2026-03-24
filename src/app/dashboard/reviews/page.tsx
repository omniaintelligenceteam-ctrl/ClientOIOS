'use client'

import {
  Star,
  StarHalf,
  MessageSquare,
  TrendingUp,
  ThumbsUp,
  Edit3,
  SkipForward,
  CheckCircle2,
  Send,
  Globe,
  Facebook,
} from 'lucide-react'
import { demoReviews } from '@/lib/demo-data'
import type { ReviewPlatform, ReviewResponseStatus, Sentiment } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cardClass =
  'bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

// ---------------------------------------------------------------------------
// Star rendering
// ---------------------------------------------------------------------------

function StarRating({
  rating,
  size = 16,
  className = '',
}: {
  rating: number
  size?: number
  className?: string
}) {
  const stars: React.ReactNode[] = []
  const full = Math.floor(rating)
  const hasHalf = rating - full >= 0.25 && rating - full < 0.75
  const roundUp = rating - full >= 0.75

  for (let i = 0; i < full + (roundUp ? 1 : 0); i++) {
    stars.push(
      <Star
        key={`full-${i}`}
        size={size}
        className="fill-amber-400 text-amber-400"
      />
    )
  }

  if (hasHalf) {
    stars.push(
      <StarHalf
        key="half"
        size={size}
        className="fill-amber-400 text-amber-400"
      />
    )
  }

  const remaining = 5 - stars.length
  for (let i = 0; i < remaining; i++) {
    stars.push(
      <Star
        key={`empty-${i}`}
        size={size}
        className="text-slate-700"
      />
    )
  }

  return <div className={`flex items-center gap-0.5 ${className}`}>{stars}</div>
}

// ---------------------------------------------------------------------------
// Platform badge
// ---------------------------------------------------------------------------

const PLATFORM_CONFIG: Record<
  ReviewPlatform,
  { label: string; bg: string; text: string; icon: React.ElementType }
> = {
  google: {
    label: 'Google',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    icon: Globe,
  },
  yelp: {
    label: 'Yelp',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    icon: Star,
  },
  facebook: {
    label: 'Facebook',
    bg: 'bg-blue-600/15',
    text: 'text-blue-300',
    icon: Facebook,
  },
  homeadvisor: {
    label: 'HomeAdvisor',
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    icon: Globe,
  },
  angi: {
    label: 'Angi',
    bg: 'bg-green-500/15',
    text: 'text-green-400',
    icon: Globe,
  },
  bbb: {
    label: 'BBB',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    icon: Globe,
  },
  other: {
    label: 'Other',
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    icon: Globe,
  },
}

function PlatformBadge({ platform }: { platform: ReviewPlatform }) {
  const cfg = PLATFORM_CONFIG[platform]
  const Icon = cfg.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}
    >
      <Icon size={12} />
      {cfg.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Sentiment dot
// ---------------------------------------------------------------------------

function SentimentDot({ sentiment }: { sentiment: Sentiment }) {
  const colors: Record<string, string> = {
    positive: 'bg-green-400',
    neutral: 'bg-yellow-400',
    negative: 'bg-red-400',
    urgent: 'bg-red-400',
  }
  const labels: Record<string, string> = {
    positive: 'Positive',
    neutral: 'Neutral',
    negative: 'Negative',
    urgent: 'Urgent',
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-500">
      <span className={`h-2 w-2 rounded-full ${colors[sentiment]}`} />
      {labels[sentiment]}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Response status badge
// ---------------------------------------------------------------------------

function ResponseStatusBadge({ status }: { status: ReviewResponseStatus }) {
  const config: Record<
    ReviewResponseStatus,
    { label: string; cls: string; icon: React.ElementType }
  > = {
    pending: {
      label: 'Pending',
      cls: 'text-amber-400 bg-amber-500/15',
      icon: MessageSquare,
    },
    drafted: {
      label: 'AI Draft Ready',
      cls: 'text-teal-400 bg-teal-500/15',
      icon: Edit3,
    },
    approved: {
      label: 'Approved',
      cls: 'text-blue-400 bg-blue-500/15',
      icon: CheckCircle2,
    },
    posted: {
      label: 'Posted',
      cls: 'text-green-400 bg-green-500/15',
      icon: Send,
    },
    skipped: {
      label: 'Skipped',
      cls: 'text-slate-400 bg-slate-500/15',
      icon: SkipForward,
    },
  }
  const cfg = config[status]
  const Icon = cfg.icon
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cfg.cls}`}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Platform breakdown data
// ---------------------------------------------------------------------------

const platformBreakdown = [
  { platform: 'Google' as const, rating: 4.7, count: 89, icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  { platform: 'Yelp' as const, rating: 4.5, count: 23, icon: Star, color: 'text-red-400', bg: 'bg-red-500/15' },
  { platform: 'Facebook' as const, rating: 4.8, count: 45, icon: Facebook, color: 'text-blue-300', bg: 'bg-blue-600/15' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReviewsPage() {
  const overallRating = 4.4
  const totalReviews = 157
  const respondedCount = demoReviews.filter(
    (r) => r.response_status === 'posted' || r.response_status === 'approved'
  ).length
  const responseRate = Math.round((respondedCount / demoReviews.length) * 100)

  return (
    <div className="space-y-8">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Reputation Management
        </h1>
        <p className="mt-1 text-slate-400">
          Monitor reviews, manage responses, and grow your online reputation.
        </p>
      </div>

      {/* ── Overview Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Overall Rating */}
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Overall Rating</p>
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          </div>
          <div className="mt-3 flex items-end gap-3">
            <p className="text-5xl font-extrabold text-[#F8FAFC]">
              {overallRating}
            </p>
            <div className="mb-1.5">
              <StarRating rating={overallRating} size={20} />
              <p className="mt-1 text-xs text-slate-500">
                across all platforms
              </p>
            </div>
          </div>
        </div>

        {/* Total Reviews */}
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Total Reviews</p>
            <MessageSquare className="h-5 w-5 text-teal-400" />
          </div>
          <p className="mt-3 text-5xl font-extrabold text-[#F8FAFC]">
            {totalReviews}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            across all platforms
          </p>
        </div>

        {/* Response Rate */}
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Response Rate</p>
            <TrendingUp className="h-5 w-5 text-green-400" />
          </div>
          <p className="mt-3 text-5xl font-extrabold text-[#F8FAFC]">
            {responseRate}%
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {respondedCount} of {demoReviews.length} reviews responded
          </p>
        </div>
      </div>

      {/* ── Platform Breakdown ───────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-[#F8FAFC]">
          Platform Breakdown
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {platformBreakdown.map((p) => {
            const Icon = p.icon
            return (
              <div
                key={p.platform}
                className="flex items-center gap-4 rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] px-5 py-4"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${p.bg}`}
                >
                  <Icon size={20} className={p.color} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#F8FAFC]">
                    {p.platform}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <StarRating rating={p.rating} size={12} />
                    <span className="text-xs text-slate-400">
                      {p.rating}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[#F8FAFC]">
                    {p.count}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    reviews
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Review Feed ──────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-[#F8FAFC]">
          Recent Reviews
        </h2>
        <div className="space-y-4">
          {demoReviews.map((review) => {
            const showActions =
              review.response_status === 'pending' ||
              review.response_status === 'drafted'

            return (
              <div
                key={review.id}
                className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-5"
              >
                {/* Top row: platform + sentiment + date */}
                <div className="flex flex-wrap items-center gap-3">
                  <PlatformBadge platform={review.platform} />
                  <SentimentDot sentiment={review.sentiment} />
                  <span className="ml-auto text-xs text-slate-600">
                    {relativeTime(review.review_date)}
                  </span>
                </div>

                {/* Star rating + reviewer */}
                <div className="mt-3 flex items-center gap-3">
                  <StarRating rating={review.rating} size={16} />
                  <span className="text-sm font-semibold text-[#F8FAFC]">
                    {review.reviewer_name}
                  </span>
                </div>

                {/* Review text */}
                {review.review_text && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {review.review_text}
                  </p>
                )}

                {/* AI-drafted response */}
                {review.response_text && (
                  <div className="mt-4 rounded-xl border border-[rgba(148,163,184,0.08)] bg-[rgba(148,163,184,0.04)] p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">
                        AI-Drafted Response
                      </span>
                      <ResponseStatusBadge status={review.response_status} />
                    </div>
                    <p className="text-sm leading-relaxed text-slate-400">
                      {review.response_text}
                    </p>
                  </div>
                )}

                {/* Pending without response */}
                {!review.response_text &&
                  review.response_status === 'pending' && (
                    <div className="mt-4 rounded-xl border border-dashed border-[rgba(148,163,184,0.15)] bg-[rgba(148,163,184,0.02)] p-4">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-amber-400" />
                        <span className="text-xs text-amber-400">
                          AI is drafting a response...
                        </span>
                      </div>
                    </div>
                  )}

                {/* Action buttons */}
                {showActions && (
                  <div className="mt-4 flex items-center gap-2">
                    <button className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/15 px-3.5 py-1.5 text-xs font-semibold text-green-400 transition-colors hover:bg-green-500/25">
                      <ThumbsUp size={13} />
                      Approve
                    </button>
                    <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#2DD4BF]/15 px-3.5 py-1.5 text-xs font-semibold text-[#2DD4BF] transition-colors hover:bg-[#2DD4BF]/25">
                      <Edit3 size={13} />
                      Edit
                    </button>
                    <button className="inline-flex items-center gap-1.5 rounded-lg bg-slate-500/15 px-3.5 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-500/25">
                      <SkipForward size={13} />
                      Skip
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
