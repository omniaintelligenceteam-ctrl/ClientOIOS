// ============================================================
// OIOS Client Dashboard — Automation Scheduler Cron
// Runs every 15 minutes via Vercel Cron.
// Scans trigger conditions across all orgs and enqueues
// automation_queue items; fires auto-mode items immediately.
// ============================================================

import { createSupabaseServiceClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AutomationRule {
  id: string
  organization_id: string
  action_type: string
  mode: 'auto' | 'approve'
  enabled: boolean
  config: Record<string, unknown>
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
// Date helpers
// ---------------------------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString()
}

function hoursFromNow(hours: number): string {
  const d = new Date()
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}

function hoursAgo(hours: number): string {
  const d = new Date()
  d.setHours(d.getHours() - hours)
  return d.toISOString()
}

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

/** Returns today's date as YYYY-MM-DD (local calendar, UTC for server) */
function todayDate(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// ---------------------------------------------------------------------------
// Trigger: follow_up_email
// Leads with follow_up_date <= today AND status IN (new, contacted, qualified)
// that don't already have a pending/approved/executed queue item for this rule+entity
// ---------------------------------------------------------------------------

async function triggerFollowUpEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  svc: any,
  rule: AutomationRule,
): Promise<QueueInsert[]> {
  const { data: leads, error } = await svc
    .from('leads')
    .select('id, customer_name, customer_email, customer_phone, status, priority, follow_up_date, notes')
    .eq('organization_id', rule.organization_id)
    .in('status', ['new', 'contacted', 'qualified'])
    .lte('follow_up_date', todayDate())
    .not('follow_up_date', 'is', null)

  if (error || !leads?.length) return []

  // Fetch existing queue items for this rule + entity type to avoid duplicates
  const { data: existing } = await svc
    .from('automation_queue')
    .select('target_entity_id')
    .eq('organization_id', rule.organization_id)
    .eq('rule_id', rule.id)
    .eq('target_entity_type', 'lead')
    .in('status', ['pending', 'approved', 'executed'])

  const existingIds = new Set<string>((existing ?? []).map((e: { target_entity_id: string }) => e.target_entity_id))

  const scheduledFor = rule.config?.delay_hours
    ? hoursFromNow(Number(rule.config.delay_hours))
    : nowIso()

  return leads
    .filter((lead: { id: string }) => !existingIds.has(lead.id))
    .map((lead: { id: string; customer_name: string; customer_email: string; customer_phone: string; status: string; priority: string; follow_up_date: string; notes: string }) => ({
      organization_id: rule.organization_id,
      rule_id: rule.id,
      action_type: rule.action_type,
      status: rule.mode === 'auto' ? 'approved' : 'pending',
      target_entity_type: 'lead',
      target_entity_id: lead.id,
      payload: {
        customer_name: lead.customer_name,
        customer_email: lead.customer_email,
        customer_phone: lead.customer_phone,
        lead_status: lead.status,
        lead_priority: lead.priority,
        follow_up_date: lead.follow_up_date,
        notes: lead.notes,
      },
      scheduled_for: scheduledFor,
    }))
}

// ---------------------------------------------------------------------------
// Trigger: review_request
// Completed appointments from last 48 hours with no review_request queue item
// ---------------------------------------------------------------------------

async function triggerReviewRequest(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  svc: any,
  rule: AutomationRule,
): Promise<QueueInsert[]> {
  const { data: appointments, error } = await svc
    .from('appointments')
    .select('id, customer_name, customer_email, customer_phone, scheduled_start')
    .eq('organization_id', rule.organization_id)
    .eq('status', 'completed')
    .gte('scheduled_start', hoursAgo(48))

  if (error || !appointments?.length) return []

  const { data: existing } = await svc
    .from('automation_queue')
    .select('target_entity_id')
    .eq('organization_id', rule.organization_id)
    .eq('rule_id', rule.id)
    .eq('target_entity_type', 'appointment')

  const existingIds = new Set<string>((existing ?? []).map((e: { target_entity_id: string }) => e.target_entity_id))

  const scheduledFor = rule.config?.delay_hours
    ? hoursFromNow(Number(rule.config.delay_hours))
    : nowIso()

  return appointments
    .filter((appt: { id: string }) => !existingIds.has(appt.id))
    .map((appt: { id: string; customer_name: string; customer_email: string; customer_phone: string; scheduled_start: string }) => ({
      organization_id: rule.organization_id,
      rule_id: rule.id,
      action_type: rule.action_type,
      status: rule.mode === 'auto' ? 'approved' : 'pending',
      target_entity_type: 'appointment',
      target_entity_id: appt.id,
      payload: {
        customer_name: appt.customer_name,
        customer_email: appt.customer_email,
        customer_phone: appt.customer_phone,
        scheduled_start: appt.scheduled_start,
      },
      scheduled_for: scheduledFor,
    }))
}

// ---------------------------------------------------------------------------
// Trigger: invoice_reminder
// Invoices with status = 'overdue' OR (status = 'sent' AND due_date <= today)
// that don't have a pending/executed queue item
// ---------------------------------------------------------------------------

async function triggerInvoiceReminder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  svc: any,
  rule: AutomationRule,
): Promise<QueueInsert[]> {
  // Fetch overdue invoices
  const { data: overdueInvoices, error: overdueError } = await svc
    .from('invoices')
    .select('id, customer_name, customer_email, total, due_date, status')
    .eq('organization_id', rule.organization_id)
    .eq('status', 'overdue')

  // Fetch sent invoices past due date
  const { data: sentPastDue, error: sentError } = await svc
    .from('invoices')
    .select('id, customer_name, customer_email, total, due_date, status')
    .eq('organization_id', rule.organization_id)
    .eq('status', 'sent')
    .lte('due_date', todayDate())

  if ((overdueError && sentError) || (!overdueInvoices?.length && !sentPastDue?.length)) return []

  const allInvoices = [
    ...(overdueInvoices ?? []),
    ...(sentPastDue ?? []),
  ]

  if (!allInvoices.length) return []

  const { data: existing } = await svc
    .from('automation_queue')
    .select('target_entity_id')
    .eq('organization_id', rule.organization_id)
    .eq('rule_id', rule.id)
    .eq('target_entity_type', 'invoice')
    .in('status', ['pending', 'executed'])

  const existingIds = new Set<string>((existing ?? []).map((e: { target_entity_id: string }) => e.target_entity_id))

  const scheduledFor = rule.config?.delay_hours
    ? hoursFromNow(Number(rule.config.delay_hours))
    : nowIso()

  return allInvoices
    .filter((inv: { id: string }) => !existingIds.has(inv.id))
    .map((inv: { id: string; customer_name: string; customer_email: string; total: number; due_date: string; status: string }) => ({
      organization_id: rule.organization_id,
      rule_id: rule.id,
      action_type: rule.action_type,
      status: rule.mode === 'auto' ? 'approved' : 'pending',
      target_entity_type: 'invoice',
      target_entity_id: inv.id,
      payload: {
        customer_name: inv.customer_name,
        customer_email: inv.customer_email,
        total: inv.total,
        due_date: inv.due_date,
        invoice_status: inv.status,
      },
      scheduled_for: scheduledFor,
    }))
}

