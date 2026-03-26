// Phase Delta: Upgraded Command Palette
'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, X, ArrowRight, Zap, MessageSquare, Users, Calendar,
  BarChart3, Settings, Phone, FileText, Star, TrendingUp, Home,
  UserPlus, PhoneCall, BookOpen, Clock, Hash,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CommandSection = 'navigation' | 'actions' | 'recent'

interface Command {
  id: string
  label: string
  description?: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  section: CommandSection
  path?: string
  action?: () => void
  keywords?: string[]
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const NAV_COMMANDS: Omit<Command, 'section'>[] = [
  { id: 'nav-dashboard', label: 'Dashboard', description: 'Overview & KPIs', icon: Home, path: '/dashboard', keywords: ['home', 'overview'] },
  { id: 'nav-leads', label: 'Lead Pipeline', description: 'Manage your leads', icon: TrendingUp, path: '/dashboard/leads', keywords: ['pipeline', 'prospects'] },
  { id: 'nav-calls', label: 'Calls', description: 'Call log & analytics', icon: Phone, path: '/dashboard/calls', keywords: ['phone', 'voicemail'] },
  { id: 'nav-schedule', label: 'Schedule', description: 'Appointments & bookings', icon: Calendar, path: '/dashboard/schedule', keywords: ['calendar', 'appointments', 'booking'] },
  { id: 'nav-customers', label: 'Customers', description: 'Customer database', icon: Users, path: '/dashboard/customers', keywords: ['clients', 'contacts'] },
  { id: 'nav-invoicing', label: 'Invoicing', description: 'Invoices & payments', icon: FileText, path: '/dashboard/invoicing', keywords: ['billing', 'payments', 'invoice'] },
  { id: 'nav-reviews', label: 'Reviews', description: 'Customer reviews', icon: Star, path: '/dashboard/reviews', keywords: ['ratings', 'feedback'] },
  { id: 'nav-analytics', label: 'Analytics', description: 'Business insights', icon: BarChart3, path: '/dashboard/analytics', keywords: ['reports', 'metrics'] },
  { id: 'nav-marketing', label: 'Marketing', description: 'Campaigns & outreach', icon: Zap, path: '/dashboard/marketing', keywords: ['campaigns', 'email'] },
  { id: 'nav-ai', label: 'AI Assistant', description: 'AI business copilot', icon: MessageSquare, path: '/dashboard/ai', keywords: ['ai', 'assistant', 'bot', 'chat'] },
  { id: 'nav-settings', label: 'Settings', description: 'Account & configuration', icon: Settings, path: '/dashboard/settings', keywords: ['config', 'preferences', 'account'] },
]

const ACTION_COMMANDS: Omit<Command, 'section'>[] = [
  { id: 'action-new-lead', label: 'New Lead', description: 'Add a new lead to pipeline', icon: UserPlus, path: '/dashboard/leads', keywords: ['add', 'create', 'prospect'] },
  { id: 'action-log-call', label: 'Log Call', description: 'Record a call manually', icon: PhoneCall, path: '/dashboard/calls', keywords: ['add call', 'record'] },
  { id: 'action-book-job', label: 'Book Job', description: 'Schedule a new appointment', icon: BookOpen, path: '/dashboard/schedule', keywords: ['appointment', 'schedule', 'book'] },
]

const SECTION_LABELS: Record<CommandSection, string> = {
  navigation: 'Navigation',
  actions: 'Quick Actions',
  recent: 'Recent',
}

const RECENT_KEY = 'command_palette_recent'
const MAX_RECENT = 5

/* ------------------------------------------------------------------ */
/*  Fuzzy match                                                        */
/* ------------------------------------------------------------------ */

function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t.includes(q)) return true
  let qi = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
  }
  return qi === q.length
}

function matchScore(query: string, cmd: Command): number {
  if (!query) return 0
  const q = query.toLowerCase()
  const label = cmd.label.toLowerCase()
  const desc = (cmd.description ?? '').toLowerCase()
  const kw = (cmd.keywords ?? []).join(' ').toLowerCase()

  if (label === q) return 100
  if (label.startsWith(q)) return 80
  if (label.includes(q)) return 60
  if (desc.includes(q) || kw.includes(q)) return 40
  return 10
}

/* ------------------------------------------------------------------ */
/*  Recent storage                                                     */
/* ------------------------------------------------------------------ */

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
  } catch {
    return []
  }
}

