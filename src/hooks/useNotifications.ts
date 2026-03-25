import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'

export interface AppNotification {
  id: string
  organization_id: string
  user_id: string | null
  type: string
  title: string
  body: string
  icon: string | null
  href: string | null
  metadata: Record<string, unknown>
  read: boolean
  pushed: boolean
  created_at: string
}

interface UseNotificationsReturn {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  markAsRead: (ids: string[]) => Promise<void>
  markAllAsRead: () => Promise<void>
}

export function useNotifications(organizationId: string, userId: string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId || !userId) return

    const supabase = createSupabaseBrowserClient()
    if (!supabase) return

    // Initial fetch
    async function fetchNotifications() {
      setLoading(true)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data) {
        setNotifications(data as AppNotification[])
      }
      setLoading(false)
    }

    fetchNotifications()

    // Realtime subscription
    const channel = supabase
      .channel(`notifications:org:${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const newNotification = payload.new as AppNotification
          // Only include if targeted to this user or broadcast
          if (newNotification.user_id === null || newNotification.user_id === userId) {
            setNotifications((prev) => [newNotification, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId, userId])

  const markAsRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
    )

    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
  }, [])

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    await markAsRead(unreadIds)
  }, [notifications, markAsRead])

  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead }
}
