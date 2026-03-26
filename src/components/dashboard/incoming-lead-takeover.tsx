// Phase Theta: Incoming Lead Full-Screen Takeover
'use client'

import { useEffect, useState } from 'react'
import { X, Phone, MessageSquare, Mail, Calendar, Zap } from 'lucide-react'

interface LeadData {
  id: string
  name: string
  phone: string
  source: string
  score: number
  service: string
  value: number
}

interface IncomingLeadTakeoverProps {
  lead: LeadData | null
  onClose: () => void
  onAction: (action: 'call' | 'sms' | 'email' | 'book', leadId: string) => void
}

export function IncomingLeadTakeover({ lead, onClose, onAction }: IncomingLeadTakeoverProps) {
  const [visible, setVisible] = useState(false)
  const [cardVisible, setCardVisible] = useState(false)

  useEffect(() => {
    if (lead) {
      setVisible(true)
      setTimeout(() => setCardVisible(true), 100)
    } else {
      setCardVisible(false)
      setTimeout(() => setVisible(false), 400)
    }
  }, [lead])

  if (!visible || !lead) return null

  const scoreColor = lead.score >= 80 ? '#f97316' : lead.score >= 50 ? '#eab308' : '#22c55e'

  return (
    <div className="fixed inset-0 z-[250]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-chat-fade-in" onClick={onClose} />

      {/* Radar sweep */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div
          className="w-96 h-96 rounded-full border border-teal-500/10"
          style={{ animation: 'radar-sweep 2s linear infinite' }}
        />
      </div>

      {/* Lead card */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center p-6 transition-all duration-500 ${
          cardVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
      >
        <div className="panel w-full max-w-md p-6 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-teal-400" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-teal-400">Lead Incoming</span>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Lead info */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">{lead.name}</h2>
            <p className="text-sm text-slate-400">{lead.service}</p>
          </div>

          {/* Score ring */}
          <div className="flex justify-center mb-6">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#1e293b" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="34" fill="none"
                  stroke={scoreColor}
                  strokeWidth="6"
                  strokeDasharray={`${(lead.score / 100) * 213.6} 213.6`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold" style={{ color: scoreColor }}>{lead.score}</span>
                <span className="text-[8px] text-slate-500">SCORE</span>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="flex justify-center gap-4 text-xs text-slate-400 mb-6">
            <span>{lead.source.replace('_', ' ')}</span>
            <span>•</span>
            <span className="font-mono text-white">${lead.value.toLocaleString()}</span>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Call', icon: Phone, color: 'bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30' },
              { label: 'SMS', icon: MessageSquare, color: 'bg-blue-500/20 border-blue-500/40 text-blue-400 hover:bg-blue-500/30' },
              { label: 'Email', icon: Mail, color: 'bg-purple-500/20 border-purple-500/40 text-purple-400 hover:bg-purple-500/30' },
              { label: 'Book', icon: Calendar, color: 'bg-orange-500/20 border-orange-500/40 text-orange-400 hover:bg-orange-500/30' },
            ].map(({ label, icon: Icon, color }) => (
              <button
                key={label}
                onClick={() => onAction(label.toLowerCase() as any, lead.id)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-all ${color}`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
