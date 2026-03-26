'use client'

import { Phone, Mail, MessageSquare, Calendar, AlertTriangle, Star, ArrowRight } from 'lucide-react'
import type { Lead } from '@/lib/types'

interface NextBestActionProps {
  lead: Lead
  onAction?: (action: string) => void
}

type Priority = 'High' | 'Medium' | 'Low'

interface Recommendation {
  text: string
  priority: Priority
  action: string
  actionIcon: React.ElementType
  reason: string
}

function getRecommendation(lead: Lead): Recommendation {
  const now = new Date()
  const followUpDate = lead.follow_up_date ? new Date(lead.follow_up_date) : null
  const lastContact = lead.last_contact_at ? new Date(lead.last_contact_at) : null
  const daysSinceContact = lastContact
    ? Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Overdue follow-up
  if (followUpDate && followUpDate < now) {
    return {
      text: 'Overdue follow-up! Call or email today.',
      priority: 'High',
      action: 'Call',
      actionIcon: Phone,
      reason: `Follow-up was due ${followUpDate.toLocaleDateString()}`,
    }
  }

  // High value + qualified
  if ((lead.estimated_value ?? 0) > 1000 && lead.status === 'qualified') {
    return {
      text: 'Prioritize this — high value deal ready to advance.',
      priority: 'High',
      action: 'Schedule',
      actionIcon: Calendar,
      reason: `Estimated value: $${lead.estimated_value?.toLocaleString()} — qualified stage`,
    }
  }

  // Proposal sent, no contact in 3+ days
  if (lead.status === 'proposal_sent' && daysSinceContact !== null && daysSinceContact >= 3) {
    return {
      text: 'Follow up on your proposal — no contact in 3+ days.',
      priority: 'High',
      action: 'Email',
      actionIcon: Mail,
      reason: `Proposal sent, last contact ${daysSinceContact} day${daysSinceContact !== 1 ? 's' : ''} ago`,
    }
  }

  // New lead
  if (lead.status === 'new') {
    return {
      text: 'Send a welcome message or book an intro call.',
      priority: 'Medium',
      action: 'SMS',
      actionIcon: MessageSquare,
      reason: 'New lead — first contact drives 70% of conversion',
    }
  }

  // Qualified, no appointment
  if (lead.status === 'qualified') {
    return {
      text: 'Suggest scheduling an appointment to advance the deal.',
      priority: 'Medium',
      action: 'Schedule',
      actionIcon: Calendar,
      reason: 'Qualified leads with appointments convert 3× more',
    }
  }

  // Contacted recently
  if (lead.status === 'contacted') {
    return {
      text: 'Nurture this lead — qualify them for the next stage.',
      priority: 'Low',
      action: 'Email',
      actionIcon: Mail,
      reason: 'Contacted stage — move toward qualification',
    }
  }

  // Default
  return {
    text: 'Keep nurturing — add to follow-up sequence.',
    priority: 'Low',
    action: 'Email',
    actionIcon: Mail,
    reason: 'Consistent follow-up increases close rate',
  }
}

const PRIORITY_STYLES: Record<Priority, string> = {
  High: 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20',
  Medium: 'bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20',
  Low: 'bg-[#64748B]/10 text-[#94A3B8] border border-[#64748B]/20',
}

export function NextBestAction({ lead, onAction }: NextBestActionProps) {
  const rec = getRecommendation(lead)
  const ActionIcon = rec.actionIcon

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-[#2DD4BF] uppercase tracking-wider">
              AI Recommendation
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLES[rec.priority]}`}>
              {rec.priority}
            </span>
          </div>
          <p className="text-sm font-medium text-[#F8FAFC]">{rec.text}</p>
          <p className="mt-1.5 text-xs text-[#64748B]">
            <span className="text-[#475569]">Based on:</span> {rec.reason}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onAction?.(rec.action)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 px-4 py-2.5 text-sm font-semibold text-[#2DD4BF] transition-all hover:bg-[#2DD4BF]/20"
      >
        <ActionIcon size={15} />
        {rec.action}
        <ArrowRight size={13} className="ml-auto" />
      </button>
    </div>
  )
}
