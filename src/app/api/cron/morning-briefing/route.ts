// ============================================================
// OIOS Client Dashboard — Morning Briefing Cron
// Triggered daily by Vercel Cron to generate per-org briefings
// ============================================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

// ---------------------------------------------------------------------------
// Supabase service-role client (bypasses RLS)
// ---------------------------------------------------------------------------

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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

function getTodayDate(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// ---------------------------------------------------------------------------
// Metrics aggregation
// ---------------------------------------------------------------------------

interface BriefingMetrics {
  calls_total: number
  calls_answered: number
  calls_missed: number
  calls_avg_duration_seconds: number
  leads_new: number
  leads_hot: number
  appointments_booked: number
  appointments_today: number
  revenue_collected: number
  invoices_overdue: number
  reviews_new: number
  reviews_avg_rating: number
}

async function aggregateMetrics(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  orgId: string,
  yesterday: { start: string; end: string; date: string }
): Promise<BriefingMetrics> {
  // Run all queries in parallel for speed
  const [callsRes, leadsRes, hotLeadsRes, apptBookedRes, apptTodayRes, revenueRes, overdueRes, reviewsRes] =
    await Promise.all([
      // Calls from yesterday
      supabase
        .from('calls')
        .select('status, duration_seconds')
        .eq('organization_id', orgId)
        .gte('started_at', yesterday.start)
        .lte('started_at', yesterday.end),

      // New leads created yesterday
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .gte('created_at', yesterday.start)
        .lte('created_at', yesterday.end),

      // Hot leads (current, not time-bounded)
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('priority', 'hot'),

      // Appointments booked yesterday
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .gte('created_at', yesterday.start)
        .lte('created_at', yesterday.end),

      // Appointments scheduled for today
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('scheduled_date', getTodayDate())
        .not('status', 'in', '("cancelled","no_show")'),

      // Revenue paid yesterday
      supabase
        .from('invoices')
        .select('amount_paid')
        .eq('organization_id', orgId)
        .eq('status', 'paid')
        .gte('paid_at', yesterday.start)
        .lte('paid_at', yesterday.end),

      // Overdue invoices (current)
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('status', 'overdue'),

      // Reviews created yesterday
      supabase
        .from('reviews')
        .select('rating')
        .eq('organization_id', orgId)
        .gte('created_at', yesterday.start)
        .lte('created_at', yesterday.end),
    ])

  // --- Calls ---
  const calls = callsRes.data ?? []
  const calls_total = calls.length
  const calls_answered = calls.filter((c: { status: string }) => c.status === 'answered').length
  const calls_missed = calls.filter((c: { status: string }) =>
    c.status === 'missed' || c.status === 'voicemail' || c.status === 'abandoned'
  ).length
  const totalDuration = calls.reduce(
    (sum: number, c: { duration_seconds: number }) => sum + (c.duration_seconds ?? 0),
    0
  )
  const calls_avg_duration_seconds = calls_total > 0 ? Math.round(totalDuration / calls_total) : 0

  // --- Leads ---
  const leads_new = leadsRes.count ?? 0
  const leads_hot = hotLeadsRes.count ?? 0

  // --- Appointments ---
  const appointments_booked = apptBookedRes.count ?? 0
  const appointments_today = apptTodayRes.count ?? 0

  // --- Revenue ---
  const invoices = revenueRes.data ?? []
  const revenue_collected = invoices.reduce(
    (sum: number, inv: { amount_paid: number }) => sum + (inv.amount_paid ?? 0),
    0
  )
  const invoices_overdue = overdueRes.count ?? 0

  // --- Reviews ---
  const reviews = reviewsRes.data ?? []
  const reviews_new = reviews.length
  const reviews_avg_rating =
    reviews_new > 0
      ? Math.round((reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviews_new) * 10) / 10
      : 0

  return {
    calls_total,
    calls_answered,
    calls_missed,
    calls_avg_duration_seconds,
    leads_new,
    leads_hot,
    appointments_booked,
    appointments_today,
    revenue_collected,
    invoices_overdue,
    reviews_new,
    reviews_avg_rating,
  }
}

// ---------------------------------------------------------------------------
// Narrative generation
// ---------------------------------------------------------------------------

async function generateNarrative(
  metrics: BriefingMetrics,
  orgName: string
): Promise<string> {
  // Try Claude Haiku if API key is available
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      const metricsText = [
        `Calls: ${metrics.calls_total} total, ${metrics.calls_answered} answered, ${metrics.calls_missed} missed, avg ${metrics.calls_avg_duration_seconds}s duration`,
        `Leads: ${metrics.leads_new} new, ${metrics.leads_hot} hot leads currently`,
        `Appointments: ${metrics.appointments_booked} booked yesterday, ${metrics.appointments_today} scheduled today`,
        `Revenue: $${metrics.revenue_collected.toFixed(2)} collected, ${metrics.invoices_overdue} overdue invoices`,
        `Reviews: ${metrics.reviews_new} new${metrics.reviews_new > 0 ? `, avg ${metrics.reviews_avg_rating} stars` : ''}`,
      ].join('\n')

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `You are the OIOS morning briefing writer. Write a brief, warm 3-4 sentence summary of yesterday's business activity. Address the business owner directly. Focus on wins and action items. Use plain language, no jargon. Be encouraging but factual. If there's nothing notable, say so briefly.`,
        messages: [
          {
            role: 'user',
            content: `Business: ${orgName}\n\nYesterday's metrics:\n${metricsText}\n\nWrite the morning briefing.`,
          },
        ],
      })

      const block = response.content[0]
      if (block.type === 'text') {
        return block.text
      }
    } catch (err) {
      console.error('Anthropic narrative generation failed, falling back to template:', err)
    }
  }

  // Template-based fallback
  return generateTemplatNarrative(metrics, orgName)
}

