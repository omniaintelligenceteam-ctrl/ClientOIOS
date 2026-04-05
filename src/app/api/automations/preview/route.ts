// ============================================================
// POST /api/automations/preview
// Returns the rendered email (subject + HTML) for a queue item.
// No external AI calls — templates render directly.
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

export async function POST(request: Request) {
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

  return Response.json({
    subject: template.subject,
    html: template.html,
    to: context.customerEmail,
    from: 'team@oioscoo.com',
    customer_name: context.customerName,
  })
}
