'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { PredictiveRevenue } from '@/components/dashboard/ai/predictive-revenue'
import type { Lead } from '@/lib/types'
import {
  Bot,
  Send,
  Loader2,
  DollarSign,
  Target,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  User,
  BarChart3,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

/* ------------------------------------------------------------------ */
/*  Suggestion chips                                                   */
/* ------------------------------------------------------------------ */

const SUGGESTIONS = [
  { icon: '📊', label: 'Pipeline summary', prompt: 'Give me a summary of our current sales pipeline — counts by stage and total value.' },
  { icon: '⏰', label: 'Follow-up reminders', prompt: 'Which leads need follow-up this week? Show overdue and upcoming.' },
  { icon: '💰', label: 'Revenue forecast', prompt: 'What is our 30/60/90 day revenue forecast based on current pipeline?' },
  { icon: '🎯', label: 'Top leads', prompt: 'Show me our 5 hottest leads right now ranked by score and value.' },
  { icon: '📅', label: "Today's schedule", prompt: 'What appointments and follow-ups do I have scheduled for today?' },
  { icon: '⚠️', label: 'At-risk items', prompt: 'What items are at risk that need immediate attention?' },
  { icon: '📋', label: 'Weekly report', prompt: 'Write a summary of this week\'s performance — leads, calls, revenue.' },
  { icon: '📝', label: 'Generate proposal', prompt: 'Generate a professional proposal for our most recent qualified lead.' },
]

/* ------------------------------------------------------------------ */
/*  Stats sidebar                                                      */
/* ------------------------------------------------------------------ */

function StatsSidebar({ orgId }: { orgId: string }) {
  const [stats, setStats] = useState({
    revenueThisMonth: 0,
    pipelineValue: 0,
    leadsThisWeek: 0,
    appointmentsToday: 0,
    atRiskCount: 0,
  })

  useEffect(() => {
    if (!orgId) return
    const supabase = createSupabaseBrowserClient()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const weekStart = new Date(now.getTime() - 7 * 86_400_000).toISOString()
    const today = now.toISOString().split('T')[0]
    const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000).toISOString().split('T')[0]
    const tomorrow = new Date(now.getTime() + 86_400_000).toISOString().split('T')[0]
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000).toISOString().split('T')[0]

    Promise.all([
      supabase.from('invoices').select('amount').eq('organization_id', orgId).eq('status', 'paid').gte('paid_at', monthStart),
      supabase.from('leads').select('estimated_value, status').eq('organization_id', orgId),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('created_at', weekStart),
      supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('scheduled_date', today).not('status', 'eq', 'cancelled'),
      // at-risk: overdue follow-ups + tomorrow unconfirmed + overdue invoices
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).lt('follow_up_date', twoDaysAgo).not('status', 'eq', 'won').not('status', 'eq', 'lost'),
    ]).then(([invoicesRes, leadsRes, weekLeadsRes, apptRes, atRiskRes]) => {
      const revenue = ((invoicesRes.data as any[]) || []).reduce((s: number, i: any) => s + (i.amount || 0), 0)
      const pipeline = ((leadsRes.data as any[]) || [])
        .filter((l: any) => !['won', 'lost'].includes(l.status))
        .reduce((s: number, l: any) => s + (l.estimated_value || 0), 0)
      setStats({
        revenueThisMonth: revenue,
        pipelineValue: pipeline,
        leadsThisWeek: weekLeadsRes.count || 0,
        appointmentsToday: apptRes.count || 0,
        atRiskCount: atRiskRes.count || 0,
      })
    })
  }, [orgId])

  const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`

  const items = [
    { label: 'Revenue (MTD)', value: fmt(stats.revenueThisMonth), icon: DollarSign, color: 'text-green-400' },
    { label: 'Pipeline Value', value: fmt(stats.pipelineValue), icon: BarChart3, color: 'text-teal-400' },
    { label: 'Leads This Week', value: String(stats.leadsThisWeek), icon: Target, color: 'text-blue-400' },
    { label: 'Appointments Today', value: String(stats.appointmentsToday), icon: Calendar, color: 'text-purple-400' },
    { label: 'At-Risk Items', value: String(stats.atRiskCount), icon: AlertTriangle, color: stats.atRiskCount > 0 ? 'text-amber-400' : 'text-slate-500' },
  ]

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Stats</p>
      {items.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="flex items-center justify-between bg-[rgba(148,163,184,0.04)] border border-[rgba(148,163,184,0.08)] rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-xs text-slate-400">{label}</span>
          </div>
          <span className={`text-sm font-bold ${color}`}>{value}</span>
        </div>
      ))}
      <div className="mt-4">
        <PredictiveRevenue organizationId={orgId} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Chat message                                                       */
/* ------------------------------------------------------------------ */

function ChatMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-chat-fade-in`}>
      <div className={`flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold ${
        isUser ? 'bg-teal-600/20 text-teal-400' : 'bg-[rgba(148,163,184,0.1)] text-slate-400'
      }`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-teal-600/20 border border-teal-500/30 text-teal-100 rounded-tr-sm'
          : 'bg-[#1E293B] border border-[rgba(148,163,184,0.1)] text-slate-200 rounded-tl-sm'
      }`}>
        {msg.content.split('\n').map((line, i) => (
          <span key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</span>
        ))}
        <p className="text-[10px] mt-1.5 opacity-50">
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Build context for AI                                               */
/* ------------------------------------------------------------------ */

async function buildContext(orgId: string): Promise<string> {
  const supabase = createSupabaseBrowserClient()
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [leadsRes, invoicesRes, apptRes] = await Promise.all([
    supabase.from('leads').select('status, estimated_value, priority, first_name, last_name, score, service_needed').eq('organization_id', orgId).limit(100),
    supabase.from('invoices').select('amount, status').eq('organization_id', orgId).gte('created_at', monthStart),
    supabase.from('appointments').select('status, service_type, scheduled_date').eq('organization_id', orgId).eq('scheduled_date', today),
  ])

  const leads = (leadsRes.data as any[]) || []
  const invoices = (invoicesRes.data as any[]) || []
  const appts = (apptRes.data as any[]) || []

  const pipelineByStage: Record<string, { count: number; value: number }> = {}
  for (const l of leads) {
    if (!pipelineByStage[l.status]) pipelineByStage[l.status] = { count: 0, value: 0 }
    pipelineByStage[l.status].count++
    pipelineByStage[l.status].value += l.estimated_value || 0
  }

  const revenue = invoices.filter((i) => i.status === 'paid').reduce((s: number, i: any) => s + (i.amount || 0), 0)
  const hotLeads = leads.filter((l) => l.priority === 'hot' && !['won', 'lost'].includes(l.status))

  return `