// ---------------------------------------------------------------------------
// Trigger: lead_nurture
// Leads with status = 'new' AND created_at older than 3 days AND no queue item
// ---------------------------------------------------------------------------

async function triggerLeadNurture(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  svc: any,
  rule: AutomationRule,
): Promise<QueueInsert[]> {
  const { data: leads, error } = await svc
    .from('leads')
    .select('id, customer_name, customer_email, customer_phone, source, notes, created_at')
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

  const scheduledFor = rule.config?.delay_hours
    ? hoursFromNow(Number(rule.config.delay_hours))
    : nowIso()

  return leads
    .filter((lead: { id: string }) => !existingIds.has(lead.id))
    .map((lead: { id: string; customer_name: string; customer_email: string; customer_phone: string; source: string; notes: string; created_at: string }) => ({
      organization_id: rule.organization_id,
      rule_id: rule.id,
      action_type: rule.action_type,
      status: rule.mode === 'auto' ? 'approved' : 'pending',
      target_entity_type: 'lead',
      target_entity_id: lead.id,
      payload: {
        customer_name: lead.customer_name,
        customer_email: lead.customer_email,
        customer_phone: lead.customer_phone,
        source: lead.source,
        notes: lead.notes,
        created_at: lead.created_at,
      },
      scheduled_for: scheduledFor,
    }))
}

