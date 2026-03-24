import type { Organization } from '@/lib/types'

// Use a generic client type to avoid complex Supabase generic mismatches
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

interface AggregateStats {
  totalCustomers: number
  activeLeads: Record<string, number>
  upcomingAppointments: number
  overdueInvoices: { count: number; total: number }
  avgReviewRating: number
  reviewCount: number
  callsThisWeek: number
}

async function fetchAggregateStats(
  supabase: SupabaseClient,
  orgId: string
): Promise<AggregateStats> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [customers, leads, appointments, invoices, reviews, calls] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('leads').select('status').eq('organization_id', orgId).not('status', 'in', '("won","lost")'),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('scheduled_date', now.toISOString().split('T')[0]).lte('scheduled_date', weekFromNow),
    supabase.from('invoices').select('amount,amount_paid').eq('organization_id', orgId).eq('status', 'overdue'),
    supabase.from('reviews').select('rating').eq('organization_id', orgId),
    supabase.from('calls').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('started_at', weekAgo),
  ])

  const leadCounts: Record<string, number> = {}
  if (leads.data) {
    for (const lead of leads.data) {
      leadCounts[lead.status] = (leadCounts[lead.status] || 0) + 1
    }
  }

  const overdueTotal = invoices.data?.reduce((sum: number, inv: { amount: number; amount_paid: number }) => sum + (inv.amount - inv.amount_paid), 0) ?? 0
  const ratings: number[] = reviews.data?.map((r: { rating: number }) => r.rating) ?? []
  const avgRating = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0

  return {
    totalCustomers: customers.count ?? 0,
    activeLeads: leadCounts,
    upcomingAppointments: appointments.count ?? 0,
    overdueInvoices: { count: invoices.data?.length ?? 0, total: overdueTotal },
    avgReviewRating: Math.round(avgRating * 10) / 10,
    reviewCount: ratings.length,
    callsThisWeek: calls.count ?? 0,
  }
}

function formatStats(stats: AggregateStats): string {
  const leadSummary = Object.entries(stats.activeLeads)
    .map(([status, count]) => `${status}: ${count}`)
    .join(', ') || 'none'

  return `Quick Stats (current):
- Total customers: ${stats.totalCustomers}
- Active leads: ${leadSummary}
- Upcoming appointments (next 7 days): ${stats.upcomingAppointments}
- Overdue invoices: ${stats.overdueInvoices.count}, total $${stats.overdueInvoices.total.toLocaleString()}
- Average review rating: ${stats.avgReviewRating}/5 (${stats.reviewCount} reviews)
- Calls this week: ${stats.callsThisWeek}`
}

function formatOrg(org: Organization): string {
  const hours = org.business_hours
    ? Object.entries(org.business_hours)
        .map(([day, h]) => `${day}: ${h.open}-${h.close}`)
        .join(', ')
    : 'Not set'

  return `Organization: ${org.name} (${org.trade})
AI Agent: ${org.ai_agent_name}
Services: ${org.services_offered?.join(', ') ?? 'Not set'}
Business hours: ${hours}
Service area: ${org.service_area?.join(', ') ?? 'Not set'}
Emergency keywords: ${org.emergency_keywords?.join(', ') ?? 'Not set'}
Emergency phone: ${org.emergency_phone ?? 'Not set'}
Timezone: ${org.timezone}`
}

// Intent detection for conditional data fetching
interface DetectedIntents {
  calls: boolean
  leads: boolean
  customers: boolean
  invoices: boolean
  appointments: boolean
  reviews: boolean
  team: boolean
  activity: boolean
  customerName: string | null
}

