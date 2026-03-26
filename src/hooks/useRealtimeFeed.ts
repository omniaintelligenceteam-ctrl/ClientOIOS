'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { ActivityFeedItem } from '@/lib/types'

interface UseRealtimeFeedOptions {
  onCallInsert?: () => void
  onLeadInsert?: () => void
  onAppointmentInsert?: () => void
}

interface UseRealtimeFeedResult {
  activities: ActivityFeedItem[]
  connected: boolean
}

export function useRealtimeFeed(
  organizationId: string,
  options: UseRealtimeFeedOptions = {}
): UseRealtimeFeedResult {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!organizationId) return

    const supabase = createSupabaseBrowserClient()

    // Fetch initial 15 activity feed items (filtered by org)
    supabase
      .from('activity_feed')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(15)
      .then(({ data }: { data: unknown[] | null }) => {
        if (data) setActivities(data as ActivityFeedItem[])
      })
      .catch((err: unknown) => {
        console.error('Failed to fetch activity feed:', err)
      })

    // Subscribe to realtime changes (filtered by org)
    const channel = supabase
      .channel(`realtime-feed-${organizationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_feed', filter: `organization_id=eq.${organizationId}` },
        (payload: { new: Record<string, unknown> }) => {
          const item = payload.new as unknown as ActivityFeedItem
          setActivities((prev) =>
            [item, ...prev].slice(0, 15)
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'calls', filter: `organization_id=eq.${organizationId}` },
        () => {
          options.onCallInsert?.()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leads', filter: `organization_id=eq.${organizationId}` },
        () => {
          options.onLeadInsert?.()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments', filter: `organization_id=eq.${organizationId}` },
        () => {
          options.onAppointmentInsert?.()
        }
      )
      .subscribe((status: string) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  return { activities, connected }
}
