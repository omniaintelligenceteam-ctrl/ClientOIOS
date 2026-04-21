// ============================================================
// OIOS Client Dashboard — Trends Analytics Endpoint
// GET /api/analytics/trends?period=30&grouping=daily
// Returns business_metrics_daily rows for the period,
// optionally aggregated by week or month
// ============================================================

import { createSupabaseServerClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetricsRow {
  metric_date: string
  calls_total: number
  calls_answered: number
  calls_missed: number
  avg_call_duration_seconds: number
  leads_created: number
  leads_converted: number
  appointments_booked: number
  appointments_completed: number
  revenue: number
  invoices_sent: number
  invoices_paid: number
  invoices_overdue: number
  reviews_received: number
  avg_review_rating: number
  automations_executed: number
}

interface AggregatedRow {
  period_key: string
  calls_total: number
  calls_answered: number
  calls_missed: number
  avg_call_duration_seconds: number
  leads_created: number
  leads_converted: number
  appointments_booked: number
  appointments_completed: number
  revenue: number
  invoices_sent: number
  invoices_paid: number
  invoices_overdue: number
  reviews_received: number
  avg_review_rating: number
  automations_executed: number
  days_in_period: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getISOWeekKey(dateStr: string): string {
  const date = new Date(dateStr)
  // ISO week: Monday-based; use the year of Thursday of that week
  const day = date.getUTCDay() // 0=Sun
  const thursday = new Date(date)
  thursday.setUTCDate(date.getUTCDate() + 4 - (day === 0 ? 7 : day))
  const year = thursday.getUTCFullYear()
  const startOfYear = new Date(Date.UTC(year, 0, 1))
  const weekNum = Math.ceil(
    ((thursday.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7
  )
  return `${year}-W${String(weekNum).padStart(2, '0')}`
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7) // 'YYYY-MM'
}

function aggregateRows(rows: MetricsRow[], grouping: 'weekly' | 'monthly'): AggregatedRow[] {
  const keyFn = grouping === 'weekly' ? getISOWeekKey : getMonthKey
  const buckets = new Map<string, MetricsRow[]>()

  for (const row of rows) {
    const key = keyFn(row.metric_date)
    const bucket = buckets.get(key) ?? []
    bucket.push(row)
    buckets.set(key, bucket)
  }

  const result: AggregatedRow[] = []

  for (const [key, bucket] of Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    const count = bucket.length

    // SUM for counts
    const sum = (field: keyof MetricsRow): number =>
      bucket.reduce((acc, r) => acc + ((r[field] as number) ?? 0), 0)

    // AVG for rate/average fields
    const avg = (field: keyof MetricsRow): number => {
      const nonZero = bucket.filter((r) => (r[field] as number) > 0)
      if (nonZero.length === 0) return 0
      return (
        Math.round(
          (nonZero.reduce((acc, r) => acc + ((r[field] as number) ?? 0), 0) / nonZero.length) * 10
        ) / 10
      )
    }

    result.push({
      period_key:               key,
      calls_total:              sum('calls_total'),
      calls_answered:           sum('calls_answered'),
      calls_missed:             sum('calls_missed'),
      avg_call_duration_seconds: avg('avg_call_duration_seconds'),
      leads_created:            sum('leads_created'),
      leads_converted:          sum('leads_converted'),
      appointments_booked:      sum('appointments_booked'),
      appointments_completed:   sum('appointments_completed'),
      revenue:                  Math.round(sum('revenue') * 100) / 100,
      invoices_sent:            sum('invoices_sent'),
      invoices_paid:            sum('invoices_paid'),
      invoices_overdue:         sum('invoices_overdue'),
      reviews_received:         sum('reviews_received'),
      avg_review_rating:        avg('avg_review_rating'),
      automations_executed:     sum('automations_executed'),
      days_in_period:           count,
    })
  }

  return result
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single() as { data: { organization_id: string } | null }
  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 401 })

  const orgId = profile.organization_id

  // ---------------------------------------------------------------------------
  // Query params
  // ---------------------------------------------------------------------------
  const { searchParams } = new URL(request.url)
  const periodDays = Math.max(1, Math.min(365, parseInt(searchParams.get('period') ?? '30', 10) || 30))
  const groupingParam = searchParams.get('grouping') ?? 'daily'
  const grouping = ['daily', 'weekly', 'monthly'].includes(groupingParam)
    ? (groupingParam as 'daily' | 'weekly' | 'monthly')
    : 'daily'

  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(now.getDate() - periodDays)
  const startDateStr = startDate.toISOString().slice(0, 10)

  // ---------------------------------------------------------------------------
  // Fetch from business_metrics_daily
  // ---------------------------------------------------------------------------
   
  const svc = supabase as any

  const { data: rawRows, error } = await svc
    .from('business_metrics_daily')
    .select(
      'metric_date, calls_total, calls_answered, calls_missed, avg_call_duration_seconds, leads_created, leads_converted, appointments_booked, appointments_completed, revenue, invoices_sent, invoices_paid, invoices_overdue, reviews_received, avg_review_rating, automations_executed'
    )
    .eq('organization_id', orgId)
    .gte('metric_date', startDateStr)
    .order('metric_date', { ascending: true })

  if (error) {
    console.error('trends query error:', error)
    return Response.json({ error: 'Failed to fetch trends data' }, { status: 500 })
  }

  const rows: MetricsRow[] = rawRows ?? []

  // ---------------------------------------------------------------------------
  // Return data: raw rows for daily, aggregated for weekly/monthly
  // ---------------------------------------------------------------------------
  if (grouping === 'daily') {
    return Response.json({
      grouping,
      period_days: periodDays,
      data: rows,
    })
  }

  const aggregated = aggregateRows(rows, grouping)

  return Response.json({
    grouping,
    period_days: periodDays,
    data: aggregated,
  })
}
