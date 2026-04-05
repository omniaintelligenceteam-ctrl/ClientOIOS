// ============================================================
// POST /api/automations/execute
// Internal endpoint — secured by CRON_SECRET Bearer token.
// Fetches a queue item, renders the email template directly,
// sends via Resend, logs to automation_log, updates queue
// status, and creates a notification.
// ============================================================

import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import {
  follow_up_email,
  review_request,
  invoice_reminder,
  lead_nurture,
  appointment_reminder,
  prospect_outreach,
  type AutomationContext,
} from '@/lib/automation-templates'

// ---------------------------------------------------------------------------
// Service-role Supabase client (bypasses RLS for internal execution)
// ---------------------------------------------------------------------------

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ---------------------------------------------------------------------------
// Template dispatcher
// ---------------------------------------------------------------------------

function getTemplate(actionType: string, context: AutomationContext) {
  switch (actionType) {
    case 'follow_up_email':
      return follow_up_email(context)
    case 'review_request':
      return review_request(context)
    case 'invoice_reminder':
      return invoice_reminder(context)
    case 'lead_nurture':
      return lead_nurture(context)
    case 'appointment_reminder':
      return appointment_reminder(context)
    case 'prospect_outreach':
      return prospect_outreach(context)
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Send email via Resend
// ---------------------------------------------------------------------------

async function sendEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<{ id?: string; error?: string }> {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })

  try {
    const info = await transporter.sendMail({
      from: `"OIOS Team" <team@oioscoo.com>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })
    return { id: info.messageId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: msg }
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // ── Security: verify CRON_SECRET Bearer token ─────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    const isDev = process.env.NODE_ENV === 'development'
    if (!isDev && authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = getSupabase() as any

  let queueItemId: string | undefined

  try {
    const body = await request.json() as { queue_item_id: string }
    queueItemId = body.queue_item_id

    if (!queueItemId) {
      return Response.json({ error: 'queue_item_id is required' }, { status: 400 })
    }

    // ── 1. Fetch the queue item ─────────────────────────────────────────
    const { data: queueItem, error: queueError } = await svc
      .from('automation_queue')
      .select('*')
      .eq('id', queueItemId)
      .single()

    if (queueError || !queueItem) {
      return Response.json({ error: 'Queue item not found' }, { status: 404 })
    }

    if (queueItem.status !== 'approved' && queueItem.status !== 'pending') {
      return Response.json(
        { error: `Queue item status is "${queueItem.status}" — only approved or pending items can be executed` },
        { status: 400 }
      )
    }

    // ── 2. Fetch organization name for context ──────────────────────────
    const { data: org } = await svc
      .from('organizations')
      .select('name')
      .eq('id', queueItem.organization_id)
      .single()

    const businessName: string = org?.name ?? 'OIOS Business'

    // ── 3. Build context from queue item payload ────────────────────────
    const payload = (queueItem.payload ?? {}) as Record<string, unknown>
    const context: AutomationContext = {
      businessName,
      customerName: (payload.customer_name as string) || 'Valued Customer',
      customerEmail: (payload.customer_email as string) || '',
      metadata: (payload.metadata as Record<string, unknown>) ?? payload,
    }

    const targetContact = context.customerEmail
    const targetName = context.customerName

    if (!targetContact) {
      const errMsg = 'No customer email found in queue item payload'
      console.error(`[automations/execute] ${errMsg} — queue item ${queueItemId}`)

      await svc
        .from('automation_queue')
        .update({ status: 'failed', error: errMsg, executed_at: new Date().toISOString() })
        .eq('id', queueItemId)

      await svc.from('automation_log').insert({
        organization_id: queueItem.organization_id,
        queue_id: queueItemId,
        rule_id: queueItem.rule_id ?? null,
        action: queueItem.action_type,
        status: 'failed',
        detail: errMsg,
        metadata: { target_name: targetName, target_contact: '' },
      })

      return Response.json({ error: errMsg }, { status: 422 })
    }

    // ── 4. Render email template ───────────────────────────────────────
    const template = getTemplate(queueItem.action_type, context)
    if (!template) {
      const errMsg = `Unknown action_type: ${queueItem.action_type}`

      await svc
        .from('automation_queue')
        .update({ status: 'failed', error: errMsg, executed_at: new Date().toISOString() })
        .eq('id', queueItemId)

      await svc.from('automation_log').insert({
        organization_id: queueItem.organization_id,
        queue_id: queueItemId,
        rule_id: queueItem.rule_id ?? null,
        action: queueItem.action_type,
        status: 'failed',
        detail: errMsg,
        metadata: { target_name: targetName, target_contact: targetContact },
      })

      return Response.json({ error: errMsg }, { status: 400 })
    }

    // ── 5. Send email via Resend ─────────────────────────────────────────
    const sendResult = await sendEmail({
      to: targetContact,
      subject: template.subject,
      html: template.html,
    })

    const now = new Date().toISOString()

    if (sendResult.error) {
      console.error('[automations/execute] Resend error:', sendResult.error)

      await svc
        .from('automation_queue')
        .update({
          status: 'failed',
          error: `Send error: ${sendResult.error}`,
          executed_at: now,
        })
        .eq('id', queueItemId)

      await svc.from('automation_log').insert({
        organization_id: queueItem.organization_id,
        queue_id: queueItemId,
        rule_id: queueItem.rule_id ?? null,
        action: queueItem.action_type,
        status: 'failed',
        detail: `Send error: ${sendResult.error}`,
        metadata: { target_name: targetName, target_contact: targetContact },
      })

      // Notify org about failure
      await svc.from('notifications').insert({
        organization_id: queueItem.organization_id,
        user_id: null,
        type: 'automation_completed',
        title: 'Automation failed to send',
        body: `Could not send "${queueItem.action_type}" email to ${targetName}: ${sendResult.error}`,
        icon: 'AlertCircle',
        href: '/dashboard/automations',
      })

      return Response.json({ error: 'Email delivery failed', detail: sendResult.error }, { status: 502 })
    }

    // ── 6. Success: update queue item, log, notify ───────────────────────
    await svc
      .from('automation_queue')
      .update({ status: 'executed', executed_at: now })
      .eq('id', queueItemId)

    await svc.from('automation_log').insert({
      organization_id: queueItem.organization_id,
      queue_id: queueItemId,
      rule_id: queueItem.rule_id ?? null,
      action: queueItem.action_type,
      status: 'sent',
      detail: `Email sent via Gmail${sendResult.id ? ` (id: ${sendResult.id})` : ''}`,
      metadata: { target_name: targetName, target_contact: targetContact },
    })

    await svc.from('notifications').insert({
      organization_id: queueItem.organization_id,
      user_id: null,
      type: 'automation_completed',
      title: 'Automation email sent',
      body: `"${queueItem.action_type}" email was sent to ${targetName} (${targetContact})`,
      icon: 'CheckCircle',
      href: '/dashboard/automations',
    })

    console.log(`[automations/execute] Success — queue item ${queueItemId} executed, Resend id: ${sendResult.id}`)

    return Response.json({
      success: true,
      queue_item_id: queueItemId,
      resend_id: sendResult.id ?? null,
      action_type: queueItem.action_type,
      sent_to: targetContact,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[automations/execute] Unexpected error:', err)

    // Best-effort: mark queue item as failed if we have its id
    if (queueItemId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (getSupabase() as any)
          .from('automation_queue')
          .update({ status: 'failed', error: message, executed_at: new Date().toISOString() })
          .eq('id', queueItemId)
      } catch {
        // swallow — original error is more important
      }
    }

    return Response.json({ error: 'Internal server error', detail: message }, { status: 500 })
  }
}
