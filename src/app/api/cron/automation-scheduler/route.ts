// ============================================================
// OIOS Client Dashboard — Automation Scheduler Cron
// Runs every 15 minutes via Vercel Cron.
// Scans trigger conditions across all orgs and enqueues
// automation_queue items; fires auto-mode items immediately.
// ============================================================

import { createSupabaseServiceClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// Types — aligned to actual DB schema
// ---------------------------------------------------------------------------

interface AutomationRule {
  id: string
  organization_id: string
  name: string
  action_type: string
  trigger_type: string
  trigger_config: {
    mode?: 'auto' | 'approval'
    delay_minutes?: number
    conditions?: Record<string, unknown>
  } | null
  action_config: {
    template?: string
    description?: string
  } | null
  active: boolean
}

interface QueueInsert {
  organization_id: string
  rule_id: string
  action_type: string
  status: 'pending' | 'approved'
  target_entity_type: string
  target_entity_id: string
  payload: Record<string, unknown>
  scheduled_for: string
}

// ---------------------------------------------------------------------------
// Auth check
// ---------------------------------------------------------------------------

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true // no secret configured — allow (dev)
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) return true
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAutoMode(rule: AutomationRule): boolean {
  return rule.trigger_config?.mode === 'auto'
}

function getDelayMinutes(rule: AutomationRule): number {
  return Number(rule.trigger_config?.delay_minutes ?? 0)
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString()
}

function minutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString()
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString()
}

function todayDate(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Build a display name from lead fields — falls back to company */
function leadDisplayName(lead: { name?: string | null; first_name?: string; last_name?: string; company?: string | null }): string {
  return lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.company || 'Unknown'
}

/** Compute scheduled_for from rule delay */
function scheduledFor(rule: AutomationRule): string {
  const delay = getDelayMinutes(rule)
  return delay > 0 ? minutesFromNow(delay) : nowIso()
}

// ---------------------------------------------------------------------------
// Trigger: follow_up_email
// Leads with follow_up_date <= today AND status IN (new, contacted, qualified)
// ---------------------------------------------------------------------------

async function triggerFollowUpEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  svc: any,
  rule: AutomationRule,
): Promise<QueueInsert[]> {
  const { data: leads, error } = await svc
    .from('leads')
    .select('id, name, first_name, last_name, email, phone, company, status, priority, follow_up_date, notes')
    .eq('organization_id', rule.organization_id)
    .in('status', ['new', 'contacted', 'qualified'])
    .lte('follow_up_date', todayDate())
    .not('follow_up_date', 'is', null)

  if (error || !leads?.length) return []

  const { data: existing } = await svc
    .from('automation_queue')
    .select('target_entity_id')
    .eq('organization_id', rule.organization_id)
    .eq('rule_id', rule.id)
    .eq('target_entity_type', 'lead')
    .in('status', ['pending', 'approved', 'executed'])

  const existingIds = new Set<string>((existing ?? []).map((e: { target_entity_id: string }) => e.target_entity_id))
  const sf = scheduledFor(rule)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return leads.filter((l: any) => !existingIds.has(l.id)).map((lead: any) => ({
    organization_id: rule.organization_id,
    rule_id: rule.id,
    action_type: 'follow_up_email',
    status: isAutoMode(rule) ? 'approved' as const : 'pending' as const,
    target_entity_type: 'lead',
    target_entity_id: lead.id,
    payload: {
      customer_name: leadDisplayName(lead),
      customer_email: lead.email,
      customer_phone: lead.phone,
      company: lead.company || null,
      lead_status: lead.status,
      lead_priority: lead.priority,
      follow_up_date: lead.follow_up_date,
      notes: lead.notes,
    },
    scheduled_for: sf,
  }))
}

// ---------------------------------------------------------------------------
// Trigger: review_request
// Completed appointments from last 48h — JOIN customers for contact info
// ---------------------------------------------------------------------------

