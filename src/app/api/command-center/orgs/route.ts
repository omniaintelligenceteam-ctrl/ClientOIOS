import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/command-center/orgs
 * Returns all organizations with health scores and active task counts.
 * Uses service role (no RLS) — internal only.
 */
export async function GET() {
  try {
    const supabase = getServiceSupabase()

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, tier, onboarding_status')
      .order('name')

    if (orgError || !orgData) {
      return NextResponse.json(
        { error: 'Failed to fetch organizations', detail: orgError?.message },
        { status: 500 }
      )
    }

    // Fetch active task counts per org
    const { data: taskData } = await supabase
      .from('command_center_tasks')
      .select('organization_id, status')
      .in('status', ['pending', 'assigned', 'in_progress', 'awaiting_approval'])

    const taskCountMap: Record<string, number> = {}
    if (taskData) {
      taskData.forEach((t: { organization_id: string; status: string }) => {
        taskCountMap[t.organization_id] = (taskCountMap[t.organization_id] || 0) + 1
      })
    }

    // Build enriched org list with health scores
    const orgs = orgData.map((org: { id: string; name: string; tier: string; onboarding_status: string }) => {
      let healthScore = 75
      if (org.onboarding_status === 'live') healthScore = 90
      else if (org.onboarding_status === 'testing') healthScore = 70
      else if (org.onboarding_status === 'configuring') healthScore = 50
      else if (org.onboarding_status === 'paused') healthScore = 30
      else if (org.onboarding_status === 'pending') healthScore = 40

      return {
        ...org,
        healthScore,
        activeTaskCount: taskCountMap[org.id] || 0,
      }
    })

    return NextResponse.json({ orgs }, { status: 200 })
  } catch (err) {
    console.error('GET /api/command-center/orgs error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