function detectIntents(message: string): DetectedIntents {
  const lower = message.toLowerCase()

  // Try to extract a customer name (simple heuristic: after "about" or name-like patterns)
  let customerName: string | null = null
  const nameMatch = message.match(/(?:about|for|customer|client)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
  if (nameMatch) customerName = nameMatch[1]

  return {
    calls: /\b(call|phone|answer|miss|voicemail|transcript|ring)\b/i.test(lower),
    leads: /\b(lead|pipeline|prospect|follow.?up|conversion|funnel)\b/i.test(lower),
    customers: /\b(customer|client|account)\b/i.test(lower) || customerName !== null,
    invoices: /\b(invoice|payment|overdue|revenue|bill|owe|paid|unpaid)\b/i.test(lower),
    appointments: /\b(appointment|schedule|booking|calendar|upcoming|today|tomorrow)\b/i.test(lower),
    reviews: /\b(review|rating|reputation|star|feedback|yelp|google)\b/i.test(lower),
    team: /\b(team|technician|staff|employee|assign|perform)\b/i.test(lower),
    activity: /\b(activity|what happened|recent|today|update|feed|log)\b/i.test(lower),
    customerName,
  }
}

async function fetchConditionalContext(
  supabase: SupabaseClient,
  orgId: string,
  intents: DetectedIntents
): Promise<string> {
  const sections: string[] = []
  const fetches: Promise<void>[] = []

  if (intents.calls) {
    fetches.push(
      supabase
        .from('calls')
        .select('caller_name, status, duration_seconds, started_at, transcript_summary, sentiment, intent')
        .eq('organization_id', orgId)
        .order('started_at', { ascending: false })
        .limit(10)
        .then(({ data }: { data: any[] | null }) => {
          if (data?.length) {
            sections.push('Recent Calls:\n' + data.map(c =>
              `- ${c.caller_name ?? 'Unknown'} | ${c.status} | ${c.duration_seconds}s | ${c.sentiment} | ${c.transcript_summary ?? 'No summary'}`
            ).join('\n'))
          }
        })
    )
  }

  if (intents.leads) {
    fetches.push(
      supabase
        .from('leads')
        .select('first_name, last_name, status, priority, service_needed, estimated_value, follow_up_date')
        .eq('organization_id', orgId)
        .not('status', 'in', '("won","lost")')
        .order('priority', { ascending: true })
        .then(({ data }: { data: any[] | null }) => {
          if (data?.length) {
            sections.push('Active Leads:\n' + data.map(l =>
              `- ${l.first_name} ${l.last_name} | ${l.status} | ${l.priority} | ${l.service_needed} | $${l.estimated_value} | Follow-up: ${l.follow_up_date ?? 'Not set'}`
            ).join('\n'))
          }
        })
    )
  }

  if (intents.customers) {
    const query = supabase
      .from('customers')
      .select('first_name, last_name, phone, email, total_jobs, total_revenue, lifetime_value, satisfaction_score, last_contact_at, notes, tags')
      .eq('organization_id', orgId)

    if (intents.customerName) {
      const parts = intents.customerName.split(' ')
      if (parts.length >= 2) {
        query.ilike('first_name', `%${parts[0]}%`).ilike('last_name', `%${parts[1]}%`)
      } else {
        query.or(`first_name.ilike.%${parts[0]}%,last_name.ilike.%${parts[0]}%`)
      }
    } else {
      query.order('lifetime_value', { ascending: false }).limit(10)
    }

    fetches.push(
      query.then(({ data }: { data: any[] | null }) => {
        if (data?.length) {
          sections.push('Customers:\n' + data.map(c =>
            `- ${c.first_name} ${c.last_name} | ${c.phone} | Jobs: ${c.total_jobs} | Revenue: $${c.total_revenue} | LTV: $${c.lifetime_value} | Satisfaction: ${c.satisfaction_score ?? 'N/A'}/5${c.notes ? ' | Notes: ' + c.notes : ''}`
          ).join('\n'))
        }
      })
    )
  }

  if (intents.invoices) {
    fetches.push(
      supabase
        .from('invoices')
        .select('invoice_number, status, amount, amount_paid, due_date')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(15)
        .then(({ data }: { data: any[] | null }) => {
          if (data?.length) {
            sections.push('Recent Invoices:\n' + data.map(i =>
              `- #${i.invoice_number} | ${i.status} | $${i.amount} (paid: $${i.amount_paid}) | Due: ${i.due_date}`
            ).join('\n'))
          }
        })
    )
  }

  if (intents.appointments) {
    fetches.push(
      supabase
        .from('appointments')
        .select('service_type, status, scheduled_date, scheduled_time_start, scheduled_time_end, address, assigned_to, notes')
        .eq('organization_id', orgId)
        .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true })
        .limit(10)
        .then(({ data }: { data: any[] | null }) => {
          if (data?.length) {
            sections.push('Upcoming Appointments:\n' + data.map(a =>
              `- ${a.scheduled_date} ${a.scheduled_time_start}-${a.scheduled_time_end} | ${a.service_type} | ${a.status} | ${a.address}${a.notes ? ' | ' + a.notes : ''}`
            ).join('\n'))
          }
        })
    )
  }

  if (intents.reviews) {
    fetches.push(
      supabase
        .from('reviews')
        .select('rating, reviewer_name, review_text, platform, response_status, review_date')
        .eq('organization_id', orgId)
        .order('review_date', { ascending: false })
        .limit(10)
        .then(({ data }: { data: any[] | null }) => {
          if (data?.length) {
            sections.push('Recent Reviews:\n' + data.map(r =>
              `- ${r.rating}/5 by ${r.reviewer_name} on ${r.platform} (${r.review_date}) | Response: ${r.response_status}${r.review_text ? ' | "' + r.review_text.slice(0, 100) + '"' : ''}`
            ).join('\n'))
          }
        })
    )
  }

  if (intents.team) {
    fetches.push(
      supabase
        .from('team_members')
        .select('name, role, skills, is_on_call, performance_score, total_jobs_completed')
        .eq('organization_id', orgId)
        .then(({ data }: { data: any[] | null }) => {
          if (data?.length) {
            sections.push('Team Members:\n' + data.map(t =>
              `- ${t.name} | ${t.role} | Skills: ${t.skills?.join(', ') ?? 'N/A'} | On-call: ${t.is_on_call ? 'Yes' : 'No'} | Score: ${t.performance_score ?? 'N/A'} | Jobs: ${t.total_jobs_completed}`
            ).join('\n'))
          }
        })
    )
  }

  if (intents.activity) {
    fetches.push(
      supabase
        .from('activity_feed')
        .select('actor, action, entity_type, importance, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(15)
        .then(({ data }: { data: any[] | null }) => {
          if (data?.length) {
            sections.push('Recent Activity:\n' + data.map(a =>
              `- [${a.importance}] ${a.actor}: ${a.action} (${a.entity_type}) at ${a.created_at}`
            ).join('\n'))
          }
        })
    )
  }

  await Promise.all(fetches)
  return sections.join('\n\n')
}

export async function buildContext(
  supabase: SupabaseClient,
  org: Organization,
  message: string
): Promise<string> {
  // Fetch team roster for the always-included context
  const { data: team } = await supabase
    .from('team_members')
    .select('name, role')
    .eq('organization_id', org.id)

  const teamRoster = team?.length
    ? `Team: ${team.map((t: { name: string; role: string }) => `${t.name} (${t.role})`).join(', ')}`
    : 'Team: No members configured'

  const [stats, conditionalContext] = await Promise.all([
    fetchAggregateStats(supabase, org.id),
    fetchConditionalContext(supabase, org.id, detectIntents(message)),
  ])

  const parts = [
    formatOrg(org),
    teamRoster,
    formatStats(stats),
  ]

  if (conditionalContext) {
    parts.push('--- Detailed Data ---', conditionalContext)
  }

  return parts.join('\n\n')
}
