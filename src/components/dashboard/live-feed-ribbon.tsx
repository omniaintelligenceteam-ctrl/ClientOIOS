// Phase Beta: Live Feed Ribbon
'use client'

import { useEffect, useState } from 'react'
import { Target, Mail, Phone, DollarSign, Receipt, Sparkles, Lock, Activity, Radar, Heart } from 'lucide-react'

interface FeedEvent {
  id: string
  icon: React.ElementType
  iconColor: string
  text: string
  time: string
}

const SAMPLE_EVENTS: FeedEvent[] = [
  { id: '1', icon: Target,     iconColor: '#34d399', text: 'New lead: Johnson Roofing',   time: '2m' },
  { id: '2', icon: Mail,       iconColor: '#f97316', text: 'Email sent to Smith Co.',      time: '5m' },
  { id: '3', icon: Phone,      iconColor: '#22c55e', text: 'Call completed — 4m 32s',      time: '8m' },
  { id: '4', icon: DollarSign, iconColor: '#fbbf24', text: 'Deal closed: $4,200',          time: '12m' },
  { id: '5', icon: Receipt,    iconColor: '#22d3ee', text: 'Invoice #1047 paid',            time: '15m' },
  { id: '6', icon: Sparkles,   iconColor: '#f97316', text: 'Campaign launched: Spring HVAC', time: '20m' },
  { id: '7', icon: Lock,       iconColor: '#22d3ee', text: 'Revenue report generated',      time: '25m' },
  { id: '8', icon: Activity,   iconColor: '#22c55e', text: 'System health: all green',      time: '30m' },
  { id: '9', icon: Radar,      iconColor: '#fbbf24', text: 'Market analysis complete',      time: '35m' },
  { id: '10', icon: Heart,     iconColor: '#f472b6', text: 'Client satisfaction: 98%',      time: '40m' },
]

export function LiveFeedRibbon() {
  const [events] = useState(SAMPLE_EVENTS)

  // Duplicate for seamless loop
  const doubled = [...events, ...events]

  return (
    <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-40 overflow-hidden"
         style={{ background: 'var(--glass-bg)', borderTop: '1px solid var(--glass-border)', backdropFilter: 'var(--glass-blur)' }}>
      <div className="flex animate-marquee whitespace-nowrap py-1.5">
        {doubled.map((evt, i) => {
          const Icon = evt.icon
          return (
            <div key={`${evt.id}-${i}`} className="inline-flex items-center gap-1.5 px-4 text-[11px] text-slate-400">
              <Icon size={12} style={{ color: evt.iconColor }} className="flex-shrink-0" />
              <span>{evt.text}</span>
              <span className="text-slate-600">{evt.time}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
