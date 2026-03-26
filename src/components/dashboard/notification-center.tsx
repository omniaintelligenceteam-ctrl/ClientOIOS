'use client'

import { useState, useEffect, useRef } from 'react'
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
  Settings,
  X,
  Check,
  AlertCircle,
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationSettings } from '@/components/dashboard/notifications/notification-settings'
import type { AppNotification, NotificationType } from '@/lib/types'

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 172800) return 'Yesterday'
  return `${Math.floor(seconds / 86400)}d ago`
}

function isToday(date: string): boolean {
  const d = new Date(date)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

function isYesterday(date: string): boolean {
  const d = new Date(date)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  )
}

/* ------------------------------------------------------------------ */
/*  Icon mapping                                                        */
/* ------------------------------------------------------------------ */

const TYPE_ICONS: Record<string, React.ElementType> = {
  call_answered: Phone,
  lead_created: Target,
  briefing_ready: Sun,
  invoice_paid: DollarSign,
  review_received: Star,
  automation_completed: Zap,
  missed_call: PhoneMissed,
  invoice_overdue: Receipt,
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

const TYPE_CATEGORIES: Record<string, string[]> = {
  All: [],
  Leads: ['lead_created'],
  Calls: ['call_answered', 'missed_call'],
  Billing: ['invoice_paid', 'invoice_overdue'],
  System: ['briefing_ready', 'automation_completed', 'overdue_followup', 'review_received', 'system'],
}

/* ------------------------------------------------------------------ */
/*  Notification Item                                                   */
/* ------------------------------------------------------------------ */

function NotificationItem({
  notification,
  onRead,
  onDelete,
}: {
  notification: AppNotification
  onRead: (ids: string[]) => Promise<void>
  onDelete: (id: string) => Promise<void>
  key?: string
}) {
  const Icon = TYPE_ICONS[notification.type] ?? Bell
  const colorClass = TYPE_COLORS[notification.type] ?? 'text-slate-400 bg-slate-400/10'

  function handleClick() {
    if (!notification.read) {
      onRead([notification.id])
    }
    if (notification.href) {
      window.location.href = notification.href
    }
  }

  return (
    <div className="group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04]">
      {/* Icon */}
      <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${colorClass}`}>
        <Icon size={16} />
      </div>

      {/* Unread dot */}
      <div className="absolute left-0 top-1/2 flex h-full w-1 -translate-y-1/2 items-center justify-center">
        {!notification.read && <span className="h-2 w-1 rounded-r-full bg-[#2DD4BF]" />}
      </div>

      {/* Content */}
      <button
        type="button"
        onClick={handleClick}
        className="flex-1 overflow-hidden text-left"
      >
        <p
          className={`truncate text-sm font-semibold ${
            notification.read ? 'text-[#94A3B8]' : 'text-[#F8FAFC]'
          }`}
          title={notification.title}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-[#64748B]" title={notification.body}>{notification.body}</p>
      </button>

      {/* Time + delete */}
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <span className="text-[10px] text-[#64748B]">{timeAgo(notification.created_at)}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(notification.id) }}
          className="rounded p-0.5 text-[#64748B] opacity-0 transition-opacity hover:bg-white/10 hover:text-red-400 group-hover:opacity-100"
          title="Dismiss"
          aria-label="Dismiss notification"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Group Divider                                                       */
/* ------------------------------------------------------------------ */

function GroupLabel({ label }: { label: string }) {
  return (
    <div className="px-4 pb-1 pt-3">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#64748B]">
        {label}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                    */
/* ------------------------------------------------------------------ */

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="h-9 w-9 animate-pulse rounded-full bg-white/5" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-white/5" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
      </div>
      <div className="h-3 w-10 animate-pulse rounded bg-white/5 pt-1" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Filter Tabs                                                         */
/* ------------------------------------------------------------------ */

type FilterTab = 'All' | 'Leads' | 'Calls' | 'Billing' | 'System'

/* ------------------------------------------------------------------ */
/*  Notification Center                                                 */
/* ------------------------------------------------------------------ */

interface NotificationCenterProps {
  organizationId: string
  userId: string
}

export function NotificationCenter({ organizationId, userId }: NotificationCenterProps) {
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<FilterTab>('All')
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications(organizationId, userId)

  /* Close on outside click */
  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  /* Group + filter notifications */
  const filtered =
    activeTab === 'All'
      ? notifications
      : notifications.filter((n) => TYPE_CATEGORIES[activeTab]?.includes(n.type))

  const todayItems = filtered.filter((n) => isToday(n.created_at))
  const yesterdayItems = filtered.filter((n) => isYesterday(n.created_at))
  const olderItems = filtered.filter(
    (n) => !isToday(n.created_at) && !isYesterday(n.created_at)
  )

  const hasNotifications = todayItems.length > 0 || yesterdayItems.length > 0 || olderItems.length > 0

  async function handleMarkAllAsRead() {
    await markAllAsRead()
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev: boolean) => !prev)}
        className="relative rounded-md p-2 text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#f97316] px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2 w-[380px] rounded-2xl border border-white/[0.06] bg-white/[0.03] shadow-xl shadow-black/50"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.1)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#F8FAFC]">Notifications</span>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f97316] px-1.5 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="rounded-md px-2 py-1 text-xs text-[#2DD4BF] transition-colors hover:bg-[#2DD4BF]/10"
                  title="Mark all as read"
                >
                  <Check size={13} className="inline-block" /> All read
                </button>
              )}
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="rounded-md p-1.5 text-[#64748B] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
                title="Notification settings"
              >
                <Settings size={15} />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-0.5 border-b border-[rgba(148,163,184,0.08)] px-2 py-1.5 overflow-x-auto">
            {(['All', 'Leads', 'Calls', 'Billing', 'System'] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-[#2DD4BF]/10 text-[#2DD4BF]'
                    : 'text-[#64748B] hover:bg-white/[0.04] hover:text-[#94A3B8]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div>
                <NotificationSkeleton />
                <NotificationSkeleton />
                <NotificationSkeleton />
              </div>
            ) : !hasNotifications ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-3 text-3xl">🎉</div>
                <p className="text-sm font-medium text-[#94A3B8]">All caught up!</p>
                <p className="mt-1 text-xs text-[#64748B]">No notifications here yet</p>
              </div>
            ) : (
              <>
                {todayItems.length > 0 && (
                  <>
                    <GroupLabel label="Today" />
                    {todayItems.map((n) => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onRead={markAsRead}
                        onDelete={deleteNotification}
                      />
                    ))}
                  </>
                )}
                {yesterdayItems.length > 0 && (
                  <>
                    <GroupLabel label="Yesterday" />
                    {yesterdayItems.map((n) => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onRead={markAsRead}
                        onDelete={deleteNotification}
                      />
                    ))}
                  </>
                )}
                {olderItems.length > 0 && (
                  <>
                    <GroupLabel label="Older" />
                    {olderItems.map((n) => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onRead={markAsRead}
                        onDelete={deleteNotification}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-[rgba(148,163,184,0.1)] px-4 py-2 text-center">
              <a
                href="/dashboard/notifications"
                className="text-xs text-[#2DD4BF] transition-colors hover:text-[#5EEAD4]"
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}

      {/* Settings slide-over */}
      {settingsOpen && (
        <NotificationSettings onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  )
}
