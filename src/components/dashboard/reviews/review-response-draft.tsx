'use client'

import { useState } from 'react'
import {
  Star,
  Sparkles,
  Send,
  SkipForward,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { buildReviewResponseTemplate } from '@/lib/automation-templates'
import type { Review } from '@/lib/types'

interface Props {
  review: Review
  onPosted: () => void
}

const cardClass =
  'bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-5'

export function ReviewResponseDraft({ review, onPosted }: Props) {
  const [draft, setDraft] = useState(review.response_text || '')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createSupabaseBrowserClient()

  const isPending = review.response_status === 'pending' || review.response_status === 'drafted'

  function generateResponse() {
    setIsGenerating(true)
    // Simulate AI generation delay
    setTimeout(() => {
      const text = buildReviewResponseTemplate(
        review.reviewer_name,
        review.rating,
        review.sentiment
      )
      setDraft(text)
      setIsGenerating(false)
    }, 800)
  }

  async function postResponse(editedText?: string) {
    const text = editedText !== undefined ? editedText : draft
    if (!text.trim()) return
    setIsSaving(true)
    await supabase
      .from('reviews')
      .update({
        response_text: text,
        response_status: 'posted',
        responded_at: new Date().toISOString(),
      })
      .eq('id', review.id)
    setIsSaving(false)
    onPosted()
  }

  async function skipResponse() {
    setIsSaving(true)
    await supabase
      .from('reviews')
      .update({ response_status: 'skipped' })
      .eq('id', review.id)
    setIsSaving(false)
    onPosted()
  }

  return (
    <div className={cardClass}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-[#2DD4BF]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2DD4BF]">
            AI Response Draft
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={14}
                className={
                  i < review.rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-700'
                }
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-[#F8FAFC]">
            {review.reviewer_name}
          </span>
        </div>
      </div>

      {/* Review text */}
      {review.review_text && (
        <div className="mb-4 rounded-xl border border-[rgba(148,163,184,0.08)] bg-[rgba(148,163,184,0.04)] p-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            &ldquo;{review.review_text}&rdquo;
          </p>
        </div>
      )}

      {/* Draft textarea */}
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Draft Response
        </label>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          className="w-full rounded-xl border border-[rgba(148,163,184,0.15)] bg-[#0B1120] px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition-colors focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20 resize-none"
          placeholder="Generate or type a response..."
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Generate */}
        <button
          onClick={generateResponse}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2DD4BF]/15 px-3.5 py-2 text-xs font-semibold text-[#2DD4BF] transition-colors hover:bg-[#2DD4BF]/25 disabled:opacity-50"
        >
          {isGenerating ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Sparkles size={13} />
          )}
          {isGenerating ? 'Generating...' : 'Generate Response'}
        </button>

        {/* Post */}
        <button
          onClick={() => postResponse()}
          disabled={isSaving || !draft.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/15 px-3.5 py-2 text-xs font-semibold text-green-400 transition-colors hover:bg-green-500/25 disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Send size={13} />
          )}
          Post Response
        </button>

        {/* Skip */}
        <button
          onClick={skipResponse}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-500/15 px-3.5 py-2 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-500/25 disabled:opacity-50"
        >
          <SkipForward size={13} />
          Skip
        </button>
      </div>
    </div>
  )
}
