'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Phone,
  PhoneMissed,
  Target,
  Sun,
  DollarSign,
  Star,
  Zap,
  Receipt,
  Clock,
  Check,
  CheckCheck,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import type { AppNotification, NotificationType } from '@/lib/types'

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const TYPE_ICONS: Record<string, React.ElementType> = {
  call_answered: Phone,
  missed_call: PhoneMissed,
  lead_created: Target,
  briefing_ready: Sun,
  invoice_paid: DollarSign,
  invoice_overdue: Receipt,
  review_received: Star,
  automation_completed: Zap,
  overdue_followup: Clock,
  system: Bell,
}

const TYPE_COLORS: Record<string, string> = {
  call_answered: 'text-green-400 bg-green-400/10',
  missed_call: 'text-red-400 bg-red-400/10',
  lead_created: 'text-blue-400 bg-blue-400/10',
  briefing_ready: 'text-yellow-400 bg-yellow-400/10',
  invoice_paid: 'text-emerald-400 bg-emerald-400/10',
  invoice_overdue: 'text-red-400 bg-red-400/10',
  review_received: 'text-purple-400 bg-purple-400/10',
  automation_completed: 'text-teal-400 bg-teal-400/10',
  overdue_followup: 'text-orange-400 bg-orange-400/10',
  system: 'text-slate-400 bg-slate-400/10',
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 172800) return 'Yesterday'
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function groupLabel(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return 'Earlier This Week'
  if (diffDays < 14) return 'Last Week'
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

type FilterTab = 'All' | 'Today' | 'This Week' | 'Unread'

const PAGE_SIZE = 25

/* ------------------------------------------------------------------ */
/*  Skeleton                                                            */
/* ------------------------------------------------------------------ */

function RowSkeleton() {
  return (
    <div className="flex items-start gap-4 px-6 py-4">
      <div className="h-10 w-10 animate-pulse rounded-full bg-white/5 flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3.5 w-1/2 animate-pulse rounded bg-white/5" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-white/5" />
      </div>
      <div className="h-3 w-16 animate-pulse rounded bg-white/5" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function NotificationsPage() {
  const { profile } = useAuth()
  const organizationId = profile?.organization_id || ''
  const userId = profile?.id || ''
  const router = useRouter()

  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('All')
  const [offset, setOffset] = useState(0)

  const fetchNotifications = useCallback(async (reset = false) => {
    if (!organizationId || !userId) return
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return

    const currentOffset = reset ? 0 : offset
    if (reset) setLoading(true)
    else setLoadingMore(true)

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('created_at', { ascending: false })
      .range(currentOffset, currentOffset + PAGE_SIZE - 1)

    const now = new Date()
    if (activeTab === 'Today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      query = query.gte('created_at', todayStart)
    } else if (activeTab === 'This Week') {
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
      query = query.gte('created_at', weekAgo)
    } else if (activeTab === 'Unread') {
      query = query.eq('read', false)
    }

    const { data, error } = await query

    if (!error && data) {
      if (reset) {
        setNotifications(data as unknown as AppNotification[])
        setOffset(data.length)
      } else {
        setNotifications((prev) => [...prev, ...(data as unknown as AppNotification[])])
        setOffset((prev) => prev + data.length)
      }
      setHasMore(data.length === PAGE_SIZE)
    }

    if (reset) setLoading(false)
    else setLoadingMore(false)
  }, [organizationId, userId, activeTab, offset])

  // Reset + fetch on tab change
  useEffect(() => {
    setOffset(0)
    setHasMore(true)
    fetchNotifications(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, userId, activeTab])

  async function markAsRead(ids: string[]) {
    if (ids.length === 0) return
    setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)))
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return
    await supabase.from('notifications').update({ read: true }).in('id', ids)
  }

  async function markAllAsRead() {
    if (!organizationId) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('organization_id', organizationId)
      .eq('read', false)
  }

  function handleNotificationClick(n: AppNotification) {
    if (!n.read) markAsRead([n.id])
    if (n.href) router.push(n.href)
  }

  // Group by date label
  const grouped: { label: string; items: AppNotification[] }[] = []
  for (const n of notifications) {
    const label = groupLabel(n.created_at)
    const existing = grouped.find((g) => g.label === label)
    if (existing) existing.items.push(n)
    else grouped.push({ label, items: [n] })
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const TABS: FilterTab[] = ['All', 'Today', 'This Week', 'Unread']

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">Notifications</h1>
          {unreadCount > 0 && (
            <p className="mt-0.5 text-sm text-[#64748B]">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 rounded-lg border border-[rgba(45,212,191,0.3)] bg-[#2DD4BF]/10 px-3 py-2 text-sm font-medium text-[#2DD4BF] transition-colors hover:bg-[#2DD4BF]/20"
          >
            <CheckCheck size={15} />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl bg-[#111827] p-1 border border-[rgba(148,163,184,0.1)]">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-[#2DD4BF]/10 text-[#2DD4BF]'
                : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] overflow-hidden">
        {loading ? (
          <div>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 text-4xl">🎉</div>
            <p className="text-base font-semibold text-[#94A3B8]">All caught up!</p>
            <p className="mt-1 text-sm text-[#64748B]">No notifications match this filter.</p>
          </div>
        ) : (
          <div>
            {grouped.map((group, gi) => (
              <div key={group.label}>
                {/* Group label */}
                <div className={`px-6 py-2 ${gi > 0 ? 'border-t border-[rgba(148,163,184,0.06)]' : ''}`}>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#64748B]">
                    {group.label}
                  </span>
                </div>

                {/* Items */}
                {group.items.map((n) => {
                  const Icon = TYPE_ICONS[n.type] ?? Bell
                  const colorClass = TYPE_COLORS[n.type] ?? 'text-slate-400 bg-slate-400/10'
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className="flex w-full items-start gap-4 border-t border-[rgba(148,163,184,0.06)] px-6 py-4 text-left transition-colors hover:bg-white/[0.03]"
                    >
                      {/* Icon */}
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                        <Icon size={18} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          {!n.read && (
                            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#2DD4BF]" />
                          )}
                          <p className={`truncate text-sm font-semibold ${n.read ? 'text-[#94A3B8]' : 'text-[#F8FAFC]'}`}>
                            {n.title}
                          </p>
                        </div>
                        <p className="mt-0.5 text-sm text-[#64748B] line-clamp-2">{n.body}</p>
                      </div>

                      {/* Time + check */}
                      <div className="flex flex-shrink-0 flex-col items-end gap-2">
                        <span className="text-xs text-[#64748B]">{timeAgo(n.created_at)}</span>
                        {!n.read && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); markAsRead([n.id]) }}
                            className="rounded p-0.5 text-[#2DD4BF] transition-colors hover:bg-[#2DD4BF]/10"
                            title="Mark as read"
                          >
                            <Check size={13} />
                          </button>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="border-t border-[rgba(148,163,184,0.06)] p-4 text-center">
                <button
                  type="button"
                  onClick={() => fetchNotifications(false)}
                  disabled={loadingMore}
                  className="rounded-lg border border-[rgba(148,163,184,0.1)] px-4 py-2 text-sm text-[#94A3B8] transition-colors hover:bg-white/[0.04] hover:text-[#F8FAFC] disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
