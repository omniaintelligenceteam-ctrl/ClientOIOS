import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/command-center/settings/crons
 * Returns all client cron schedules.
 */
export async function GET() {
  try {
    const supabase = getServiceSupabase()

    const { data: schedules, error } = await supabase
      .from('client_cron_schedules')
      .select('*, organization:organizations(id, name)')
      .order('name')

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch cron schedules', detail: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ schedules }, { status: 200 })
  } catch (err) {
    console.error('GET /api/command-center/settings/crons error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