function generateTemplatNarrative(metrics: BriefingMetrics, orgName: string): string {
  const parts: string[] = []

  // Calls
  if (metrics.calls_total > 0) {
    parts.push(
      `Yesterday ${orgName} handled ${metrics.calls_total} call${metrics.calls_total !== 1 ? 's' : ''} — ${metrics.calls_answered} answered${metrics.calls_missed > 0 ? `, ${metrics.calls_missed} missed` : ''}.`
    )
  } else {
    parts.push(`No calls were recorded for ${orgName} yesterday.`)
  }

  // Revenue
  if (metrics.revenue_collected > 0) {
    parts.push(
      `You collected $${metrics.revenue_collected.toFixed(2)} in payments${metrics.invoices_overdue > 0 ? `, though ${metrics.invoices_overdue} invoice${metrics.invoices_overdue !== 1 ? 's are' : ' is'} still overdue` : ''}.`
    )
  } else if (metrics.invoices_overdue > 0) {
    parts.push(
      `No payments were collected yesterday, and ${metrics.invoices_overdue} invoice${metrics.invoices_overdue !== 1 ? 's are' : ' is'} overdue — worth a follow-up today.`
    )
  }

  // Leads & appointments
  if (metrics.leads_new > 0 || metrics.appointments_booked > 0) {
    const leadStr = metrics.leads_new > 0 ? `${metrics.leads_new} new lead${metrics.leads_new !== 1 ? 's came' : ' came'} in` : ''
    const apptStr = metrics.appointments_booked > 0 ? `${metrics.appointments_booked} appointment${metrics.appointments_booked !== 1 ? 's were' : ' was'} booked` : ''
    const combined = [leadStr, apptStr].filter(Boolean).join(' and ')
    parts.push(`${combined.charAt(0).toUpperCase()}${combined.slice(1)}.`)
  }

  // Today's appointments
  if (metrics.appointments_today > 0) {
    parts.push(
      `You have ${metrics.appointments_today} appointment${metrics.appointments_today !== 1 ? 's' : ''} on the schedule for today.`
    )
  }

  // Reviews
  if (metrics.reviews_new > 0) {
    parts.push(
      `${metrics.reviews_new} new review${metrics.reviews_new !== 1 ? 's were' : ' was'} posted${metrics.reviews_avg_rating > 0 ? ` with an average rating of ${metrics.reviews_avg_rating} stars` : ''} — check them when you get a chance.`
    )
  }

  return parts.length > 0
    ? parts.join(' ')
    : 'No significant activity was recorded yesterday. Have a great day!'
}

// ---------------------------------------------------------------------------
// POST /api/cron/morning-briefing
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  // --- Security: verify Vercel Cron secret ---
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    const isDev = process.env.NODE_ENV === 'development'
    if (!isDev && authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = getSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = supabase as any

  const yesterday = getYesterdayRange()

  // 1. Load all organizations
  const { data: orgsRaw, error: orgsError } = await svc
    .from('organizations')
    .select('id, name')

  if (orgsError || !orgsRaw) {
    console.error('Failed to load organizations:', orgsError)
    return Response.json({ error: 'Failed to load organizations' }, { status: 500 })
  }

  const orgs = orgsRaw as Array<{ id: string; name: string }>

  const results: Array<{ orgId: string; orgName: string; status: 'ok' | 'error'; error?: string }> = []

  // 2. Process each org
  for (const org of orgs) {
    try {
      const metrics = await aggregateMetrics(svc, org.id, yesterday)
      const narrative = await generateNarrative(metrics, org.name)

      // 3. Upsert into daily_reports (one per org per day)
      const { error: reportError } = await svc
        .from('daily_reports')
        .upsert(
          {
            organization_id: org.id,
            report_date: yesterday.date,
            report_type: 'morning_briefing',
            content: metrics as unknown as Record<string, unknown>,
            narrative,
            metrics: {
              calls_total:          metrics.calls_total,
              leads_new:            metrics.leads_new,
              appointments_booked:  metrics.appointments_booked,
              revenue_collected:    metrics.revenue_collected,
              reviews_new:          metrics.reviews_new,
            },
            delivered_via: ['dashboard'],
          },
          { onConflict: 'organization_id,report_date,report_type' }
        )

      if (reportError) {
        console.error(`Failed to upsert daily_report for org ${org.id}:`, reportError)
        results.push({ orgId: org.id, orgName: org.name, status: 'error', error: reportError.message })
        continue
      }

      // 4. Create broadcast notification for all org users
      const { error: notifError } = await svc
        .from('notifications')
        .insert({
          organization_id: org.id,
          user_id: null,
          type: 'briefing_ready',
          title: 'Morning Briefing Ready',
          body: narrative.length > 150 ? `${narrative.slice(0, 150)}...` : narrative,
          icon: 'FileBarChart',
          href: '/dashboard',
        })

      if (notifError) {
        // Non-fatal — log and continue
        console.warn(`Failed to insert notification for org ${org.id}:`, notifError)
      }

      results.push({ orgId: org.id, orgName: org.name, status: 'ok' })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`Error processing org ${org.id}:`, err)
      results.push({ orgId: org.id, orgName: org.name, status: 'error', error: message })
    }
  }

  const succeeded = results.filter((r) => r.status === 'ok').length
  const failed    = results.filter((r) => r.status === 'error').length

  console.log(`Morning briefing cron complete: ${succeeded} succeeded, ${failed} failed`)

  return Response.json({
    success: true,
    report_date: yesterday.date,
    orgs_processed: succeeded,
    orgs_failed: failed,
    results,
  })
}

// Allow GET for simple health-check pings (Vercel cron can use GET)
export async function GET(req: Request) {
  return POST(req)
}