async function triggerReviewRequest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  svc: any,
  rule: AutomationRule,
): Promise<QueueInsert[]> {
  const { data: appointments, error } = await svc
    .from('appointments')
    .select('id, customer_id, scheduled_date, scheduled_time_start, customers(first_name, last_name, email, phone)')
    .eq('organization_id', rule.organization_id)
    .eq('status', 'completed')
    .gte('scheduled_date', daysAgo(2).split('T')[0])

  if (error || !appointments?.length) return []

  const { data: existing } = await svc
    .from('automation_queue')
    .select('target_entity_id')
    .eq('organization_id', rule.organization_id)
    .eq('rule_id', rule.id)
    .eq('target_entity_type', 'appointment')

  const existingIds = new Set<string>((existing ?? []).map((e: { target_entity_id: string }) => e.target_entity_id))
  const sf = scheduledFor(rule)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return appointments.filter((a: any) => !existingIds.has(a.id)).map((appt: any) => {
    const c = appt.customers
    return {
      organization_id: rule.organization_id,
      rule_id: rule.id,
      action_type: 'review_request',
      status: isAutoMode(rule) ? 'approved' as const : 'pending' as const,
      target_entity_type: 'appointment',
      target_entity_id: appt.id,
      payload: {
        customer_name: c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : 'Customer',
        customer_email: c?.email,
        customer_phone: c?.phone,
        scheduled_date: appt.scheduled_date,
        scheduled_time: appt.scheduled_time_start,
      },
      scheduled_for: sf,
    }
  })
}

// ---------------------------------------------------------------------------
// Trigger: invoice_reminder
// Invoices overdue OR sent past due date — JOIN customers for contact
// ---------------------------------------------------------------------------

async function triggerInvoiceReminder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  svc: any,
  rule: AutomationRule,
): Promise<QueueInsert[]> {
  const { data: overdueInvoices, error: overdueError } = await svc
    .from('invoices')
    .select('id, customer_id, amount, due_date, status, customers(first_name, last_name, email, phone)')
    .eq('organization_id', rule.organization_id)
    .eq('status', 'overdue')

  const { data: sentPastDue, error: sentError } = await svc
    .from('invoices')
    .select('id, customer_id, amount, due_date, status, customers(first_name, last_name, email, phone)')
    .eq('organization_id', rule.organization_id)
    .eq('status', 'sent')
    .lte('due_date', todayDate())

  if ((overdueError && sentError) || (!overdueInvoices?.length && !sentPastDue?.length)) return []

  const allInvoices = [...(overdueInvoices ?? []), ...(sentPastDue ?? [])]
  if (!allInvoices.length) return []

  const { data: existing } = await svc
    .from('automation_queue')
    .select('target_entity_id')
    .eq('organization_id', rule.organization_id)
    .eq('rule_id', rule.id)
    .eq('target_entity_type', 'invoice')
    .in('status', ['pending', 'executed'])

  const existingIds = new Set<string>((existing ?? []).map((e: { target_entity_id: string }) => e.target_entity_id))
  const sf = scheduledFor(rule)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return allInvoices.filter((i: any) => !existingIds.has(i.id)).map((inv: any) => {
    const c = inv.customers
    return {
      organization_id: rule.organization_id,
      rule_id: rule.id,
      action_type: 'invoice_reminder',
      status: isAutoMode(rule) ? 'approved' as const : 'pending' as const,
      target_entity_type: 'invoice',
      target_entity_id: inv.id,
      payload: {
        customer_name: c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : 'Customer',
        customer_email: c?.email,
        total: inv.amount,
        due_date: inv.due_date,
        invoice_status: inv.status,
      },
      scheduled_for: sf,
    }
  })
}

// ---------------------------------------------------------------------------
// Trigger: lead_nurture
// Leads with status = 'new' AND created_at older than 3 days
// ---------------------------------------------------------------------------