function pushRecent(id: string) {
  try {
    const prev = getRecent().filter(r => r !== id)
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, MAX_RECENT)))
  } catch {}
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [recentIds, setRecentIds] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const allCommands: Command[] = useMemo(() => [
    ...NAV_COMMANDS.map(c => ({ ...c, section: 'navigation' as CommandSection })),
    ...ACTION_COMMANDS.map(c => ({ ...c, section: 'actions' as CommandSection })),
  ], [])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setSelected(0)
  }, [])

  const openPalette = useCallback(() => {
    setRecentIds(getRecent())
    setOpen(true)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) close()
        else openPalette()
      }
      if (e.key === 'Escape' && open) close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, close, openPalette])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  /* Filtered + sectioned results */
  const filteredCommands = useMemo(() => {
    const q = query.trim()

    if (!q) {
      // Show recent + quick actions + a few nav
      const recentCmds = recentIds
        .map(id => allCommands.find(c => c.id === id))
        .filter(Boolean) as Command[]
      const recentWithSection = recentCmds.map(c => ({ ...c, section: 'recent' as CommandSection }))

      const actionCmds = ACTION_COMMANDS.map(c => ({ ...c, section: 'actions' as CommandSection }))
      const navCmds = NAV_COMMANDS.slice(0, 6).map(c => ({ ...c, section: 'navigation' as CommandSection }))

      return [...recentWithSection, ...actionCmds, ...navCmds]
    }

    return allCommands
      .filter(cmd => {
        const searchText = [cmd.label, cmd.description ?? '', ...(cmd.keywords ?? [])].join(' ')
        return fuzzyMatch(q, searchText)
      })
      .sort((a, b) => matchScore(q, b) - matchScore(q, a))
      .map(c => ({ ...c }))
  }, [query, allCommands, recentIds])

  /* Group by section */
  const sections = useMemo(() => {
    const grouped: Record<string, Command[]> = {}
    for (const cmd of filteredCommands) {
      if (!grouped[cmd.section]) grouped[cmd.section] = []
      grouped[cmd.section].push(cmd)
    }
    return grouped
  }, [filteredCommands])

  const flatList = filteredCommands

  /* Keyboard nav */
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, flatList.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && flatList[selected]) {
      execute(flatList[selected])
    }
  }

  const execute = useCallback((cmd: Command) => {
    pushRecent(cmd.id)
    if (cmd.action) {
      cmd.action()
    } else if (cmd.path) {
      router.push(cmd.path)
    }
    close()
  }, [router, close])

  /* Scroll selected into view */
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  useEffect(() => { setSelected(0) }, [query])

  if (!open) return null

  const sectionOrder: CommandSection[] = ['recent', 'actions', 'navigation']

  return (
    <div className="fixed inset-0 z-[200]" onClick={close}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="absolute top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl px-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-2xl border border-[rgba(148,163,184,0.15)] bg-black/[0.75] shadow-2xl shadow-black/60 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-150">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-[rgba(148,163,184,0.08)] px-4 py-3.5">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Search pages, actions..."
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
            <div className="flex items-center gap-2">
              <kbd className="hidden rounded border border-[rgba(148,163,184,0.15)] bg-[rgba(148,163,184,0.06)] px-1.5 py-0.5 text-[10px] font-mono text-slate-500 sm:inline-block">
                ESC
              </kbd>
              <button onClick={close} aria-label="Close command palette" className="text-slate-500 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
            {flatList.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Hash className="h-8 w-8 text-slate-700" />
                <p className="text-sm text-slate-500">No results for &quot;{query}&quot;</p>
                <p className="text-xs text-slate-600">Try a different search term</p>
              </div>
            ) : (
              <>
                {sectionOrder.map(sectionKey => {
                  const cmds = sections[sectionKey]
                  if (!cmds?.length) return null
                  // If query is active, don't show section headers
                  const showHeader = !query.trim() || sectionKey !== 'navigation'
                  return (
                    <div key={sectionKey}>
                      {showHeader && (
                        <div className="flex items-center gap-2 px-4 py-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                            {SECTION_LABELS[sectionKey]}
                          </span>
                          {sectionKey === 'recent' && (
                            <Clock className="h-3 w-3 text-slate-700" />
                          )}
                        </div>
                      )}
                      {cmds.map(cmd => {
                        const idx = flatList.findIndex(c => c.id === cmd.id && c.section === cmd.section)
                        const isSelected = idx === selected
                        const Icon = cmd.icon
                        return (
                          <button
                            key={`${cmd.section}-${cmd.id}`}
                            data-idx={idx}
                            onClick={() => execute(cmd)}
                            onMouseEnter={() => setSelected(idx)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              isSelected
                                ? 'bg-teal-500/10 text-teal-300'
                                : 'text-slate-300 hover:bg-[rgba(255,255,255,0.03)]'
                            }`}
                          >
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                              isSelected ? 'bg-teal-500/20' : 'bg-[rgba(148,163,184,0.06)]'
                            }`}>
                              <Icon size={15} className={isSelected ? 'text-teal-400' : 'text-slate-400'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-none">{cmd.label}</p>
                              {cmd.description && (
                                <p className="mt-0.5 text-xs text-slate-500 truncate" title={cmd.description}>{cmd.description}</p>
                              )}
                            </div>
                            {isSelected && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-teal-400" />}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </>
            )}
          </div>

          {/* Footer hints */}
          <div className="flex items-center gap-4 border-t border-[rgba(148,163,184,0.08)] px-4 py-2">
            <span className="text-[10px] text-slate-600">↑↓ navigate</span>
            <span className="text-[10px] text-slate-600">↵ open</span>
            <span className="text-[10px] text-slate-600">esc close</span>
            <span className="ml-auto text-[10px] text-slate-600">⌘K to toggle</span>
          </div>
        </div>
      </div>
    </div>
  )
}
