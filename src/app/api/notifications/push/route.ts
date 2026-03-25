import webpush from 'web-push'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

webpush.setVapidDetails(
  'mailto:admin@getoios.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

function isInQuietHours(
  now: Date,
  timezone: string,
  quietStart: string | null,
  quietEnd: string | null
): boolean {
  if (!quietStart || !quietEnd) return false

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    })
    const parts = formatter.formatToParts(now)
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0')
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0')
    const currentMinutes = hour * 60 + minute

    const [startH, startM] = quietStart.split(':').map(Number)
    const [endH, endM] = quietEnd.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes
    } else {
      // Wraps midnight
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    }
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    // Verify internal secret
    const authHeader = request.headers.get('authorization')
    const internalSecret = process.env.INTERNAL_API_SECRET
    if (internalSecret && authHeader !== `Bearer ${internalSecret}`) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      userId,
      organizationId,
      title,
      body: notificationBody,
      href = '/dashboard',
      icon = '/icon-192.png',
    } = body as {
      userId?: string
      organizationId: string
      title: string
      body: string
      href?: string
      icon?: string
    }

    if (!organizationId || !title || !notificationBody) {
      return Response.json(
        { error: 'organizationId, title, and body are required' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = supabase as any

    // Fetch target subscriptions
    let subscriptionsQuery = svc
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, user_id')
      .eq('organization_id', organizationId)

    if (userId) {
      subscriptionsQuery = subscriptionsQuery.eq('user_id', userId)
    }

    const { data: subscriptions, error: subError } = await subscriptionsQuery

    if (subError) {
      return Response.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return Response.json({ sent: 0, failed: 0 })
    }

    // Fetch org for timezone
    const { data: org } = await svc
      .from('organizations')
      .select('timezone, quiet_hours_start, quiet_hours_end')
      .eq('id', organizationId)
      .single()

    const timezone = org?.timezone ?? 'America/New_York'
    const quietStart = org?.quiet_hours_start ?? null
    const quietEnd = org?.quiet_hours_end ?? null
    const now = new Date()

    const payload = JSON.stringify({ title, body: notificationBody, icon, href })

    let sent = 0
    let failed = 0
    const expiredEndpoints: string[] = []

    await Promise.all(
      subscriptions.map(
        async (sub: { id: string; endpoint: string; p256dh: string; auth: string; user_id: string }) => {
          // Check quiet hours
          if (isInQuietHours(now, timezone, quietStart, quietEnd)) {
            failed++
            return
          }

          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload
            )
            sent++
          } catch (err: unknown) {
            const statusCode = (err as { statusCode?: number })?.statusCode
            if (statusCode === 410 || statusCode === 404) {
              expiredEndpoints.push(sub.endpoint)
            }
            failed++
          }
        }
      )
    )

    // Remove expired subscriptions
    if (expiredEndpoints.length > 0) {
      await svc.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
    }

    // Mark associated notification record as pushed (if notification row exists)
    // The caller is responsible for inserting the notification row separately;
    // we update any matching unpushed notification for this org here.
    if (sent > 0) {
      await svc
        .from('notifications')
        .update({ pushed: true })
        .eq('organization_id', organizationId)
        .eq('pushed', false)
        .eq('title', title)
    }

    return Response.json({ sent, failed })
  } catch (err) {
    console.error('Push POST error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
