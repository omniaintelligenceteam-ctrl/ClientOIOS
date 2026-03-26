'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Phone,
  Target,
  CalendarCheck,
  Receipt,
  Star,
  GitMerge,
  Zap,
  Clock,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { ActivityFeedItem, Importance } from '@/lib/types'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface ActivityFilters {
  entityType?: string
  dateRange?: 'today' | '7d' | '30d' | 'all'
  search?: string
}

interface ActivityFeedListProps {
  organizationId: string
  filters?: ActivityFilters
  pageSize?: number
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const ENTITY_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  lead: Target,
  appointment: CalendarCheck,
  invoice: Receipt,
  review: Star,
  follow_up: Clock,
  automation: Zap,
  pipeline: GitMerge,
}

const ENTITY_COLORS: Record<string, string> = {
  call: 'text-green-400 bg-green-400/10',
  lead: 'text-blue-400 bg-blue-400/10',
  appointment: 'text-purple-400 bg-purple-400/10',
  invoice: 'text-emerald-400 bg-emerald-400/10',
  review: 'text-yellow-400 bg-yellow-400/10',
  follow_up: 'text-orange-400 bg-orange-400/10',
  automation: 'text-teal-400 bg-teal-400/10',
  pipeline: 'text-indigo-400 bg-indigo-400/10',
}

const IMPORTANCE_BADGE: Record<Importance, { label: string; cls: string }> = {
  low: { label: 'Low', cls: 'bg-slate-500/20 text-slate-400' },
  medium: { label: 'Medium', cls: 'bg-blue-500/20 text-blue-400' },
  high: { label: 'High', cls: 'bg-orange-500/20 text-orange-400' },
  critical: { label: 'Critical', cls: 'bg-red-500/20 text-red-400' },
}

function timeLabel(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  if (diffSecs < 60) return 'just now'
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/* ------------------------------------------------------------------ */
/*  Activity Row                                                        */
/* ------------------------------------------------------------------ */

function ActivityRow({ item }: { item: ActivityFeedItem }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = ENTITY_ICONS[item.entity_type] ?? Activity
  const colorClass = ENTITY_COLORS[item.entity_type] ?? 'text-slate-400 bg-slate-400/10'
  const importance = IMPORTANCE_BADGE[item.importance] ?? IMPORTANCE_BADGE.low
  const hasMetadata = item.metadata && Object.keys(item.metadata).length > 0

  return (
    <div className="group relative pl-10">
      {/* Timeline line */}
      <div className="absolute inset-y-0 left-4 w-px bg-[rgba(148,163,184,0.1)]" />

      {/* Timeline dot */}
      <div className={`absolute left-2.5 top-4 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[#111827] ${colorClass}`}>
        <span className="block h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      </div>

      {/* Card */}
      <div className="mb-1 rounded-xl border border-[rgba(148,163,184,0.07)] bg-[rgba(255,255,255,0.02)] transition-colors hover:bg-[rgba(255,255,255,0.04)]">
        <button
          type="button"
          onClick={() => hasMetadata && setExpanded((e) => !e)}
          className="flex w-full items-start gap-3 px-4 py-3 text-left"
        >
          {/* Icon */}
          <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
            <Icon size={14} />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium text-[#F8FAFC]">{item.actor}</span>
              <span className="text-sm text-[#94A3B8]">{item.action}</span>
              {item.importance !== 'low' && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${importance.cls}`}>
                  {importance.label}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[#64748B]">{timeLabel(item.created_at)}</p>
          </div>

          {/* Expand toggle */}
          {hasMetadata && (
            <div className="flex-shrink-0 text-[#64748B] opacity-0 transition-opacity group-hover:opacity-100">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          )}
        </button>

        {/* Expanded metadata */}
        {expanded && hasMetadata && (
          <div className="border-t border-[rgba(148,163,184,0.08)] px-4 py-3">
            <pre className="overflow-x-auto rounded-lg bg-[#0B1120] p-3 text-xs text-[#94A3B8]">
              {JSON.stringify(item.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                            */
/* ------------------------------------------------------------------ */

function ActivitySkeleton() {
  return (
    <div className="relative pl-10">
      <div className="absolute inset-y-0 left-4 w-px bg-[rgba(148,163,184,0.1)]" />
      <div className="absolute left-2.5 top-4 h-3.5 w-3.5 animate-pulse rounded-full bg-white/10" />
      <div className="mb-1 rounded-xl border border-[rgba(148,163,184,0.07)] p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-white/5 flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-white/5" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

export function ActivityFeedList({ organizationId, filters = {}, pageSize = 50 }: ActivityFeedListProps) {
  const [items, setItems] = useState<ActivityFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  const fetchItems = useCallback(async (reset = false) => {
    if (!organizationId) return
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return

    const currentOffset = reset ? 0 : offset
    if (reset) setLoading(true)
    else setLoadingMore(true)

    let query = supabase
      .from('activity_feed')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(currentOffset, currentOffset + pageSize - 1)

    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType)
    }

    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date()
      let cutoff: Date
      if (filters.dateRange === 'today') {
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      } else if (filters.dateRange === '7d') {
        cutoff = new Date(now.getTime() - 7 * 86400000)
      } else {
        cutoff = new Date(now.getTime() - 30 * 86400000)
      }
      query = query.gte('created_at', cutoff.toISOString())
    }

    if (filters.search && filters.search.trim() !== '') {
      const term = `%${filters.search.trim()}%`
      query = query.or(`actor.ilike.${term},action.ilike.${term}`)
    }

    const { data, error } = await query

    if (!error && data) {
      if (reset) {
        setItems(data as unknown as ActivityFeedItem[])
        setOffset(data.length)
      } else {
        setItems((prev) => [...prev, ...(data as unknown as ActivityFeedItem[])])
        setOffset((prev) => prev + data.length)
      }
      setHasMore(data.length === pageSize)
    }

    if (reset) setLoading(false)
    else setLoadingMore(false)
  }, [organizationId, filters, pageSize, offset])

  useEffect(() => {
    setOffset(0)
    setHasMore(true)
    fetchItems(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, filters.entityType, filters.dateRange, filters.search])

  if (loading) {
    return (
      <div className="space-y-0.5 pt-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <ActivitySkeleton key={i} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Activity size={36} className="mb-3 text-[#64748B]" />
        <p className="text-base font-semibold text-[#94A3B8]">No activity found</p>
        <p className="mt-1 text-sm text-[#64748B]">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-0.5 pt-2">
        {items.map((item) => (
          <ActivityRow key={item.id} item={item} />
        ))}
      </div>

      {hasMore && (
        <div className="pt-4 text-center">
          <button
            type="button"
            onClick={() => fetchItems(false)}
            disabled={loadingMore}
            className="rounded-lg border border-[rgba(148,163,184,0.1)] px-5 py-2 text-sm text-[#94A3B8] transition-colors hover:bg-white/[0.04] hover:text-[#F8FAFC] disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
