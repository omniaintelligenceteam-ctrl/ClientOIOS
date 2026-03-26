// Phase Theta: Command Palette
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowRight, Zap, MessageSquare, Users, Calendar, BarChart3, Settings } from 'lucide-react'

const ACTIONS = [
  { id: 'dashboard', label: 'Go to Dashboard', icon: BarChart3, path: '/dashboard' },
  { id: 'leads', label: 'Go to Leads', icon: Users, path: '/dashboard' },
  { id: 'calendar', label: 'Go to Calendar', icon: Calendar, path: '/dashboard/calendar' },
  { id: 'ai', label: 'Open AI Assistant', icon: Zap, path: '/dashboard/ai' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/dashboard' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const filtered = ACTIONS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))

  const close = useCallback(() => { setOpen(false); setQuery(''); setSelected(0) }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(true) }
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close])

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  const navigate = (path: string) => { router.push(path); close() }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') setSelected((s) => Math.min(s + 1, filtered.length - 1))
    if (e.key === 'ArrowUp') setSelected((s) => Math.max(s - 1, 0))
    if (e.key === 'Enter' && filtered[selected]) navigate(filtered[selected].path)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200]" onClick={close}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg">
        <div className="panel p-0 overflow-hidden animate-chat-slide-up" onClick={(e) => e.stopPropagation()}>
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(0) }}
              onKeyDown={handleKey}
              placeholder="Search pages, actions..."
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
            <button onClick={close} className="text-slate-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Results */}
          <div className="max-h-64 overflow-y-auto py-2">
            {filtered.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No results for &quot;{query}&quot;</p>
            )}
            {filtered.map((action, i) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={() => navigate(action.path)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selected ? 'bg-teal-500/10 text-teal-400' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm flex-1">{action.label}</span>
                  {i === selected && <ArrowRight className="h-3 w-3 text-teal-400" />}
                </button>
              )
            })}
          </div>
          <div className="px-4 py-2 border-t border-slate-700/50 flex gap-4 text-[10px] text-slate-600">
            <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
          </div>
        </div>
      </div>
    </div>
  )
}