OIOS Business Context (as of ${now.toLocaleString()}):
- Today's date: ${today}
- Revenue this month: $${revenue.toLocaleString()}
- Pipeline stages: ${JSON.stringify(pipelineByStage)}
- Today's appointments: ${appts.length} (${appts.map((a) => a.service_type).join(', ') || 'none'})
- Hot leads: ${hotLeads.map((l) => `${l.first_name} ${l.last_name} ($${l.estimated_value}, score ${l.score})`).join('; ') || 'none'}
- Total leads in system: ${leads.length}
`.trim()
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AIPage() {
  const { profile } = useAuth()
  const orgId = profile?.organization_id || ''
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hey ${firstName}! 👋 I'm your OIOS AI assistant. I have full access to your pipeline, leads, calls, and revenue data.\n\nAsk me anything — or pick a suggestion below to get started.`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // Build context
      const context = await buildContext(orgId)

      // Call the existing chat API route
      const res = await fetch('/api/dashboard/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context,
          systemPrompt: `You are the OIOS AI assistant — a sharp, direct business intelligence AI for a home services business. You have access to live business data provided in the context. Answer questions with specific numbers, actionable insights, and clear recommendations. Keep responses concise but complete. Format key data with bullet points or tables when helpful.`,
        }),
      })

      let reply = ''
      if (res.ok) {
        const data = await res.json()
        reply = data.message || data.response || data.content || 'Done — let me know if you need more detail.'
      } else {
        // Fallback to rule-based responses
        reply = generateFallback(text, context)
      }

      setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'assistant', content: reply, timestamp: new Date() }])
    } catch {
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I hit a snag fetching that data. Try again or check your connection.",
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }, [orgId, loading])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex h-full gap-0 sm:gap-6 -m-4 sm:-m-6">
      {/* Sidebar — hidden on mobile unless toggled */}
      <aside className={`${showSidebar ? 'block' : 'hidden'} lg:block w-full lg:w-72 flex-shrink-0 border-r border-[rgba(148,163,184,0.1)] bg-[#111827] lg:bg-transparent p-4 overflow-y-auto`}>
        <StatsSidebar orgId={orgId} />
      </aside>

      {/* Chat area */}
      <div className="flex flex-col flex-1 min-w-0 p-4 sm:p-0">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[rgba(148,163,184,0.1)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600/20 border border-teal-500/30">
              <Sparkles className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">AI Assistant</h1>
              <p className="text-xs text-slate-500">Powered by Claude · Live data access</p>
            </div>
          </div>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="lg:hidden flex items-center gap-1.5 rounded-lg border border-[rgba(148,163,184,0.12)] px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Stats
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
          {messages.map((msg) => <ChatMessage key={msg.id} msg={msg} />)}

          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(148,163,184,0.1)]">
                <Bot className="h-4 w-4 text-slate-400" />
              </div>
              <div className="bg-[#1E293B] border border-[rgba(148,163,184,0.1)] rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animationDelay: '0.2s' }} />
                  <span className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestion chips */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 pb-3 flex-shrink-0">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => sendMessage(s.prompt)}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-full border border-[rgba(148,163,184,0.12)] bg-[rgba(148,163,184,0.04)] px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:border-teal-500/30 hover:bg-teal-500/5 transition-colors disabled:opacity-50"
              >
                <span>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex items-end gap-3 pt-3 border-t border-[rgba(148,163,184,0.1)] flex-shrink-0">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask anything about your business..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-[rgba(148,163,184,0.12)] bg-[#0B1120] px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/20 min-h-[48px] max-h-32"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white shadow-lg shadow-teal-600/20 hover:bg-teal-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Fallback (rule-based if API unavailable)                           */
