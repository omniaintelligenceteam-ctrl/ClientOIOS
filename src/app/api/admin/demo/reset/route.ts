import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DEMO_ORG_SLUG } from '@/lib/demo-constants'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * POST /api/admin/demo/reset
 *
 * Deletes all demo data and re-seeds by calling the seed route.
 * Can be triggered by Vercel cron or manually.
 */
export async function POST(request: NextRequest) {
  // Auth check — accept cron secret or demo seed secret
  const secret = request.headers.get('x-demo-secret')
  const expectedSecret = process.env.DEMO_SEED_SECRET
  // Vercel crons include Authorization header
  const cronAuth = request.headers.get('authorization')
  const isCron = cronAuth === `Bearer ${process.env.CRON_SECRET}`

  if (expectedSecret && secret !== expectedSecret && !isCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()

  try {
    // Find the demo org
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', DEMO_ORG_SLUG)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Demo org not found. Run seed first.' }, { status: 404 })
    }

    const orgId = org.id

    // Delete all data for the demo org (order matters for FK constraints)
    const tables = [
      'activity_feed',
      'team_members',
      'reviews',
      'invoices',
      'calls',
      'appointments',
      'leads',
      'customers',
    ]

    const deleteErrors: string[] = []

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('organization_id', orgId)

      if (error) {
        deleteErrors.push(`${table}: ${error.message}`)
      }
    }

    // Now re-seed by calling the seed endpoint internally
    const baseUrl = request.nextUrl.origin
    const seedResp = await fetch(`${baseUrl}/api/admin/demo/seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-secret': expectedSecret || '',
      },
    })

    const seedResult = await seedResp.json()

    return NextResponse.json({
      success: true,
      deleted_from: tables,
      delete_errors: deleteErrors.length > 0 ? deleteErrors : undefined,
      reseed: seedResult,
    })

  } catch (err) {
    console.error('Demo reset error:', err)
    return NextResponse.json(
      { error: 'Internal server error', detail: String(err) },
      { status: 500 }
    )
  }
}
