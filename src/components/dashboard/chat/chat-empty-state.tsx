'use client'

import { Sparkles, Phone, Target, Receipt, Star, Calendar, TrendingUp, AlertTriangle } from 'lucide-react'

const SUGGESTIONS = [
  { icon: TrendingUp, text: 'Give me a pipeline summary with counts by stage and total value' },
  { icon: Phone, text: 'How many calls did I get this week?' },
  { icon: Target, text: 'Show me my top 5 hottest leads ranked by score' },
  { icon: AlertTriangle, text: 'What leads need follow-up this week?' },
  { icon: Receipt, text: 'Any overdue invoices?' },
  { icon: Star, text: 'What are my recent reviews?' },
  { icon: Calendar, text: "What's on the schedule today?" },
  { icon: TrendingUp, text: "What's our 30/60/90 day revenue forecast?" },
]

interface ChatEmptyStateProps {
  compact?: boolean
  onSuggestionClick?: (text: string) => void
}

export function ChatEmptyState({ compact, onSuggestionClick }: ChatEmptyStateProps) {
  const displayed = compact ? SUGGESTIONS.slice(0, 3) : SUGGESTIONS

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600/20 border border-teal-500/30">
        <Sparkles size={28} className="text-teal-400" />
      </div>
      <h3 className={`mt-4 font-semibold text-[#F8FAFC] ${compact ? 'text-base' : 'text-lg'}`}>
        AI Assistant
      </h3>
      <p className="mt-1.5 text-center text-sm text-[#94A3B8]">
        {compact
          ? 'Ask anything about your business.'
          : 'Your business intelligence copilot — powered by Claude with live data access.'}
      </p>

      <div className={`mt-6 flex w-full flex-col gap-2 ${compact ? 'max-w-[320px]' : 'max-w-md'}`}>
        {displayed.map((suggestion) => {
          const Icon = suggestion.icon
          return (
            <button
              key={suggestion.text}
              type="button"
              onClick={() => onSuggestionClick?.(suggestion.text)}
              className="flex items-center gap-3 rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-4 py-3 text-left text-sm text-[#94A3B8] transition-all hover:border-[#2DD4BF]/30 hover:bg-[#2DD4BF]/5 hover:text-[#F8FAFC]"
            >
              <Icon size={16} className="flex-shrink-0 text-[#2DD4BF]" />
              {suggestion.text}
            </button>
          )
        })}
      </div>
    </div>
  )
}
