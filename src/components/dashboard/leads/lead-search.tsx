'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Lead } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-400',
  contacted: 'bg-yellow-500/10 text-yellow-400',
  qualified: 'bg-teal-500/10 text-teal-400',
  proposal_sent: 'bg-purple-500/10 text-purple-400',
  won: 'bg-emerald-500/10 text-emerald-400',
  lost: 'bg-red-500/10 text-red-400',
  dormant: 'bg-slate-500/10 text-slate-400',
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#2DD4BF]/20 text-[#2DD4BF] rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function LeadSearch({
  organizationId,
  onSelect,
}: {
  organizationId: string
  onSelect: (lead: Lead) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createSupabaseBrowserClient()

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,service_needed.ilike.%${q}%`)
      .limit(5)
    setResults((data as unknown as Lead[]) ?? [])
    setOpen(true)
    setLoading(false)
    setActiveIdx(-1)
  }, [organizationId, supabase])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(results[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIdx(-1)
    }
  }

  const handleSelect = (lead: Lead) => {
    onSelect(lead)
    setQuery('')
    setResults([])
    setOpen(false)
    setActiveIdx(-1)
    inputRef.current?.blur()
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative flex items-center">
        <Search size={15} className="absolute left-3 text-slate-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder="Search leads..."
          className="h-10 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] pl-9 pr-8 text-sm text-[#F8FAFC] placeholder-slate-500 outline-none transition-colors focus:border-[#2DD4BF]/50"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
            className="absolute right-3 text-slate-500 hover:text-slate-300">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] shadow-2xl">
          {loading && (
            <div className="px-4 py-3 text-center text-xs text-slate-500">Searching...</div>
          )}
          {!loading && results.length === 0 && query && (
            <div className="px-4 py-4 text-center text-sm text-slate-500">No results for "{query}"</div>
          )}
          {!loading && results.map((lead, i) => (
            <button
              key={lead.id}
              onClick={() => handleSelect(lead)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                i === activeIdx ? 'bg-[#2DD4BF]/10' : 'hover:bg-white/[0.03]'
              } ${i < results.length - 1 ? 'border-b border-[rgba(148,163,184,0.06)]' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#F8FAFC]">
                  {highlight(`${lead.first_name} ${lead.last_name}`, query)}
                </p>
                <p className="text-xs text-slate-500">{highlight(lead.phone, query)}</p>
              </div>
              <span className={`inline-flex flex-shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLORS[lead.status] ?? 'bg-slate-500/10 text-slate-400'}`}>
                {lead.status.replace('_', ' ')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
