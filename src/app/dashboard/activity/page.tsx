'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search, Download, Activity } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { ActivityFeedList, type ActivityFilters } from '@/components/dashboard/activity/activity-feed-list'

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

type EntityFilter = 'All' | 'Calls' | 'Leads' | 'Appointments' | 'Invoices' | 'Reviews' | 'Follow-ups'
type DateRange = 'today' | '7d' | '30d' | 'all'

const ENTITY_MAP: Record<string, string | undefined> = {
  All: undefined,
  Calls: 'call',
  Leads: 'lead',
  Appointments: 'appointment',
  Invoices: 'invoice',
  Reviews: 'review',
  'Follow-ups': 'follow_up',
}

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today',
  '7d': '7 Days',
  '30d': '30 Days',
  all: 'All Time',
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function ActivityPage() {
  const { profile } = useAuth()
  const organizationId = profile?.organization_id || ''

  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('All')
  const [dateRange, setDateRange] = useState<DateRange>('7d')
  const [exporting, setExporting] = useState(false)

  const filters: ActivityFilters = useMemo(() => ({
    entityType: ENTITY_MAP[entityFilter],
    dateRange: dateRange,
    search: search.trim() || undefined,
  }), [entityFilter, dateRange, search])

  const handleExport = useCallback(async () => {
    if (!organizationId) return
    setExporting(true)
    const supabase = createSupabaseBrowserClient()
    if (!supabase) { setExporting(false); return }

    let query = supabase
      .from('activity_feed')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(500)

    if (filters.entityType) query = query.eq('entity_type', filters.entityType)

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

    if (filters.search) {
      const term = `%${filters.search}%`
      query = query.or(`actor.ilike.${term},action.ilike.${term}`)
    }

    const { data } = await query

    if (data && data.length > 0) {
      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `activity-log-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    }

    setExporting(false)
  }, [organizationId, filters])

  const ENTITY_FILTERS: EntityFilter[] = ['All', 'Calls', 'Leads', 'Appointments', 'Invoices', 'Reviews', 'Follow-ups']
  const DATE_RANGES: DateRange[] = ['today', '7d', '30d', 'all']

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity size={22} className="text-[#2DD4BF]" />
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">Activity Log</h1>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 rounded-lg border border-[rgba(148,163,184,0.15)] bg-white/[0.03] px-3 py-2 text-sm text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC] disabled:opacity-50"
        >
          <Download size={15} />
          {exporting ? 'Exporting...' : 'Export JSON'}
        </button>
      </div>

      {/* Search + Date Range */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
          />
          <input
            type="text"
            placeholder="Search by actor or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-9 pr-3 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
          />
        </div>

        {/* Date range */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-1">
          {DATE_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDateRange(r)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                dateRange === r
                  ? 'bg-[#2DD4BF]/10 text-[#2DD4BF]'
                  : 'text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              {DATE_RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Entity filter chips */}
      <div className="flex flex-wrap gap-2">
        {ENTITY_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setEntityFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              entityFilter === f
                ? 'bg-[#2DD4BF] text-[#0B1120]'
                : 'border border-[rgba(148,163,184,0.15)] bg-white/[0.03] text-[#94A3B8] hover:border-[rgba(45,212,191,0.3)] hover:text-[#2DD4BF]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
        <ActivityFeedList
          organizationId={organizationId}
          filters={filters}
          pageSize={50}
        />
      </div>
    </div>
  )
}
