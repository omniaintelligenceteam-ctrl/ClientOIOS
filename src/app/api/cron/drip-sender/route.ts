// ============================================================
// OIOS Drip Sender — Sends 1 queued email per minute
// Runs every minute via Vercel Cron.
// Picks the oldest approved item past its scheduled_for time
// and fires the execute endpoint. Rate limit: 1 email/minute.
// ============================================================

import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { isCronAuthorized } from '@/lib/compliance'

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
  if (!isCronAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createSupabaseServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = supabase as any

  // Pick a small batch of approved items past their scheduled time. We walk
  // through them, skipping any on DNC/suppression lists, and fire the first
  // survivor. Batch of 5 avoids DNC-heavy orgs starving the sender.
  const { data: candidates, error } = await svc
    .from('automation_queue')
    .select('id, action_type, payload, organization_id')
    .eq('status', 'approved')
    .is('executed_at', null)
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(5)

  if (error || !candidates?.length) {
    return Response.json({ sent: 0, message: 'No items ready to send' })
  }

  for (const item of candidates as Array<{ id: string; action_type: string; organization_id: string; payload: Record<string, unknown> }>) {
    const email = (item.payload?.customer_email as string | undefined)?.toLowerCase()

    // DNC check before firing — defense-in-depth, execute route also checks
    if (email) {
      const { data: dncLead } = await svc
        .from('leads')
        .select('id')
        .eq('organization_id', item.organization_id)
        .eq('email', email)
        .eq('do_not_contact', true)
        .limit(1)
        .maybeSingle()

      if (dncLead) {
        await svc
          .from('automation_queue')
          .update({
            status: 'suppressed',
            error: 'Recipient on do_not_contact list',
            executed_at: new Date().toISOString(),
          })
          .eq('id', item.id)
        console.log(`[drip-sender] Skipped DNC ${email}`)
        continue
      }
    }

    const result = await fireExecute(item.id)

    if (result.success) {
      console.log(`[drip-sender] Sent ${item.action_type} to ${email}`)
      return Response.json({ sent: 1, action_type: item.action_type, to: email })
    } else {
      console.error(`[drip-sender] Failed ${item.action_type} to ${email}: ${result.error}`)
      return Response.json({ sent: 0, error: result.error, action_type: item.action_type, to: email })
    }
  }

  return Response.json({ sent: 0, message: 'All candidates filtered by DNC' })
}

export async function GET(request: Request) {
  return POST(request)
}
