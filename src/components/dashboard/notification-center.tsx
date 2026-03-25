'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications, type AppNotification } from '@/hooks/useNotifications'

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
/*  Notification Item                                                   */
/* ------------------------------------------------------------------ */

function NotificationItem({
  notification,
  onRead,
}: {
  notification: AppNotification
  onRead: (ids: string[]) => Promise<void>
}) {
  function handleClick() {
    if (!notification.read) {
      onRead([notification.id])
    }
    if (notification.href) {
      window.location.href = notification.href
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
    >
      {/* Unread dot */}
      <div className="mt-1.5 flex-shrink-0">
        {!notification.read ? (
          <span className="block h-2 w-2 rounded-full bg-[#2DD4BF]" />
        ) : (
          <span className="block h-2 w-2" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <p
          className={`truncate text-sm font-semibold ${
            notification.read ? 'text-[#94A3B8]' : 'text-[#F8FAFC]'
          }`}
        >
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-[#64748B]">{notification.body}</p>
      </div>

      {/* Time */}
      <span className="flex-shrink-0 text-[10px] text-[#64748B]">
        {timeAgo(notification.created_at)}
      </span>
    </button>
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
/*  Notification Center                                                 */
/* ------------------------------------------------------------------ */

interface NotificationCenterProps {
  organizationId: string
  userId: string
}

export function NotificationCenter({ organizationId, userId }: NotificationCenterProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications(
    organizationId,
    userId
  )

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

  /* Group notifications */
  const todayItems = notifications.filter((n) => isToday(n.created_at))
  const yesterdayItems = notifications.filter((n) => isYesterday(n.created_at))
  const olderItems = notifications.filter(
    (n) => !isToday(n.created_at) && !isYesterday(n.created_at)
  )

  async function handleMarkAllAsRead() {
    await markAllAsRead()
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#f97316] px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2 w-96 rounded-2xl border border-[rgba(148,163,184,0.1)] bg-[#111827] shadow-lg shadow-black/40"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.1)] px-4 py-3">
            <span className="text-sm font-semibold text-[#F8FAFC]">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs text-[#2DD4BF] transition-colors hover:text-[#5EEAD4]"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-[#64748B]">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#64748B]">
                No notifications yet
              </p>
            ) : (
              <>
                {todayItems.length > 0 && (
                  <>
                    <GroupLabel label="Today" />
                    {todayItems.map((n) => (
                      <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
                    ))}
                  </>
                )}
                {yesterdayItems.length > 0 && (
                  <>
                    <GroupLabel label="Yesterday" />
                    {yesterdayItems.map((n) => (
                      <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
                    ))}
                  </>
                )}
                {olderItems.length > 0 && (
                  <>
                    <GroupLabel label="Older" />
                    {olderItems.map((n) => (
                      <NotificationItem key={n.id} notification={n} onRead={markAsRead} />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
