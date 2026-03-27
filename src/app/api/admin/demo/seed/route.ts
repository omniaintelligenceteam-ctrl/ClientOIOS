import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  demoOrg, demoUsers, demoCustomers, demoCalls, demoLeads,
  demoAppointments, demoInvoices, demoReviews, demoActivity, demoTeam,
} from '@/lib/demo-data'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL || 'demo@mikesplumbing.oios.com'
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || ''

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

async function createOrFindAuthUser(email: string, password: string): Promise<string> {
  // Try to create
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  })

  if (resp.ok) {
    const data = await resp.json()
    return data.id
  }

  // Already exists — find by email
  const listResp = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  )
  if (listResp.ok) {
    const data = await listResp.json()
    const users = data.users || data
    const existing = users.find((u: { email: string }) => u.email === email)
    if (existing) return existing.id
  }

  throw new Error(`Failed to create or find auth user: ${email}`)
}

/**
 * POST /api/admin/demo/seed
 *
 * Creates demo org, users, and all demo data using batch inserts.
 * Protected by DEMO_SEED_SECRET header.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-demo-secret')
  const expectedSecret = process.env.DEMO_SEED_SECRET
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!DEMO_PASSWORD) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_DEMO_PASSWORD env var is required' },
      { status: 500 }
    )
  }

  const supabase = getSupabase()
  const idMap: Record<string, string> = {}
  const errors: string[] = []

  try {
    // ── 1. Create or find Organization ──────────────────────────────
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', demoOrg.slug)
      .single()

    let orgId: string

    if (existingOrg) {
      orgId = existingOrg.id
    } else {
      const { id: _orgId, ...orgFields } = demoOrg
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert(orgFields as Record<string, unknown>)
        .select('id')
        .single()

      if (orgError || !newOrg) {
        return NextResponse.json(
          { error: 'Failed to create organization', detail: orgError?.message },
          { status: 500 }
        )
      }
      orgId = newOrg.id
    }
    idMap[demoOrg.id] = orgId

    // ── 2. Create Auth Users (parallel) ─────────────────────────────
    const userEmails: Record<string, string> = {
      'user-mike': DEMO_EMAIL,
      'user-jake': `jake.demo.${orgId.slice(0, 8)}@mikesplumbing.oios.com`,
      'user-carlos': `carlos.demo.${orgId.slice(0, 8)}@mikesplumbing.oios.com`,
    }

    const authResults = await Promise.allSettled(
      demoUsers.map(u => {
        const email = userEmails[u.id]
        const pw = u.id === 'user-mike' ? DEMO_PASSWORD : `DemoTeam!${orgId.slice(0, 8)}`
        return createOrFindAuthUser(email, pw).then(authId => {
          idMap[u.id] = authId
        })
      })
    )
    authResults.forEach((r, i) => {
      if (r.status === 'rejected') errors.push(`Auth ${demoUsers[i].id}: ${r.reason}`)
    })

    // ── 3. Batch upsert Users rows ──────────────────────────────────
    const userRows = demoUsers
      .filter(u => idMap[u.id])
      .map(u => {
        const { id, organization_id, email: _e, ...fields } = u
        return { id: idMap[u.id], organization_id: orgId, email: userEmails[u.id], ...fields }
      })

    if (userRows.length > 0) {
      const { error } = await supabase.from('users').upsert(userRows, { onConflict: 'id' })
      if (error) errors.push(`Users batch: ${error.message}`)
    }

    // ── 4. Batch insert Customers ───────────────────────────────────
    const customerRows = demoCustomers.map(c => {
      const { id, organization_id, ...fields } = c
      return { organization_id: orgId, ...fields }
    })
    const { data: insertedCustomers, error: custErr } = await supabase
      .from('customers')
      .insert(customerRows)
      .select('id')

    if (custErr) {
      errors.push(`Customers batch: ${custErr.message}`)
    } else if (insertedCustomers) {
      insertedCustomers.forEach((row, i) => {
        idMap[demoCustomers[i].id] = row.id
      })
    }

    // ── 5. Batch insert Leads ───────────────────────────────────────
    const leadRows = demoLeads.map(l => {
      const { id, organization_id, customer_id, assigned_to, ...fields } = l
      return {
        organization_id: orgId,
        customer_id: customer_id ? idMap[customer_id] || null : null,
        assigned_to: assigned_to ? idMap[assigned_to] || null : null,
        ...fields,
      }
    })
    const { data: insertedLeads, error: leadErr } = await supabase
      .from('leads')
      .insert(leadRows)
      .select('id')

    if (leadErr) {
      errors.push(`Leads batch: ${leadErr.message}`)
    } else if (insertedLeads) {
      insertedLeads.forEach((row, i) => {
        idMap[demoLeads[i].id] = row.id
      })
    }

    // ── 6. Batch insert Appointments ────────────────────────────────
    const aptRows = demoAppointments.map(a => {
      const { id, organization_id, customer_id, lead_id, assigned_to, ...fields } = a
      return {
        organization_id: orgId,
        customer_id: customer_id ? idMap[customer_id] || null : null,
        lead_id: lead_id ? idMap[lead_id] || null : null,
        assigned_to: assigned_to ? idMap[assigned_to] || null : null,
        ...fields,
      }
    })
    const { data: insertedApts, error: aptErr } = await supabase
      .from('appointments')
      .insert(aptRows)
      .select('id')

    if (aptErr) {
      errors.push(`Appointments batch: ${aptErr.message}`)
    } else if (insertedApts) {
      insertedApts.forEach((row, i) => {
        idMap[demoAppointments[i].id] = row.id
      })
    }

    // ── 7. Batch insert Calls ───────────────────────────────────────
    const callRows = demoCalls.map(c => {
      const { id, organization_id, lead_id, appointment_id, ...fields } = c
      return {
        organization_id: orgId,
        lead_id: lead_id ? idMap[lead_id] || null : null,
        appointment_id: appointment_id ? idMap[appointment_id] || null : null,
        ...fields,
      }
    })
    const { data: insertedCalls, error: callErr } = await supabase
      .from('calls')
      .insert(callRows)
      .select('id')

    if (callErr) {
      errors.push(`Calls batch: ${callErr.message}`)
    } else if (insertedCalls) {
      insertedCalls.forEach((row, i) => {
        idMap[demoCalls[i].id] = row.id
      })
    }

    // ── 8. Batch insert Invoices, Reviews, Activity, Team (parallel)
    const [invResult, revResult, actResult, teamResult] = await Promise.all([
      // Invoices
      supabase
        .from('invoices')
        .insert(demoInvoices.map(inv => {
          const { id, organization_id, customer_id, appointment_id, ...fields } = inv
          return {
            organization_id: orgId,
            customer_id: customer_id ? idMap[customer_id] || null : null,
            appointment_id: appointment_id ? idMap[appointment_id] || null : null,
            ...fields,
          }
        })),
      // Reviews
      supabase
        .from('reviews')
        .insert(demoReviews.map(rev => {
          const { id, organization_id, customer_id, ...fields } = rev
          return {
            organization_id: orgId,
            customer_id: customer_id ? idMap[customer_id] || null : null,
            ...fields,
          }
        })),
      // Activity Feed
      supabase
        .from('activity_feed')
        .insert(demoActivity.map(act => {
          const { id, organization_id, entity_id, ...fields } = act
          return {
            organization_id: orgId,
            entity_id: entity_id ? idMap[entity_id] || entity_id : null,
            ...fields,
          }
        })),
      // Team Members
      supabase
        .from('team_members')
        .insert(demoTeam.map(tm => {
          const { id, organization_id, user_id, ...fields } = tm
          return {
            organization_id: orgId,
            user_id: user_id ? idMap[user_id] || null : null,
            ...fields,
          }
        })),
    ])

    if (invResult.error) errors.push(`Invoices batch: ${invResult.error.message}`)
    if (revResult.error) errors.push(`Reviews batch: ${revResult.error.message}`)
    if (actResult.error) errors.push(`Activity batch: ${actResult.error.message}`)
    if (teamResult.error) errors.push(`Team batch: ${teamResult.error.message}`)

    return NextResponse.json({
      success: true,
      organization_id: orgId,
      demo_email: DEMO_EMAIL,
      entities_mapped: Object.keys(idMap).length,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 201 })

  } catch (err) {
    console.error('Demo seed error:', err)
    return NextResponse.json(
      { error: 'Internal server error', detail: String(err) },
      { status: 500 }
    )
  }
}
