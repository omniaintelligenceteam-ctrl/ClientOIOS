import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Parse "Name <email>" or plain "email" format
function parseEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/)
  return match ? match[1].toLowerCase().trim() : raw.toLowerCase().trim()
}

type Classification =
  | 'interested'
  | 'not_interested'
  | 'bounce'
  | 'ooo'
  | 'question'
  | 'unsubscribe'
  | 'unknown'

function classifyReply(subject: string, bodyText: string): Classification {
  const text = `${subject} ${bodyText}`.toLowerCase()

  // Bounce detection (mailer-daemon headers/subjects)
  if (
    subject.toLowerCase().includes('delivery status notification') ||
    subject.toLowerCase().includes('undeliverable') ||
    subject.toLowerCase().includes('mail delivery failed') ||
    subject.toLowerCase().includes('returned mail') ||
    text.includes('mailer-daemon') ||
    text.includes('550 5.1.1') ||
    text.includes('user unknown')
  ) {
    return 'bounce'
  }

  // Out of office
  if (
    text.includes('out of office') ||
    text.includes('automatic reply') ||
    text.includes('auto-reply') ||
    text.includes('on vacation') ||
    text.includes('away from') ||
    text.includes('will be back') ||
    text.includes('currently out')
  ) {
    return 'ooo'
  }

  // Unsubscribe intent
  if (
    text.includes('unsubscribe') ||
    text.includes('remove me') ||
    text.includes('opt out') ||
    text.includes('opt-out') ||
    text.includes('stop emailing') ||
    text.includes('take me off') ||
    text.includes('do not contact')
  ) {
    return 'unsubscribe'
  }

  // Not interested
  if (
    text.includes('not interested') ||
    text.includes('no thank') ||
    text.includes('not right now') ||
    text.includes('not a good fit') ||
    text.includes('not looking') ||
    text.includes('happy with') ||
    text.includes('have someone') ||
    text.includes('already have')
  ) {
    return 'not_interested'
  }

  // Interested signals
  if (
    text.includes('interested') ||
    text.includes('tell me more') ||
    text.includes('sounds good') ||
    text.includes('let\'s chat') ||
    text.includes('schedule a call') ||
    text.includes('book a time') ||
    text.includes('can we talk') ||
    text.includes('more information') ||
    text.includes('pricing') ||
    text.includes('how much') ||
    text.includes('demo') ||
    text.includes('yes') ||
    text.includes('would love')
  ) {
    return 'interested'
  }

  // Question
  if (text.includes('?') || text.includes('how does') || text.includes('what is') || text.includes('can you')) {
    return 'question'
  }

  return 'unknown'
}

type LeadStatusForUpdate = 'qualified' | 'lost' | 'nurturing'

function getLeadStatusUpdate(
  classification: Classification,
  currentStatus: string
): { status?: LeadStatusForUpdate; do_not_contact?: boolean } {
  switch (classification) {
    case 'interested':
      // Upgrade contacted → qualified; leave others unchanged
      if (currentStatus === 'contacted') return { status: 'qualified' }
      if (currentStatus === 'new') return { status: 'qualified' }
      return {}
    case 'not_interested':
      return { status: 'lost' }
    case 'unsubscribe':
      return { status: 'lost', do_not_contact: true }
    case 'question':
      // Move to nurturing if still cold
      if (currentStatus === 'new' || currentStatus === 'contacted') return { status: 'nurturing' }
      return {}
    default:
      return {}
  }
}

/**
 * POST /api/webhooks/resend-inbound
 *
 * Receives inbound email replies forwarded by Resend.
 * Parses, classifies, and writes to email_replies table.
 * Updates lead status based on classification.
 */
export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const from = typeof payload.from === 'string' ? payload.from : ''
  const subject = typeof payload.subject === 'string' ? payload.subject : ''
  const bodyText = typeof payload.text === 'string' ? payload.text : ''
  const bodyHtml = typeof payload.html === 'string' ? payload.html : ''

  if (!from) {
    return NextResponse.json({ error: 'Missing from field' }, { status: 400 })
  }

  const senderEmail = parseEmail(from)
  const senderName = from.includes('<') ? from.split('<')[0].trim() : undefined

  const classification = classifyReply(subject, bodyText)

  const supabase = getSupabase()

  // Match to lead by sender email
  const { data: lead } = await supabase
    .from('leads')
    .select('id, status, do_not_contact, replies_count')
    .eq('email', senderEmail)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const leadId: string | null = lead?.id ?? null

  // Insert reply record
  const { error: insertError } = await supabase.from('email_replies').insert({
    lead_id: leadId,
    sender_email: senderEmail,
    sender_name: senderName || null,
    subject: subject || null,
    body_text: bodyText || null,
    body_html: bodyHtml || null,
    classification,
    raw_payload: payload,
    received_at: new Date().toISOString(),
    processed_at: new Date().toISOString(),
  })

  if (insertError) {
    console.error('[resend-inbound] Insert error:', insertError)
    return NextResponse.json({ error: 'DB insert failed', detail: insertError.message }, { status: 500 })
  }

  // Update lead if found
  if (leadId && lead) {
    const updates = getLeadStatusUpdate(classification, lead.status)

    const leadUpdates: Record<string, unknown> = {
      replies_count: (lead.replies_count ?? 0) + 1,
      last_engaged_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (updates.status) leadUpdates.status = updates.status
    if (updates.do_not_contact) leadUpdates.do_not_contact = true

    const { error: updateError } = await supabase
      .from('leads')
      .update(leadUpdates)
      .eq('id', leadId)

    if (updateError) {
      console.error('[resend-inbound] Lead update error:', updateError)
    }
  }

  console.log(`[resend-inbound] Received reply from ${senderEmail} — ${classification} — lead_id: ${leadId ?? 'none'}`)

  return NextResponse.json({
    received: true,
    sender: senderEmail,
    classification,
    lead_matched: !!leadId,
  })
}