async function triggerLeadNurture(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  svc: any,
  rule: AutomationRule,
): Promise<QueueInsert[]> {
  const { data: leads, error } = await svc
    .from('leads')
    .select('id, name, first_name, last_name, email, phone, company, source, notes, created_at')
    .eq('organization_id', rule.organization_id)
    .eq('status', 'new')
    .lte('created_at', daysAgo(3))

  if (error || !leads?.length) return []

  const { data: existing } = await svc
    .from('automation_queue')
    .select('target_entity_id')
    .eq('organization_id', rule.organization_id)
    .eq('rule_id', rule.id)
    .eq('target_entity_type', 'lead')

  const existingIds = new Set<string>((existing ?? []).map((e: { target_entity_id: string }) => e.target_entity_id))
  const sf = scheduledFor(rule)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return leads.filter((l: any) => !existingIds.has(l.id)).map((lead: any) => ({
    organization_id: rule.organization_id,
    rule_id: rule.id,
    action_type: 'lead_nurture',
    status: isAutoMode(rule) ? 'approved' as const : 'pending' as const,
    target_entity_type: 'lead',
    target_entity_id: lead.id,
    payload: {
      customer_name: leadDisplayName(lead),
      customer_email: lead.email,
      customer_phone: lead.phone,
      company: lead.company || null,
      source: lead.source,
      notes: lead.notes,
      created_at: lead.created_at,
    },
    scheduled_for: sf,
  }))
}

// ---------------------------------------------------------------------------
// Trigger: appointment_reminder
// Appointments scheduled in next 24h, status scheduled/confirmed
// ---------------------------------------------------------------------------

async function triggerAppointmentReminder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  svc: any,
  rule: AutomationRule,
): Promise<QueueInsert[]> {
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0]

  const { data: appointments, error } = await svc
    .from('appointments')
    .select('id, customer_id, scheduled_date, scheduled_time_start, status, customers(first_name, last_name, email, phone)')
    .eq('organization_id', rule.organization_id)
    .in('status', ['scheduled', 'confirmed'])
    .gte('scheduled_date', todayDate())
    .lte('scheduled_date', tomorrow)

  if (error || !appointments?.length) return []

  const { data: existing } = await svc
    .from('automation_queue')
    .select('target_entity_id')
    .eq('organization_id', rule.organization_id)
    .eq('rule_id', rule.id)
    .eq('target_entity_type', 'appointment')

  const existingIds = new Set<string>((existing ?? []).map((e: { target_entity_id: string }) => e.target_entity_id))
  const sf = scheduledFor(rule)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return appointments.filter((a: any) => !existingIds.has(a.id)).map((appt: any) => {
    const c = appt.customers
    return {
      organization_id: rule.organization_id,
      rule_id: rule.id,
      action_type: 'appointment_reminder',
      status: isAutoMode(rule) ? 'approved' as const : 'pending' as const,
      target_entity_type: 'appointment',
      target_entity_id: appt.id,
      payload: {
        customer_name: c ? `${c.first_name || ''} ${c.last_name || ''}`.trim() : 'Customer',
        customer_email: c?.email,
        customer_phone: c?.phone,
        scheduled_date: appt.scheduled_date,
        scheduled_time: appt.scheduled_time_start,
        appointment_status: appt.status,
      },
      scheduled_for: sf,
    }
  })
}

// ---------------------------------------------------------------------------
// Dispatch to the right trigger function by action_type
// ---------------------------------------------------------------------------

async function getTriggeredItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  svc: any,
  rule: AutomationRule,
): Promise<QueueInsert[]> {
  switch (rule.action_type) {
    case 'send_email': {
      // Route by trigger_type since all email rules share action_type='send_email'
      const template = rule.action_config?.template
      switch (template) {
        case 'prospect_outreach':
        case 'follow_up_email':
          return triggerFollowUpEmail(svc, rule)
        case 'review_request':
          return triggerReviewRequest(svc, rule)
        case 'invoice_reminder':
          return triggerInvoiceReminder(svc, rule)
        case 'lead_nurture':
          return triggerLeadNurture(svc, rule)
        case 'appointment_reminder':
          return triggerAppointmentReminder(svc, rule)
        default:
          console.warn(`[automation-scheduler] Unknown template: ${template}`)
          return []
      }
    }
    // Legacy action_type values (direct match)
    case 'follow_up_email':
      return triggerFollowUpEmail(svc, rule)
    case 'review_request':
      return triggerReviewRequest(svc, rule)
    case 'invoice_reminder':
      return triggerInvoiceReminder(svc, rule)
    case 'lead_nurture':
      return triggerLeadNurture(svc, rule)
    case 'appointment_reminder':
      return triggerAppointmentReminder(svc, rule)
    default:
      console.warn(`[automation-scheduler] Unknown action_type: ${rule.action_type}`)
      return []
  }
}

// ---------------------------------------------------------------------------
// Fire-and-forget execute call for auto-mode items
// ---------------------------------------------------------------------------

