import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/command-center/settings/routing
 * Returns all task routing rules.
 */
export async function GET() {
  try {
    const supabase = getServiceSupabase()

    const { data: rules, error } = await supabase
      .from('task_routing_rules')
      .select('*')
      .order('priority', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch routing rules', detail: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ rules }, { status: 200 })
  } catch (err) {
    console.error('GET /api/command-center/settings/routing error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
