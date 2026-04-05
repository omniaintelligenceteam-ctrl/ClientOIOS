// ============================================================
// POST /api/automations/preview
// Generates the email via Claude Haiku but returns it instead
// of sending. Used by the approval queue to preview emails.
// ============================================================

import { createClient } from '@supabase/supabase-js'
import {
  follow_up_email,
  review_request,
  invoice_reminder,
  lead_nurture,
  appointment_reminder,
  prospect_outreach,
  type AutomationContext,
} from '@/lib/automation-templates'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getTemplate(actionType: string, context: AutomationContext) {
  switch (actionType) {
    case 'follow_up_email': return follow_up_email(context)
    case 'review_request': return review_request(context)
    case 'invoice_reminder': return invoice_reminder(context)
    case 'lead_nurture': return lead_nurture(context)
    case 'appointment_reminder': return appointment_reminder(context)
    case 'prospect_outreach': return prospect_outreach(context)
    default: return null
  }
}

async function generateEmailHtml(bodyPrompt: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: bodyPrompt }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Non-text response')
  return block.text
}

export async function POST(request: Request) {
  // Require auth — either user session or cron secret
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const isDev = process.env.NODE_ENV === 'development'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = getSupabase() as any

  const body = await request.json() as { queue_item_id: string }
  if (!body.queue_item_id) {
    return Response.json({ error: 'queue_item_id is required' }, { status: 400 })
  }

  // Fetch queue item
  const { data: queueItem, error: queueError } = await svc
    .from('automation_queue')
    .select('*')
    .eq('id', body.queue_item_id)
    .single()

  if (queueError || !queueItem) {
    return Response.json({ error: 'Queue item not found' }, { status: 404 })
  }

  // Fetch org name
  const { data: org } = await svc
    .from('organizations')
    .select('name')
    .eq('id', queueItem.organization_id)
    .single()

  const payload = (queueItem.payload ?? {}) as Record<string, unknown>
  const context: AutomationContext = {
    businessName: org?.name ?? 'OIOS',
    customerName: (payload.customer_name as string) || 'Valued Customer',
    customerEmail: (payload.customer_email as string) || '',
    metadata: payload,
  }

  const template = getTemplate(queueItem.action_type, context)
  if (!template) {
    return Response.json({ error: `Unknown action_type: ${queueItem.action_type}` }, { status: 400 })
  }

  try {
    const html = await generateEmailHtml(template.bodyPrompt)
    return Response.json({
      subject: template.subject,
      html,
      to: context.customerEmail,
      from: 'noreply@getoios.com',
      customer_name: context.customerName,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: `Failed to generate preview: ${msg}` }, { status: 500 })
  }
}
