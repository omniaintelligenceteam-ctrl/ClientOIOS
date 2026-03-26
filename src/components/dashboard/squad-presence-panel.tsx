// Phase Beta: Squad Status Panel
'use client'

import { useState } from 'react'
import {
  Sparkles, Lock, Footprints, Activity, Radar,
  Shield, Heart, Target, Handshake,
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  role: string
  icon: React.ElementType
  color: string
  status: 'active' | 'idle' | 'off'
  task: string
  lastActivity: string
}

const AGENTS: Agent[] = [
  { id: 'nova',   name: 'Nova',   role: 'CMO',            icon: Sparkles,  color: '#f97316', status: 'active', task: 'Running email campaign', lastActivity: '2m ago' },
  { id: 'cipher', name: 'Cipher', role: 'CFO',            icon: Lock,      color: '#22d3ee', status: 'active', task: 'Processing invoices',     lastActivity: '1m ago' },
  { id: 'atlas',  name: 'Atlas',  role: 'Operations',     icon: Footprints,color: '#a78bfa', status: 'idle',   task: 'Monitoring KPIs',         lastActivity: '15m ago' },
  { id: 'pulse',  name: 'Pulse',  role: 'IT / Systems',   icon: Activity,  color: '#22c55e', status: 'active', task: 'Health check running',    lastActivity: '30s ago' },
  { id: 'echo',   name: 'Echo',   role: 'Research / BI',  icon: Radar,     color: '#fbbf24', status: 'idle',   task: 'Analyzing trends',        lastActivity: '8m ago' },
  { id: 'haven',  name: 'Haven',  role: 'Client Success', icon: Shield,    color: '#f472b6', status: 'active', task: 'Client onboarding',       lastActivity: '3m ago' },
  { id: 'scout',  name: 'Scout',  role: 'Reception',      icon: Heart,     color: '#34d399', status: 'active', task: 'Qualifying new lead',     lastActivity: '1m ago' },
  { id: 'hunter', name: 'Hunter', role: 'Sales Outreach',  icon: Target,    color: '#f87171', status: 'idle',   task: 'Cold outreach batch',     lastActivity: '22m ago' },
  { id: 'closer', name: 'Closer', role: 'Sales Closer',   icon: Handshake, color: '#60a5fa', status: 'off',    task: 'Standby',                 lastActivity: '1h ago' },
]

const STATUS_DOT_COLOR = {
  active: 'bg-green-400',
  idle: 'bg-yellow-400',
  off: 'bg-gray-500',
}

export function SquadPresencePanel() {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="hidden lg:flex flex-col items-center py-4 gap-3 w-[80px] min-w-[80px] border-r border-[rgba(148,163,184,0.1)] bg-white/[0.02] backdrop-blur-sm">
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">Squad</span>
      {AGENTS.map((agent) => {
        const Icon = agent.icon
        const isExpanded = expanded === agent.id
        return (
          <div key={agent.id} className="relative group">
            <button
              onClick={() => setExpanded(isExpanded ? null : agent.id)}
              className="relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 hover:scale-110"
              style={{ background: `${agent.color}15`, border: `2px solid ${agent.color}40` }}
            >
              <Icon size={18} style={{ color: agent.color }} />
              {/* Status dot */}
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#111827] ${STATUS_DOT_COLOR[agent.status]}`} />
              {/* Pulse ring for active */}
              {agent.status === 'active' && (
                <span className="absolute inset-0 rounded-full animate-pulse-ring" style={{ border: `2px solid ${agent.color}40` }} />
              )}
            </button>

            {/* Hover tooltip */}
            <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block whitespace-nowrap">
              <div className="panel px-3 py-2 text-xs shadow-xl">
                <p className="font-semibold text-white">{agent.name}</p>
                <p className="text-slate-400">{agent.task}</p>
                <p className="text-slate-500 text-[10px] mt-0.5">{agent.lastActivity}</p>
              </div>
            </div>

            {/* Expanded mini panel */}
            {isExpanded && (
              <div className="absolute left-full ml-3 top-0 z-50 w-52 animate-arrive-left">
                <div className="panel p-3 shadow-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `${agent.color}20` }}>
                      <Icon size={14} style={{ color: agent.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{agent.name}</p>
                      <p className="text-[10px] text-slate-400">{agent.role}</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300 bg-[#0B1120] rounded-lg p-2">
                    <p className="font-medium" style={{ color: agent.color }}>Current Task</p>
                    <p className="text-slate-400 mt-0.5">{agent.task}</p>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">Last active: {agent.lastActivity}</p>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
