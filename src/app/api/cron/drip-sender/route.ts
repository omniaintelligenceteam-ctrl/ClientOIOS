// ============================================================
// OIOS Drip Sender — Sends 1 queued email per minute
// Runs every minute via Vercel Cron.
// Picks the oldest approved item past its scheduled_for time
// and fires the execute endpoint. Rate limit: 1 email/minute.
// ============================================================

import { createSupabaseServiceClient } from '@/lib/supabase-server'

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
  if (process.env.NODE_ENV === 'development') return true
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

async function fireExecute(queueItemId: string): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  try {
    const resp = await fetch(`${baseUrl}/api/automations/execute`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ queue_item_id: queueItemId }),
    })
    const data = await resp.json()
    if (!resp.ok) return { success: false, error: data.error || `HTTP ${resp.status}` }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createSupabaseServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = supabase as any

  // Pick the single oldest approved item that's past its scheduled time
  const { data: item, error } = await svc
    .from('automation_queue')
    .select('id, action_type, payload')
    .eq('status', 'approved')
    .is('executed_at', null)
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(1)
    .single()

  if (error || !item) {
    return Response.json({ sent: 0, message: 'No items ready to send' })
  }

  const email = (item.payload as Record<string, unknown>)?.customer_email as string
  const result = await fireExecute(item.id)

  if (result.success) {
    console.log(`[drip-sender] Sent ${item.action_type} to ${email}`)
    return Response.json({ sent: 1, action_type: item.action_type, to: email })
  } else {
    console.error(`[drip-sender] Failed ${item.action_type} to ${email}: ${result.error}`)
    return Response.json({ sent: 0, error: result.error, action_type: item.action_type, to: email })
  }
}

export async function GET(request: Request) {
  return POST(request)
}