/* ------------------------------------------------------------------ */

function generateFallback(prompt: string, context: string): string {
  const p = prompt.toLowerCase()
  if (p.includes('pipeline') || p.includes('stage')) {
    const match = context.match(/Pipeline stages: ({.*?})/s)
    return match ? `Here's your current pipeline:\n\n${formatPipelineContext(match[1])}` : 'No pipeline data available right now.'
  }
  if (p.includes('revenue') || p.includes('forecast')) {
    const match = context.match(/Revenue this month: \$([0-9,]+)/)
    return match ? `Revenue this month: $${match[1]}\n\nFor forecasting, I need your pipeline data — check the Pipeline page for full breakdown.` : 'Revenue data unavailable.'
  }
  if (p.includes('hot lead') || p.includes('top lead')) {
    const match = context.match(/Hot leads: (.+)/)
    return match ? `Your hot leads:\n\n${match[1].split(';').map((l) => `• ${l.trim()}`).join('\n')}` : 'No hot leads found.'
  }
  return "I couldn't connect to the AI service right now. Check your ANTHROPIC_API_KEY environment variable, or try again in a moment."
}

function formatPipelineContext(json: string): string {
  try {
    const data = JSON.parse(json)
    return Object.entries(data)
      .map(([stage, info]: [string, any]) => `• ${stage.replace('_', ' ')}: ${info.count} leads ($${(info.value / 1000).toFixed(0)}k)`)
      .join('\n')
  } catch {
    return json
  }
}
