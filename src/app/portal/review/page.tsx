'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Star, ExternalLink, CheckCircle } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

function ReviewContent() {
  const searchParams = useSearchParams()
  const jobId = searchParams.get('job')
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // These would ideally come from org settings fetched by jobId
  const googleReviewUrl = searchParams.get('google') || null
  const yelpReviewUrl = searchParams.get('yelp') || null

  async function handleSubmit() {
    if (!rating) return
    setSubmitting(true)

    const supabase = createSupabaseBrowserClient()
    if (supabase && jobId) {
      try {
        // Fetch appointment to get org + customer
        const { data: appt } = await supabase
          .from('appointments')
          .select('organization_id, customer_id')
          .eq('id', jobId)
          .single()

        if (appt) {
          await supabase.from('reviews').insert({
            organization_id: appt.organization_id,
            customer_id: appt.customer_id,
            platform: 'other',
            rating,
            review_text: comment || null,
            reviewer_name: 'Portal Review',
            response_status: 'pending',
            sentiment: rating >= 4 ? 'positive' : rating >= 3 ? 'neutral' : 'negative',
            review_date: new Date().toISOString(),
            request_sent: false,
          })
        }
      } catch {
        // Non-fatal — still show success
      }
    }

    setSubmitting(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div
        className="rounded-2xl p-10 text-center space-y-4"
        style={{ background: '#111827', border: '1px solid rgba(148,163,184,0.1)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{
            background: 'rgba(34,197,94,0.15)',
            animation: 'pop 0.4s cubic-bezier(0.175,0.885,0.32,1.275)',
          }}
        >
          <CheckCircle size={32} style={{ color: '#22c55e' }} />
        </div>
        <h2 className="text-xl font-bold" style={{ color: '#F8FAFC' }}>
          Thank you!
        </h2>
        <p className="text-sm" style={{ color: '#94A3B8' }}>
          Your feedback means the world to us.
        </p>

        {(googleReviewUrl || yelpReviewUrl) && rating >= 4 && (
          <div className="space-y-3 pt-4">
            <p className="text-sm font-medium" style={{ color: '#F8FAFC' }}>
              Would you also share your experience online?
            </p>
            <div className="flex flex-col gap-2">
              {googleReviewUrl && (
                <a
                  href={googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: '#4285F4', color: '#fff' }}
                >
                  <ExternalLink size={14} />
                  Review on Google
                </a>
              )}
              {yelpReviewUrl && (
                <a
                  href={yelpReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: '#D32323', color: '#fff' }}
                >
                  <ExternalLink size={14} />
                  Review on Yelp
                </a>
              )}
            </div>
          </div>
        )}

        <style>{`
          @keyframes pop {
            0% { transform: scale(0); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-6 space-y-6"
      style={{ background: '#111827', border: '1px solid rgba(148,163,184,0.1)' }}
    >
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#F8FAFC' }}>
          How did we do?
        </h1>
        <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
          Your feedback helps us improve our service.
        </p>
      </div>

      {/* Star selector */}
      <div className="flex justify-center gap-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setRating(star)}
            className="transition-transform hover:scale-110 active:scale-95"
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              size={44}
              style={{
                color: star <= (hovered || rating) ? '#f59e0b' : '#374151',
                fill: star <= (hovered || rating) ? '#f59e0b' : 'transparent',
                transition: 'color 0.15s, fill 0.15s',
              }}
            />
          </button>
        ))}
      </div>

      {rating > 0 && (
        <p className="text-center text-sm" style={{ color: '#94A3B8' }}>
          {rating === 1 && 'Very dissatisfied'}
          {rating === 2 && 'Dissatisfied'}
          {rating === 3 && 'Neutral'}
          {rating === 4 && 'Satisfied'}
          {rating === 5 && 'Very satisfied — Love it! 🎉'}
        </p>
      )}

      {/* Optional comment */}
      <div className="space-y-2">
        <label className="text-sm" style={{ color: '#94A3B8' }}>
          Additional comments <span style={{ color: '#64748B' }}>(optional)</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="Tell us about your experience..."
          className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none transition-all"
          style={{
            background: '#0B1120',
            border: '1px solid rgba(148,163,184,0.15)',
            color: '#F8FAFC',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(45,212,191,0.5)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(148,163,184,0.15)'
          }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!rating || submitting}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
        style={{
          background: rating ? '#2DD4BF' : 'rgba(148,163,184,0.1)',
          color: rating ? '#0B1120' : '#64748B',
          cursor: rating ? 'pointer' : 'not-allowed',
        }}
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  )
}

export default function ReviewRequestPage() {
  return (
    <Suspense
      fallback={
        <div
          className="rounded-2xl p-6 animate-pulse"
          style={{ background: '#111827', height: 300 }}
        />
      }
    >
      <ReviewContent />
    </Suspense>
  )
}
