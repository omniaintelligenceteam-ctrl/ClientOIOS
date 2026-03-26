// ============================================================
// OIOS Client Dashboard — ROI Analytics Endpoint
// GET /api/analytics/roi?period=30
// Aggregates from business_metrics_daily + leads for the period
// ============================================================

import { createSupabaseServerClient } from '@/lib/supabase-server'
import {
  calculateConversionRate,
  calculateLeadFunnel,
  calculateRevenueBySource,
  calculateOIOSROI,
} from '@/lib/analytics/roi-calculator'

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

  // Fetch org tier for pricing
  const { data: org } = await supabase
    .from('organizations')
    .select('tier')
    .eq('id', profile.organization_id)
    .single() as { data: { tier: string } | null }

  const orgId = profile.organization_id

  // ---------------------------------------------------------------------------
  // Query params
  // ---------------------------------------------------------------------------
  const { searchParams } = new URL(request.url)
  const periodDays = Math.max(1, Math.min(365, parseInt(searchParams.get('period') ?? '30', 10) || 30))

  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(now.getDate() - periodDays)
  const startDateStr = startDate.toISOString().slice(0, 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = supabase as any

  // ---------------------------------------------------------------------------
  // Fetch data in parallel
  // ---------------------------------------------------------------------------
  const [metricsRes, leadsRes] = await Promise.all([
    // Aggregated daily metrics for the period
    svc
      .from('business_metrics_daily')
      .select(
        'calls_total, leads_created, revenue, invoices_paid'
      )
      .eq('organization_id', orgId)
      .gte('metric_date', startDateStr)
      .order('metric_date', { ascending: true }),

    // Raw leads for funnel + source breakdown
    svc
      .from('leads')
      .select('status, source, estimated_value')
      .eq('organization_id', orgId)
      .gte('created_at', startDate.toISOString()),
  ])

  // ---------------------------------------------------------------------------
  // Aggregate metrics totals
  // ---------------------------------------------------------------------------
  type MetricsRow = {
    calls_total: number
    leads_created: number
    revenue: number
    invoices_paid: number
  }

  const rows: MetricsRow[] = metricsRes.data ?? []

  const total_revenue = rows.reduce((sum, r) => sum + (r.revenue ?? 0), 0)
  const total_calls   = rows.reduce((sum, r) => sum + (r.calls_total ?? 0), 0)
  const total_leads   = rows.reduce((sum, r) => sum + (r.leads_created ?? 0), 0)

  // ---------------------------------------------------------------------------
  // Lead funnel and source breakdown (from raw leads)
  // ---------------------------------------------------------------------------
  type LeadRow = { status: string; source: string; estimated_value: number }
  const leads: LeadRow[] = leadsRes.data ?? []

  const leads_won = leads.filter((l) => l.status === 'won').length
  const conversion_rate = calculateConversionRate(leads)
  const lead_funnel = calculateLeadFunnel(leads)
  const revenue_by_source = calculateRevenueBySource(leads)

  // ---------------------------------------------------------------------------
  // OIOS ROI calculation
  // ---------------------------------------------------------------------------
  const avg_call_value = total_calls > 0 ? Math.round((total_revenue / total_calls) * 100) / 100 : 0
  const TIER_PRICING: Record<string, number> = {
    answering_service: 197, receptionist: 297, office_manager: 497, coo: 997, growth_engine: 1497,
  }
  const monthly_subscription = TIER_PRICING[org?.tier ?? 'answering_service'] ?? 297

  const oios_roi = calculateOIOSROI({
    totalRevenue: total_revenue,
    totalCalls: total_calls,
    avgCallValue: avg_call_value,
    monthlySubscription: monthly_subscription,
  })

  return Response.json({
    period_days:      periodDays,
    total_revenue:    Math.round(total_revenue * 100) / 100,
    total_calls,
    total_leads,
    leads_won,
    conversion_rate,
    avg_call_value,
    revenue_by_source,
    lead_funnel,
    oios_roi: {
      roi:              oios_roi.roi,
      revenue_per_call: oios_roi.revenuePerCall,
      net_value:        oios_roi.netValue,
    },
  })
}
