'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'

export interface SidebarBadges {
  /** href -> badge count */
  counts: Record<string, number>
  /** href -> urgent flag (red dot) */
  urgent: Record<string, boolean>
}

const EMPTY: SidebarBadges = { counts: {}, urgent: {} }

export function useSidebarBadges(): SidebarBadges {
  const { organization, profile, isDemoMode } = useAuth()
  const [badges, setBadges] = useState<SidebarBadges>(EMPTY)

  useEffect(() => {
    const orgId = organization?.id
    const userId = profile?.id
    if (!orgId) return

    // In demo mode, return realistic static badges — skip DB queries
    if (isDemoMode) {
      setBadges({
        counts: {
          '/dashboard/calls': 2,
          '/dashboard/leads': 5,
          '/dashboard/invoicing': 4,
        },
        urgent: {
          '/dashboard/calls': true,
          '/dashboard/invoicing': true,
        },
      })
      return
    }

    const supabase = createSupabaseBrowserClient()
    if (!supabase) return

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayISO = todayStart.toISOString()

    async function fetchBadges() {
      // Missed calls today
      const { count: missedCalls } = await supabase
        .from('calls')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'missed')
        .gte('started_at', todayISO)

      // New leads today
      const { count: newLeads } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'new')
        .gte('created_at', todayISO)

      // Overdue invoices
      const { count: overdueInvoices } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'overdue')

      // Unread notifications
      const { count: unreadNotifs } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .or(`user_id.eq.${userId},user_id.is.null`)
        .eq('read', false)

      setBadges({
        counts: {
          '/dashboard/calls': missedCalls ?? 0,
          '/dashboard/leads': newLeads ?? 0,
          '/dashboard/invoicing': overdueInvoices ?? 0,
        },
        urgent: {
          '/dashboard/calls': (missedCalls ?? 0) > 0,
          '/dashboard/invoicing': (overdueInvoices ?? 0) > 0,
        },
      })
    }

    fetchBadges()

    // Realtime: calls
    const callsChannel = supabase
      .channel(`sidebar-badges-calls:${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls', filter: `organization_id=eq.${orgId}` },
        () => fetchBadges()
      )
      .subscribe()

    // Realtime: leads
    const leadsChannel = supabase
      .channel(`sidebar-badges-leads:${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads', filter: `organization_id=eq.${orgId}` },
        () => fetchBadges()
      )
      .subscribe()

    // Realtime: invoices
    const invoicesChannel = supabase
      .channel(`sidebar-badges-invoices:${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices', filter: `organization_id=eq.${orgId}` },
        () => fetchBadges()
      )
      .subscribe()

    // Realtime: notifications
    const notifsChannel = supabase
      .channel(`sidebar-badges-notifs:${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `organization_id=eq.${orgId}` },
        () => fetchBadges()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(callsChannel)
      supabase.removeChannel(leadsChannel)
      supabase.removeChannel(invoicesChannel)
      supabase.removeChannel(notifsChannel)
    }
  }, [organization?.id, profile?.id])

  return badges
}
