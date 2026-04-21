'use client'

import { useState, useEffect, useMemo } from 'react'
import { Send, Mail, MousePointerClick, MessageSquare, Loader2 } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Props {
  campaignId?: string
  organizationId: string
}

interface StatCard {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
  suffix?: string
}

const cardClass =
  'backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4'

export function CampaignStats({ campaignId, organizationId }: Props) {
  const [stats, setStats] = useState({
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    replied: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (!organizationId) return

    const fetchStats = async () => {
      // Pull from automation_logs grouped by status
      const query = supabase
        .from('automation_logs')
        .select('status, action_type')
        .eq('organization_id', organizationId)

      const { data } = await query

      if (data) {
        const sent = data.filter((d: any) => d.status === 'sent').length
        const delivered = data.filter((d: any) => d.status === 'delivered').length
        const opened = data.filter((d: any) => d.status === 'opened').length
        const clicked = data.filter((d: any) => d.status === 'clicked').length
        setStats({ sent, delivered, opened, clicked, replied: 0 })
      }

      setLoading(false)
    }

    fetchStats()
  }, [organizationId, campaignId])

  const openRate = stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0
  const clickRate = stats.sent > 0 ? Math.round((stats.clicked / stats.sent) * 100) : 0

  const cards: StatCard[] = [
    { label: 'Sent', value: stats.sent, icon: Send, color: '#2DD4BF' },
    { label: 'Delivered', value: stats.delivered, icon: Mail, color: '#60a5fa' },
    { label: 'Opened', value: stats.opened, icon: MessageSquare, color: '#f97316' },
    { label: 'Clicked', value: stats.clicked, icon: MousePointerClick, color: '#a78bfa' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-[#2DD4BF]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className={cardClass}>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${c.color}20` }}
                >
                  <Icon size={14} style={{ color: c.color }} />
                </div>
                <p className="text-xs text-slate-400">{c.label}</p>
              </div>
              <p className="text-2xl font-bold text-[#F8FAFC]">{c.value}</p>
            </div>
          )
        })}
      </div>

      {/* Rate bars */}
      <div className={cardClass}>
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Performance
        </p>
        <div className="space-y-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs text-slate-400">Open Rate</span>
              <span className="text-xs font-semibold text-[#f97316]">{openRate}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[rgba(148,163,184,0.08)]">
              <div
                className="h-full rounded-full bg-[#f97316] transition-all duration-700"
                style={{ width: `${openRate}%` }}
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs text-slate-400">Click Rate</span>
              <span className="text-xs font-semibold text-[#a78bfa]">{clickRate}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[rgba(148,163,184,0.08)]">
              <div
                className="h-full rounded-full bg-[#a78bfa] transition-all duration-700"
                style={{ width: `${clickRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
