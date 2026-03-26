import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { AppNotification } from '@/lib/types'

interface UseNotificationsReturn {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  markAsRead: (ids: string[]) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  clearAll: () => Promise<void>
}

export function useNotifications(organizationId: string, userId: string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId || !userId) return

    const supabase = createSupabaseBrowserClient()
    if (!supabase) return

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
        setNotifications(data as unknown as AppNotification[])
      }
      setLoading(false)
    }

    fetchNotifications()

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
        (payload: { new: Record<string, unknown> }) => {
          const newNotification = payload.new as unknown as AppNotification
          if (newNotification.user_id === null || newNotification.user_id === userId) {
            setNotifications((prev: import('@/lib/types').AppNotification[]) => {
              if (prev.some((n) => n.id === newNotification.id)) return prev
              return [newNotification, ...prev]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const updated = payload.new as unknown as AppNotification
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload: { old: Record<string, unknown> }) => {
          const deletedId = payload.old.id as string
          setNotifications((prev) => prev.filter((n) => n.id !== deletedId))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId, userId])

  const markAsRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
    )
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return
    await supabase.from('notifications').update({ read: true }).in('id', ids)
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!organizationId) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('organization_id', organizationId)
      .eq('read', false)
  }, [organizationId])

  const deleteNotification = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return
    await supabase.from('notifications').delete().eq('id', id)
  }, [])

  const clearAll = useCallback(async () => {
    if (!organizationId) return
    setNotifications([])
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return
    await supabase.from('notifications').delete().eq('organization_id', organizationId)
  }, [organizationId])

  const unreadCount = notifications.filter((n) => !n.read).length

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, clearAll }
}
