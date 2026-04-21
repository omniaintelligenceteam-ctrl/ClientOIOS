'use client'

import { useEffect } from 'react'
import { DollarSign, Calendar, AlertOctagon, Star, Zap, TrendingUp, MessageSquare } from 'lucide-react'

interface IntentClassifierProps {
  transcriptSummary: string | null
  onIntentDetected?: (intent: string, suggestedActions: string[]) => void
}

interface IntentResult {
  intent: string
  icon: React.ElementType
  color: string
  actions: string[]
  actionIcons: string[]
}

function classifyIntent(transcript: string): IntentResult {
  const t = transcript.toLowerCase()

  if (/price|cost|quote|estimate|how much|rate|charge/.test(t)) {
    return {
      intent: 'Pricing Question',
      icon: DollarSign,
      color: '#2DD4BF',
      actions: ['Send pricing sheet', 'Book consultation'],
      actionIcons: ['💰', '📅'],
    }
  }

  if (/emergency|urgent|asap|right now|immediately|can't wait/.test(t)) {
    return {
      intent: 'Urgent',
      icon: Zap,
      color: '#EF4444',
      actions: ['Escalate immediately', 'Call back ASAP'],
      actionIcons: ['🚨', '📞'],
    }
  }

  if (/schedule|book|appointment|availability|when can|come out/.test(t)) {
    return {
      intent: 'Scheduling',
      icon: Calendar,
      color: '#6366F1',
      actions: ['Book appointment', 'Send availability'],
      actionIcons: ['📅', '📆'],
    }
  }

  if (/complaint|problem|issue|wrong|broken|not working|unhappy|disappointed/.test(t)) {
    return {
      intent: 'Complaint',
      icon: AlertOctagon,
      color: '#f97316',
      actions: ['Log issue', 'Flag for review', 'Send apology'],
      actionIcons: ['📋', '🚩', '📧'],
    }
  }

  if (/review|feedback|rating|google|yelp|stars/.test(t)) {
    return {
      intent: 'Review Request',
      icon: Star,
      color: '#FBBF24',
      actions: ['Send review request', 'Thank customer'],
      actionIcons: ['⭐', '🙏'],
    }
  }

  if (/upgrade|more service|additional|expand|also need|extra/.test(t)) {
    return {
      intent: 'Upsell Opportunity',
      icon: TrendingUp,
      color: '#2DD4BF',
      actions: ['Schedule follow-up', 'Prepare proposal'],
      actionIcons: ['📅', '📋'],
    }
  }

  return {
    intent: 'General Inquiry',
    icon: MessageSquare,
    color: '#64748B',
    actions: ['Send follow-up email'],
    actionIcons: ['📧'],
  }
}

export function IntentClassifier({ transcriptSummary, onIntentDetected }: IntentClassifierProps) {
  const result = transcriptSummary ? classifyIntent(transcriptSummary) : null

  useEffect(() => {
    if (result) {
      onIntentDetected?.(result.intent, result.actions)
    }
  }, [transcriptSummary])  

  if (!transcriptSummary || !result) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
        <MessageSquare size={20} className="mx-auto mb-2 text-[#475569]" />
        <p className="text-xs text-[#64748B]">No transcript available for intent detection</p>
      </div>
    )
  }

  const Icon = result.icon

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Detected Intent</span>
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
          style={{ backgroundColor: `${result.color}15`, color: result.color, border: `1px solid ${result.color}30` }}
        >
          <Icon size={12} />
          {result.intent}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {result.actions.map((action, i) => (
          <button
            key={action}
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-3 py-1.5 text-xs font-medium text-[#94A3B8] transition-all hover:border-[#2DD4BF]/30 hover:text-[#F8FAFC]"
          >
            <span>{result.actionIcons[i]}</span>
            {action}
          </button>
        ))}
      </div>
    </div>
  )
}