// ---------------------------------------------------------------------------
// Trigger: appointment_reminder
// Appointments scheduled between now and 24h from now, status scheduled/confirmed,
// no existing queue item
// ---------------------------------------------------------------------------

async function triggerAppointmentReminder(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  svc: any,
  rule: AutomationRule,
): Promise<QueueInsert[]> {
  const { data: appointments, error } = await svc
    .from('appointments')
    .select('id, customer_name, customer_email, customer_phone, scheduled_start, status')
    .eq('organization_id', rule.organization_id)
    .in('status', ['scheduled', 'confirmed'])
    .gte('scheduled_start', nowIso())
    .lte('scheduled_start', hoursFromNow(24))

  if (error || !appointments?.length) return []

  const { data: existing } = await svc
    .from('automation_queue')
    .select('target_entity_id')
    .eq('organization_id', rule.organization_id)
    .eq('rule_id', rule.id)
    .eq('target_entity_type', 'appointment')

  const existingIds = new Set<string>((existing ?? []).map((e: { target_entity_id: string }) => e.target_entity_id))

  const scheduledFor = rule.config?.delay_hours
    ? hoursFromNow(Number(rule.config.delay_hours))
    : nowIso()

  return appointments
    .filter((appt: { id: string }) => !existingIds.has(appt.id))
    .map((appt: { id: string; customer_name: string; customer_email: string; customer_phone: string; scheduled_start: string; status: string }) => ({
      organization_id: rule.organization_id,
      rule_id: rule.id,
      action_type: rule.action_type,
      status: rule.mode === 'auto' ? 'approved' : 'pending',
      target_entity_type: 'appointment',
      target_entity_id: appt.id,
      payload: {
        customer_name: appt.customer_name,
        customer_email: appt.customer_email,
        customer_phone: appt.customer_phone,
        scheduled_start: appt.scheduled_start,
        appointment_status: appt.status,
      },
      scheduled_for: scheduledFor,
    }))
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

  // 1. Fetch all enabled automation rules across all orgs
  const { data: rulesRaw, error: rulesError } = await svc
    .from('automation_rules')
    .select('*')
    .eq('enabled', true)

  if (rulesError) {
    console.error('[automation-scheduler] Failed to fetch rules:', rulesError)
    return Response.json({ error: 'Failed to fetch automation rules' }, { status: 500 })
  }

  const rules: AutomationRule[] = rulesRaw ?? []

  if (!rules.length) {
    return Response.json({ triggered: 0, auto_executed: 0, pending_approval: 0 })
  }

  let triggered = 0
  let autoExecuted = 0
  let pendingApproval = 0

  // 2. Process each rule
  for (const rule of rules) {
    try {
      const items = await getTriggeredItems(svc, rule)

      if (!items.length) continue

      // 3. Insert queue entries in batch
      const { data: inserted, error: insertError } = await svc
        .from('automation_queue')
        .insert(items)
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

  console.log(
    `[automation-scheduler] Done — triggered: ${triggered}, auto_executed: ${autoExecuted}, pending_approval: ${pendingApproval}`,
  )

  return Response.json({ triggered, auto_executed: autoExecuted, pending_approval: pendingApproval })
}

// Allow GET — Vercel cron can use either verb
export async function GET(request: Request) {
  return POST(request)
}