function fireExecute(queueItemId: string): void {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  fetch(`${baseUrl}/api/automations/execute`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ queue_item_id: queueItemId }),
  }).catch(() => {}) // fire-and-forget
}

// ---------------------------------------------------------------------------
// POST /api/cron/automation-scheduler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createSupabaseServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = supabase as any

  // 1. Fetch all active automation rules across all orgs
  const { data: rulesRaw, error: rulesError } = await svc
    .from('automation_rules')
    .select('*')
    .eq('active', true)

  if (rulesError) {
    console.error('[automation-scheduler] Failed to fetch rules:', rulesError)
    return Response.json({ error: 'Failed to fetch automation rules' }, { status: 500 })
  }

  const rules: AutomationRule[] = rulesRaw ?? []

  if (!rules.length) {
    return Response.json({ triggered: 0, auto_executed: 0, pending_approval: 0 })
  }

  // 2. Build global set of emails we've already contacted (any status except rejected)
  const { data: queuedEmails } = await svc
    .from('automation_queue')
    .select('payload')
    .eq('organization_id', rules[0].organization_id)
    .neq('status', 'rejected')

  const { data: sentEmails } = await svc
    .from('automation_log')
    .select('metadata')
    .eq('status', 'sent')

  const contactedEmails = new Set<string>()
  for (const q of (queuedEmails ?? []) as Array<{ payload: Record<string, unknown> }>) {
    const email = q.payload?.customer_email as string
    if (email) contactedEmails.add(email.toLowerCase())
  }
  for (const s of (sentEmails ?? []) as Array<{ metadata: Record<string, unknown> | null }>) {
    const email = (s.metadata?.target_contact as string) ?? ''
    if (email) contactedEmails.add(email.toLowerCase())
  }

  let triggered = 0
  let autoExecuted = 0
  let pendingApproval = 0
  let skippedDupes = 0

  // 3. Process each rule
  for (const rule of rules) {
    try {
      const items = await getTriggeredItems(svc, rule)

      if (!items.length) continue

      // 4. Filter out emails we've already contacted
      const deduped = items.filter((item) => {
        const email = (item.payload.customer_email as string)?.toLowerCase()
        if (!email || contactedEmails.has(email)) {
          skippedDupes++
          return false
        }
        // Add to set so subsequent rules in this batch don't duplicate
        contactedEmails.add(email)
        return true
      })

      if (!deduped.length) continue

      // 5. Insert queue entries in batch
      const { data: inserted, error: insertError } = await svc
        .from('automation_queue')
        .insert(deduped)
        .select('id, status')

      if (insertError) {
        console.error(
          `[automation-scheduler] Insert failed for rule ${rule.id} (${rule.action_type}):`,
          insertError,
        )
        continue
      }

      const insertedItems: Array<{ id: string; status: string }> = inserted ?? []
      triggered += insertedItems.length

      // 4. Fire execute for auto-mode items
      for (const item of insertedItems) {
        if (item.status === 'approved') {
          autoExecuted++
          fireExecute(item.id)
        } else {
          pendingApproval++
        }
      }
    } catch (err) {
      console.error(
        `[automation-scheduler] Unexpected error for rule ${rule.id} (${rule.action_type}):`,
        err,
      )
    }
  }

  // Safety net: retry stuck approved items past their scheduled_for
  const { data: stuckApproved } = await svc
    .from('automation_queue')
    .select('id')
    .eq('status', 'approved')
    .is('executed_at', null)
    .lte('scheduled_for', nowIso())
    .limit(10)

  let retried = 0
  for (const item of (stuckApproved ?? []) as Array<{ id: string }>) {
    retried++
    fireExecute(item.id)
  }

  console.log(
    `[automation-scheduler] Done — triggered: ${triggered}, auto_executed: ${autoExecuted}, pending_approval: ${pendingApproval}, skipped_dupes: ${skippedDupes}, retried_stuck: ${retried}`,
  )

  return Response.json({ triggered, auto_executed: autoExecuted, pending_approval: pendingApproval, skipped_dupes: skippedDupes, retried_stuck: retried })
}

// Allow GET — Vercel cron can use either verb
export async function GET(request: Request) {
  return POST(request)
}
