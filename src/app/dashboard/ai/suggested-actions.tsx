'use client'

import { BarChart3, Phone, Target, Calendar, AlertTriangle } from 'lucide-react'

interface SuggestedActionsProps {
  onSuggestionClick: (text: string) => void
}

const SUGGESTIONS = [
  { icon: BarChart3, text: 'Pipeline summary', query: 'Give me a summary of our current sales pipeline including lead counts by stage and total pipeline value.' },
  { icon: Phone, text: 'Follow-up reminders', query: 'What leads need follow-up this week? Show me any overdue follow-ups sorted by priority.' },
  { icon: Target, text: 'Revenue forecast', query: "What's our 30/60/90 day revenue forecast based on current pipeline?" },
  { icon: BarChart3, text: 'Generate report', query: 'Write a summary of this week\'s performance including calls, leads, and revenue.' },
  { icon: Target, text: 'Top leads', query: 'Show me our hottest 5 leads right now ranked by score and estimated value.' },
  { icon: Calendar, text: "Today's schedule", query: "What's on the schedule for today? Any appointments or important tasks?" },
  { icon: AlertTriangle, text: 'At-risk items', query: 'What items are at risk that need immediate attention? Show me overdue follow-ups and stalled deals.' },
  { icon: Target, text: 'Generate proposal', query: 'Generate a proposal for our most recent high-value lead.' },
]

export function SuggestedActions({ onSuggestionClick }: SuggestedActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTIONS.map((suggestion) => {
        const Icon = suggestion.icon
        return (
          <button
            key={suggestion.text}
            type="button"
            onClick={() => onSuggestionClick(suggestion.query)}
            className="flex items-center gap-2 rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-4 py-2 text-sm text-[#94A3B8] transition-all hover:border-[#2DD4BF]/30 hover:bg-[#2DD4BF]/5 hover:text-[#F8FAFC]"
          >
            <Icon size={14} className="flex-shrink-0 text-[#2DD4BF]" />
            {suggestion.text}
          </button>
        )
      })}
    </div>
  )
}
