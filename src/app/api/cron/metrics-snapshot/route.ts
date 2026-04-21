// ============================================================
// OIOS Client Dashboard — Metrics Snapshot Cron
// Nightly aggregation: writes to business_metrics_daily
// and creates revenue_events for invoices paid yesterday
// ============================================================

import { createSupabaseServiceClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function getYesterdayRange(): { start: string; end: string; date: string } {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`

  return {
    start: `${date}T00:00:00.000Z`,
    end:   `${date}T23:59:59.999Z`,
    date,
  }
}

// ---------------------------------------------------------------------------
// Per-org snapshot aggregation
// ---------------------------------------------------------------------------

async function snapshotOrg(
   
  svc: any,
  orgId: string,
  yesterday: { start: string; end: string; date: string }
): Promise<void> {
  const [
    callsRes,
    leadsCreatedRes,
    leadsWonRes,
    apptBookedRes,
    apptCompletedRes,
    invoicesPaidRes,
    invoicesSentRes,
    invoicesOverdueRes,
    reviewsRes,
    automationsRes,
  ] = await Promise.all([
    // All calls from yesterday (need status + duration_ms)
    svc
      .from('calls')
      .select('status, duration_ms')
      .eq('organization_id', orgId)
      .gte('started_at', yesterday.start)
      .lte('started_at', yesterday.end),

    // Leads created yesterday
    svc
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gte('created_at', yesterday.start)
      .lte('created_at', yesterday.end),

    // Leads converted (won) yesterday — approximate via won_at
    svc
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'won')
      .gte('won_at', yesterday.start)
      .lte('won_at', yesterday.end),

    // Appointments booked yesterday (created_at)
    svc
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gte('created_at', yesterday.start)
      .lte('created_at', yesterday.end),

    // Appointments completed yesterday
    svc
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'completed')
      .gte('updated_at', yesterday.start)
      .lte('updated_at', yesterday.end),

    // Invoices paid yesterday — need amount_paid + id + customer_id + appointment_id
    svc
      .from('invoices')
      .select('id, organization_id, customer_id, appointment_id, amount_paid')
      .eq('organization_id', orgId)
      .eq('status', 'paid')
      .gte('paid_at', yesterday.start)
      .lte('paid_at', yesterday.end),

    // Invoices sent yesterday
    svc
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gte('sent_at', yesterday.start)
      .lte('sent_at', yesterday.end),

    // Invoices currently overdue
    svc
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'overdue'),

    // Reviews created yesterday
    svc
      .from('reviews')
      .select('rating')
      .eq('organization_id', orgId)
      .gte('created_at', yesterday.start)
      .lte('created_at', yesterday.end),

    // Automations executed (status='sent') yesterday
    svc
      .from('automation_log')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'sent')
      .gte('created_at', yesterday.start)
      .lte('created_at', yesterday.end),
  ])

  // --- Calls ---
  const calls: { status: string; duration_ms: number }[] = callsRes.data ?? []
  const calls_total = calls.length
  const calls_answered = calls.filter((c) => c.status === 'answered').length
  const calls_missed = calls.filter((c) => c.status === 'missed').length
  const totalDurationMs = calls.reduce((sum, c) => sum + (c.duration_ms ?? 0), 0)
  const avg_call_duration_seconds =
    calls_total > 0 ? Math.round(totalDurationMs / calls_total / 1000) : 0

  // --- Leads ---
  const leads_created = leadsCreatedRes.count ?? 0
  const leads_converted = leadsWonRes.count ?? 0

  // --- Appointments ---
  const appointments_booked = apptBookedRes.count ?? 0
  const appointments_completed = apptCompletedRes.count ?? 0

  // --- Invoices / Revenue ---
  const paidInvoices: { id: string; organization_id: string; customer_id: string; appointment_id: string | null; amount_paid: number }[] =
    invoicesPaidRes.data ?? []
  const revenue = paidInvoices.reduce((sum, inv) => sum + (inv.amount_paid ?? 0), 0)
  const invoices_sent = invoicesSentRes.count ?? 0
  const invoices_paid = paidInvoices.length
  const invoices_overdue = invoicesOverdueRes.count ?? 0

  // --- Reviews ---
  const reviews: { rating: number }[] = reviewsRes.data ?? []
  const reviews_received = reviews.length
  const avg_review_rating =
    reviews_received > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews_received) * 10) / 10
      : 0

  // --- Automations ---
  const automations_executed = automationsRes.count ?? 0

  // ---------------------------------------------------------------------------
  // 1. Upsert into business_metrics_daily
  // ---------------------------------------------------------------------------
  const { error: upsertError } = await svc
    .from('business_metrics_daily')
    .upsert(
      {
        organization_id: orgId,
        metric_date: yesterday.date,
        calls_total,
        calls_answered,
        calls_missed,
        avg_call_duration_seconds,
        leads_created,
        leads_converted,
        appointments_booked,
        appointments_completed,
        revenue,
        invoices_sent,
        invoices_paid,
        invoices_overdue,
        reviews_received,
        avg_review_rating,
        automations_executed,
      },
      { onConflict: 'organization_id,metric_date' }
    )

  if (upsertError) {
    throw new Error(`business_metrics_daily upsert failed for org ${orgId}: ${upsertError.message}`)
  }

  // ---------------------------------------------------------------------------
  // 2. Create revenue_events for invoices paid yesterday that don't have one yet
  // ---------------------------------------------------------------------------
  if (paidInvoices.length > 0) {
    // Check which invoices already have a revenue_event
    const invoiceIds = paidInvoices.map((inv) => inv.id)
    const { data: existingEvents } = await svc
      .from('revenue_events')
      .select('invoice_id')
      .eq('organization_id', orgId)
      .in('invoice_id', invoiceIds)

    const alreadyLogged = new Set<string>(
      (existingEvents ?? []).map((e: { invoice_id: string }) => e.invoice_id)
    )

    const newEvents = paidInvoices
      .filter((inv) => !alreadyLogged.has(inv.id))
      .map((inv) => ({
        organization_id: orgId,
        customer_id: inv.customer_id ?? null,
        lead_id: null,
        invoice_id: inv.id,
        event_type: 'invoice_paid',
        amount: inv.amount_paid ?? 0,
        cost: 0,
        source: 'invoice',
        event_date: yesterday.date,
      }))

    if (newEvents.length > 0) {
      const { error: eventError } = await svc.from('revenue_events').insert(newEvents)
      if (eventError) {
        // Non-fatal — log and continue
        console.warn(`revenue_events insert partial failure for org ${orgId}:`, eventError.message)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // Security: verify cron secret in production
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && process.env.NODE_ENV !== 'development') {
    if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = await createSupabaseServiceClient()
   
  const svc = supabase as any

  const yesterday = getYesterdayRange()

  // Load all organizations
  const { data: orgsRaw, error: orgsError } = await svc
    .from('organizations')
    .select('id, name')

  if (orgsError || !orgsRaw) {
    console.error('Failed to load organizations:', orgsError)
    return Response.json({ error: 'Failed to load organizations' }, { status: 500 })
  }

  const orgs = orgsRaw as Array<{ id: string; name: string }>

  const results: Array<{ orgId: string; orgName: string; status: 'ok' | 'error'; error?: string }> = []

  for (const org of orgs) {
    try {
      await snapshotOrg(svc, org.id, yesterday)
      results.push({ orgId: org.id, orgName: org.name, status: 'ok' })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`metrics-snapshot failed for org ${org.id}:`, err)
      results.push({ orgId: org.id, orgName: org.name, status: 'error', error: message })
    }
  }

  const succeeded = results.filter((r) => r.status === 'ok').length
  const failed    = results.filter((r) => r.status === 'error').length

  console.log(`metrics-snapshot cron complete: ${succeeded} succeeded, ${failed} failed`)

  return Response.json({
    success: true,
    metric_date: yesterday.date,
    orgs_processed: succeeded,
    orgs_failed: failed,
    results,
  })
}

export async function GET(request: Request) {
  return POST(request)
}
