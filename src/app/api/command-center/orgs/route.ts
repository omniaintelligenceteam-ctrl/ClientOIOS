import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function authorizeBearer(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')
  return token === process.env.COMMAND_CENTER_SECRET
}

/**
 * GET /api/command-center/orgs
 * Returns all organizations with health scores and active task counts.
 * Requires bearer token auth (COMMAND_CENTER_SECRET).
 */
export async function GET(request: NextRequest) {
  try {
    if (!authorizeBearer(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceSupabase()

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, tier, onboarding_status, health_score, last_health_check_at, active_task_count, alert_count')
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
    const orgs = orgData.map((org: { id: string; name: string; tier: string; onboarding_status: string; health_score: number | null; last_health_check_at: string | null; alert_count: number | null }) => {
      // Use DB health_score if available, otherwise fallback to onboarding-based estimate
      let healthScore = org.health_score ?? 75
      if (org.health_score === null || org.health_score === 100) {
        if (org.onboarding_status === 'live') healthScore = 90
        else if (org.onboarding_status === 'testing') healthScore = 70
        else if (org.onboarding_status === 'configuring') healthScore = 50
        else if (org.onboarding_status === 'paused') healthScore = 30
        else if (org.onboarding_status === 'pending') healthScore = 40
      }

      return {
        ...org,
        healthScore,
        activeTaskCount: taskCountMap[org.id] || 0,
        alertCount: org.alert_count || 0,
        lastHealthCheck: org.last_health_check_at,
      }
    })

    return NextResponse.json({ orgs }, { status: 200 })
  } catch (err) {
    console.error('GET /api/command-center/orgs error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
