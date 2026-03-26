'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
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
  ExternalLink,
} from 'lucide-react'
import { EmptyState } from '@/components/dashboard/empty-state'
import { ReviewResponseDraft } from '@/components/dashboard/reviews/review-response-draft'
import { ReviewStats } from '@/components/dashboard/reviews/review-stats'
import type { Review, ReviewPlatform, ReviewResponseStatus, Sentiment } from '@/lib/types'

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
}: {
  rating: number
  size?: number
}) {
  const stars: React.ReactNode[] = []
  const full = Math.floor(rating)
  const hasHalf = rating - full >= 0.25 && rating - full < 0.75
  const roundUp = rating - full >= 0.75

  for (let i = 0; i < full + (roundUp ? 1 : 0); i++) {
    stars.push(
      <Star key={`full-${i}`} size={size} className="fill-amber-400 text-amber-400" />
    )
  }
  if (hasHalf) {
    stars.push(
      <StarHalf key="half" size={size} className="fill-amber-400 text-amber-400" />
    )
  }
  const remaining = 5 - stars.length
  for (let i = 0; i < remaining; i++) {
    stars.push(
      <Star key={`empty-${i}`} size={size} className="text-slate-700" />
    )
  }
  return <div className="flex items-center gap-0.5">{stars}</div>
}

// ---------------------------------------------------------------------------
// Platform config
// ---------------------------------------------------------------------------

const PLATFORM_CONFIG: Record<
  ReviewPlatform,
  { label: string; bg: string; text: string; icon: React.ElementType }
> = {
  google: { label: 'Google', bg: 'bg-blue-500/15', text: 'text-blue-400', icon: Globe },
  yelp: { label: 'Yelp', bg: 'bg-red-500/15', text: 'text-red-400', icon: Star },
  facebook: { label: 'Facebook', bg: 'bg-blue-600/15', text: 'text-blue-300', icon: Facebook },
  homeadvisor: { label: 'HomeAdvisor', bg: 'bg-orange-500/15', text: 'text-orange-400', icon: Globe },
  angi: { label: 'Angi', bg: 'bg-green-500/15', text: 'text-green-400', icon: Globe },
  bbb: { label: 'BBB', bg: 'bg-blue-500/15', text: 'text-blue-400', icon: Globe },
  other: { label: 'Other', bg: 'bg-slate-500/15', text: 'text-slate-400', icon: Globe },
}

