// ============================================================
// OIOS Client Dashboard — ROI Calculator
// Pure functions for revenue attribution and funnel analysis
// ============================================================

// ---------------------------------------------------------------------------
// calculateConversionRate
// Returns percentage of leads with status 'won'
// ---------------------------------------------------------------------------

export function calculateConversionRate(leads: { status: string }[]): number {
  if (leads.length === 0) return 0
  const won = leads.filter((l) => l.status === 'won').length
  return Math.round((won / leads.length) * 1000) / 10 // one decimal place
}

// ---------------------------------------------------------------------------
// calculateLeadFunnel
// Returns ordered funnel stages with counts and rates relative to total
// ---------------------------------------------------------------------------

export function calculateLeadFunnel(
  leads: { status: string }[]
): { stage: string; count: number; rate: number }[] {
  const total = leads.length

  const contacted = leads.filter((l) =>
    ['contacted', 'qualified', 'proposal_sent', 'won'].includes(l.status)
  ).length

  const qualified = leads.filter((l) =>
    ['qualified', 'proposal_sent', 'won'].includes(l.status)
  ).length

  const proposalSent = leads.filter((l) =>
    ['proposal_sent', 'won'].includes(l.status)
  ).length

  const won = leads.filter((l) => l.status === 'won').length

  const rate = (count: number) =>
    total > 0 ? Math.round((count / total) * 1000) / 10 : 0

  return [
    { stage: 'Total Leads',    count: total,       rate: 100 },
    { stage: 'Contacted',      count: contacted,   rate: rate(contacted) },
    { stage: 'Qualified',      count: qualified,   rate: rate(qualified) },
    { stage: 'Proposal Sent',  count: proposalSent, rate: rate(proposalSent) },
    { stage: 'Won',            count: won,          rate: rate(won) },
  ]
}

// ---------------------------------------------------------------------------
// calculateRevenueBySource
// Groups won leads by source, sums estimated_value
// ---------------------------------------------------------------------------

export function calculateRevenueBySource(
  leads: { source: string; estimated_value: number; status: string }[]
): { source: string; revenue: number; count: number }[] {
  const map = new Map<string, { revenue: number; count: number }>()

  for (const lead of leads) {
    if (lead.status !== 'won') continue
    const existing = map.get(lead.source) ?? { revenue: 0, count: 0 }
    map.set(lead.source, {
      revenue: existing.revenue + (lead.estimated_value ?? 0),
      count: existing.count + 1,
    })
  }

  return Array.from(map.entries())
    .map(([source, { revenue, count }]) => ({ source, revenue, count }))
    .sort((a, b) => b.revenue - a.revenue)
}

// ---------------------------------------------------------------------------
// calculateOIOSROI
// ROI = ((totalRevenue - monthlySubscription) / monthlySubscription) * 100
// ---------------------------------------------------------------------------

export function calculateOIOSROI(metrics: {
  totalRevenue: number
  totalCalls: number
  avgCallValue: number
  monthlySubscription: number
}): { roi: number; revenuePerCall: number; netValue: number } {
  const { totalRevenue, totalCalls, monthlySubscription } = metrics

  const roi =
    monthlySubscription > 0
      ? Math.round(((totalRevenue - monthlySubscription) / monthlySubscription) * 10000) / 100
      : 0

  const revenuePerCall =
    totalCalls > 0 ? Math.round((totalRevenue / totalCalls) * 100) / 100 : 0

  const netValue = Math.round((totalRevenue - monthlySubscription) * 100) / 100

  return { roi, revenuePerCall, netValue }
}

// ---------------------------------------------------------------------------
// calculateCallHeatmap
// Returns 7x24 matrix [day][hour] with call counts, day 0 = Sunday
// ---------------------------------------------------------------------------

export function calculateCallHeatmap(calls: { started_at: string }[]): number[][] {
  // Initialize 7 days × 24 hours matrix with zeros
  const matrix: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0))

  for (const call of calls) {
    const date = new Date(call.started_at)
    if (isNaN(date.getTime())) continue
    const day = date.getDay()   // 0 = Sunday
    const hour = date.getHours()
    matrix[day][hour] += 1
  }

  return matrix
}
