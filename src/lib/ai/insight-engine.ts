// ============================================================
// OIOS — AI Insight Engine (heuristic only, zero API calls)
// ============================================================

export type InsightType = 'positive' | 'warning' | 'neutral' | 'info'

export interface Insight {
  text: string
  type: InsightType
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function pct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

function absChg(current: number, previous: number): number {
  return current - previous
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Generate a heuristic insight for a metric.
 *
 * @param metricName   Human-readable metric label, e.g. "Calls Today"
 * @param currentValue Current period value
 * @param previousValue Previous period value for comparison
 * @param context      Optional extra context: { unit, goal, period }
 */
export function generateStatInsight(
  metricName: string,
  currentValue: number,
  previousValue: number,
  context?: {
    unit?: string        // 'calls' | 'leads' | 'jobs' | '$' | '%'
    goal?: number        // daily / monthly goal
    period?: string      // 'yesterday' | 'last week' | 'last month'
  }
): Insight {
  const unit = context?.unit ?? ''
  const goal = context?.goal
  const period = context?.period ?? 'yesterday'
  const change = absChg(currentValue, previousValue)
  const changePct = pct(currentValue, previousValue)
  const name = metricName.toLowerCase()

  // ---- Goal-based insight (takes priority if goal provided) ----
  if (goal != null && goal > 0) {
    const pctToGoal = Math.round((currentValue / goal) * 100)
    if (pctToGoal >= 100) {
      return { text: `🎯 Goal hit! ${pctToGoal}% of target reached`, type: 'positive' }
    }
    if (pctToGoal >= 80) {
      return { text: `Almost there — ${pctToGoal}% of daily goal`, type: 'info' }
    }
    if (pctToGoal >= 50) {
      return { text: `Halfway to goal (${pctToGoal}% of ${goal}${unit})`, type: 'neutral' }
    }
    if (pctToGoal > 0) {
      return { text: `${pctToGoal}% of goal — pace up to hit ${goal}${unit}`, type: 'warning' }
    }
    return { text: `No progress toward goal yet`, type: 'warning' }
  }

  // ---- No previous data ----
  if (previousValue === 0 && currentValue === 0) {
    return { text: `No ${name} data yet today`, type: 'neutral' }
  }

  if (previousValue === 0 && currentValue > 0) {
    return { text: `${currentValue}${unit} recorded — no ${period} baseline`, type: 'info' }
  }

  // ---- Revenue-specific ----
  if (name.includes('revenue') || name.includes('$') || unit === '$') {
    if (changePct >= 20) return { text: `Up ${changePct}% vs ${period} — strong month`, type: 'positive' }
    if (changePct >= 5) return { text: `+${changePct}% vs ${period}`, type: 'positive' }
    if (changePct >= -5) return { text: `Flat vs ${period} (±5%)`, type: 'neutral' }
    if (changePct >= -15) return { text: `Down ${Math.abs(changePct)}% vs ${period} — keep pushing`, type: 'warning' }
    return { text: `Revenue down ${Math.abs(changePct)}% vs ${period} — needs attention`, type: 'warning' }
  }

  // ---- Conversion rate ----
  if (name.includes('conversion') || unit === '%') {
    if (currentValue >= 40) return { text: `${currentValue}% conversion — excellent close rate`, type: 'positive' }
    if (currentValue >= 25) return { text: `${currentValue}% conversion — solid performance`, type: 'positive' }
    if (currentValue >= 15) return { text: `${currentValue}% conversion — room to improve`, type: 'neutral' }
    return { text: `${currentValue}% conversion — focus on lead quality`, type: 'warning' }
  }

  // ---- Calls ----
  if (name.includes('call')) {
    if (change > 0 && changePct >= 20) return { text: `${change} more calls than ${period} (+${changePct}%)`, type: 'positive' }
    if (change > 0) return { text: `+${change} calls vs ${period}`, type: 'positive' }
    if (change === 0) return { text: `Same call volume as ${period}`, type: 'neutral' }
    if (changePct >= -15) return { text: `${Math.abs(change)} fewer calls than ${period}`, type: 'neutral' }
    return { text: `Call volume down ${Math.abs(changePct)}% vs ${period}`, type: 'warning' }
  }

  // ---- Leads ----
  if (name.includes('lead')) {
    if (currentValue === 0) return { text: `No leads yet today — check intake channels`, type: 'warning' }
    if (change > 0 && changePct >= 30) return { text: `Hot day! ${changePct}% more leads than ${period}`, type: 'positive' }
    if (change > 0) return { text: `+${change} leads vs ${period} — good momentum`, type: 'positive' }
    if (change === 0) return { text: `Same lead flow as ${period}`, type: 'neutral' }
    return { text: `${Math.abs(change)} fewer leads than ${period} — review ads`, type: 'warning' }
  }

  // ---- Jobs / appointments ----
  if (name.includes('job') || name.includes('book') || name.includes('appt') || name.includes('appointment')) {
    if (currentValue === 0) return { text: `No jobs booked yet today`, type: 'warning' }
    if (change > 0) return { text: `${currentValue} job${currentValue !== 1 ? 's' : ''} booked — great pace`, type: 'positive' }
    if (change === 0) return { text: `Booking rate holding steady`, type: 'neutral' }
    return { text: `Fewer bookings than ${period} — follow up on open leads`, type: 'warning' }
  }

  // ---- Pipeline value ----
  if (name.includes('pipeline')) {
    if (currentValue > 10000) return { text: `$${(currentValue / 1000).toFixed(0)}k active pipeline`, type: 'positive' }
    if (currentValue > 5000) return { text: `Healthy pipeline — keep qualifying leads`, type: 'info' }
    if (currentValue > 0) return { text: `Pipeline light — time to prospect`, type: 'warning' }
    return { text: `Empty pipeline — action needed`, type: 'warning' }
  }

  // ---- Generic fallback ----
  if (changePct >= 15) return { text: `Up ${changePct}% vs ${period}`, type: 'positive' }
  if (changePct >= 0) return { text: `Steady — up ${changePct}% vs ${period}`, type: 'neutral' }
  if (changePct >= -15) return { text: `Down ${Math.abs(changePct)}% vs ${period}`, type: 'neutral' }
  return { text: `Down ${Math.abs(changePct)}% vs ${period} — monitor closely`, type: 'warning' }
}

// ---------------------------------------------------------------------------
// Convenience presets for common dashboard metrics
// ---------------------------------------------------------------------------

export function insightForCalls(today: number, yesterday: number): Insight {
  return generateStatInsight('Calls Today', today, yesterday, { unit: ' calls', period: 'yesterday' })
}

export function insightForLeads(today: number, yesterday: number): Insight {
  return generateStatInsight('New Leads', today, yesterday, { unit: ' leads', period: 'yesterday' })
}

export function insightForJobsBooked(today: number, yesterdayJobs: number): Insight {
  return generateStatInsight('Jobs Booked', today, yesterdayJobs, { unit: ' jobs', period: 'yesterday' })
}

export function insightForRevenue(thisMonth: number, lastMonth: number): Insight {
  return generateStatInsight('Revenue This Month', thisMonth, lastMonth, { unit: '', period: 'last month' })
}

export function insightForConversion(rate: number): Insight {
  return generateStatInsight('Conversion Rate', rate, 0, { unit: '%' })
}

export function insightForPipeline(value: number): Insight {
  return generateStatInsight('Pipeline Value', value, 0, { unit: '$' })
}