function PlatformBadge({ platform }: { platform: ReviewPlatform }) {
  const cfg = PLATFORM_CONFIG[platform]
  const Icon = cfg.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}
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
    urgent: 'bg-red-500',
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
  const config: Record<ReviewResponseStatus, { label: string; cls: string; icon: React.ElementType }> = {
    pending: { label: 'Pending', cls: 'text-amber-400 bg-amber-500/15', icon: MessageSquare },
    drafted: { label: 'Draft Ready', cls: 'text-teal-400 bg-teal-500/15', icon: Edit3 },
    approved: { label: 'Approved', cls: 'text-blue-400 bg-blue-500/15', icon: CheckCircle2 },
    posted: { label: 'Posted', cls: 'text-green-400 bg-green-500/15', icon: Send },
    skipped: { label: 'Skipped', cls: 'text-slate-400 bg-slate-500/15', icon: SkipForward },
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
// Platform filter tabs
// ---------------------------------------------------------------------------

type PlatformFilter = 'all' | ReviewPlatform

const PLATFORM_TABS: { value: PlatformFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'google', label: 'Google' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'yelp', label: 'Yelp' },
  { value: 'homeadvisor', label: 'HomeAdvisor' },
  { value: 'angi', label: 'Angi' },
  { value: 'bbb', label: 'BBB' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReviewsPage() {
  const { profile, organization } = useAuth()
  const orgId = organization?.id || profile?.organization_id || ''
  const [reviews, setReviews] = useState<Review[]>([])
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [pendingAction, setPendingAction] = useState<{ id: string; action: 'approve' | 'skip' } | null>(null)
  const supabase = createSupabaseBrowserClient()

  const loadReviews = useCallback(async () => {
    if (!orgId) return
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('organization_id', orgId)
      .order('review_date', { ascending: false })
    if (data) setReviews(data as unknown as Review[])
  }, [orgId])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  // Computed stats
  const overallRating = useMemo(() => {
    if (reviews.length === 0) return 0
    return Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
  }, [reviews])

  const respondedCount = useMemo(
    () => reviews.filter((r) => r.response_status === 'posted' || r.response_status === 'approved').length,
    [reviews]
  )
  const responseRate = reviews.length > 0 ? Math.round((respondedCount / reviews.length) * 100) : 0

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthCount = reviews.filter((r) => new Date(r.review_date) >= thisMonthStart).length

  // Reviews needing response
  const needsResponse = useMemo(
    () => reviews.filter((r) => r.response_status === 'pending' || r.response_status === 'drafted'),
    [reviews]
  )

  // Filtered reviews
  const filtered = useMemo(() => {
    if (platformFilter === 'all') return reviews
    return reviews.filter((r) => r.platform === platformFilter)
  }, [reviews, platformFilter])

  // Quick approve / skip
  async function quickAction(review: Review, action: 'approve' | 'skip') {
    setPendingAction({ id: review.id, action })
    if (action === 'approve') {
      await supabase
        .from('reviews')
        .update({ response_status: 'approved', responded_at: new Date().toISOString() })
        .eq('id', review.id)
    } else {
      await supabase
        .from('reviews')
        .update({ response_status: 'skipped' })
        .eq('id', review.id)
    }
    setPendingAction(null)
    loadReviews()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reputation Management</h1>
        <p className="mt-1 text-slate-400">
          Monitor reviews, manage responses, and grow your online reputation.
        </p>
      </div>

      {/* Stats from ReviewStats component */}
      {orgId && <ReviewStats organizationId={orgId} />}

      {/* Layout: feed + response panel */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left: Review feed */}
        <div className="xl:col-span-2 space-y-5">
          {/* Platform filter tabs */}
          <div className="flex flex-wrap gap-2">
            {PLATFORM_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setPlatformFilter(tab.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  platformFilter === tab.value
                    ? 'bg-[#2DD4BF] text-[#0B1120]'
                    : 'bg-[rgba(148,163,184,0.08)] text-slate-400 hover:bg-[rgba(148,163,184,0.12)] hover:text-slate-200'
                }`}
              >
                {tab.label}
                {tab.value !== 'all' && (
                  <span className="ml-1.5 text-[10px] opacity-70">
                    ({reviews.filter((r) => r.platform === tab.value).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Review list */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={Star}
              title="No reviews yet"
              description="Reviews will appear here as customers leave feedback. Connect your Google Business Profile for automatic tracking."
            />
          ) : (
            <div className="space-y-4">
              {filtered.map((review) => {
                const showActions = review.response_status === 'pending' || review.response_status === 'drafted'
                const isPending = pendingAction?.id === review.id

                return (
                  <div
                    key={review.id}
                    className={`rounded-2xl border bg-[#111827] p-5 transition-all ${
                      selectedReview?.id === review.id
                        ? 'border-[#2DD4BF]/40'
                        : 'border-[rgba(148,163,184,0.1)]'
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex flex-wrap items-center gap-3">
                      <PlatformBadge platform={review.platform} />
                      <SentimentDot sentiment={review.sentiment} />
                      {/* Source link */}
                      {review.review_url && (
                        <a
                          href={review.review_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-[#2DD4BF]"
                        >
                          <ExternalLink size={11} />
                          View Original
                        </a>
                      )}
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
                      <ResponseStatusBadge status={review.response_status} />
                    </div>

                    {/* Review text */}
                    {review.review_text && (
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        {review.review_text}
                      </p>
                    )}

                    {/* Posted response */}
                    {review.response_text && review.response_status === 'posted' && (
                      <div className="mt-4 rounded-xl border border-[rgba(148,163,184,0.08)] bg-[rgba(148,163,184,0.04)] p-4">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Your Response
                        </p>
                        <p className="text-sm leading-relaxed text-slate-400">
                          {review.response_text}
                        </p>
                      </div>
                    )}

                    {/* Action buttons */}
                    {showActions && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setSelectedReview(selectedReview?.id === review.id ? null : review)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2DD4BF]/15 px-3.5 py-1.5 text-xs font-semibold text-[#2DD4BF] transition-colors hover:bg-[#2DD4BF]/25"
                        >
                          <Edit3 size={13} />
                          {selectedReview?.id === review.id ? 'Close Draft' : 'Draft Response'}
                        </button>
                        {review.response_text && (
                          <button
                            onClick={() => quickAction(review, 'approve')}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/15 px-3.5 py-1.5 text-xs font-semibold text-green-400 transition-colors hover:bg-green-500/25 disabled:opacity-50"
                          >
                            <ThumbsUp size={13} />
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => quickAction(review, 'skip')}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-500/15 px-3.5 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-500/25 disabled:opacity-50"
                        >
                          <SkipForward size={13} />
                          Skip
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Response panel */}
        <div className="space-y-4">
          <div className="sticky top-4 space-y-4">
            {/* Panel header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#F8FAFC]">Needs Response</h2>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-400">
                {needsResponse.length}
              </span>
            </div>

            {/* Inline draft if review selected */}
            {selectedReview && (
              <ReviewResponseDraft
                review={selectedReview}
                onPosted={() => {
                  setSelectedReview(null)
                  loadReviews()
                }}
              />
            )}

            {/* Queue list */}
            {needsResponse.length === 0 && !selectedReview ? (
              <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] px-5 py-8 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-green-400" />
                <p className="text-sm font-semibold text-[#F8FAFC]">All caught up!</p>
                <p className="mt-1 text-xs text-slate-500">No reviews need a response right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {needsResponse
                  .filter((r) => r.id !== selectedReview?.id)
                  .slice(0, 5)
                  .map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedReview(r)}
                      className="w-full rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#111827] p-3.5 text-left transition-all hover:border-[#2DD4BF]/30 hover:bg-[#2DD4BF]/5"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <StarRating rating={r.rating} size={12} />
                        <ResponseStatusBadge status={r.response_status} />
                      </div>
                      <p className="text-xs font-semibold text-[#F8FAFC]">{r.reviewer_name}</p>
                      {r.review_text && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                          {r.review_text}
                        </p>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
