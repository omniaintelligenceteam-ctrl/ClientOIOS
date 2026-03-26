import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/command-center/orgs/[orgId]
 * Returns single org workspace data: org details, recent tasks, latest health score,
 * recent documents, and recent agent messages.
 * Internal only — no auth required.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    const supabase = getServiceSupabase()

    // Run all queries in parallel
    const [orgResult, tasksResult, healthResult, documentsResult, messagesResult] =
      await Promise.all([
        // Organization details
        supabase
          .from('organizations')
          .select(
            'id, name, tier, onboarding_status, trade, phone_number, timezone, health_score, last_health_check_at, active_task_count, alert_count'
          )
          .eq('id', orgId)
          .single(),

        // Recent tasks for this org
        supabase
          .from('command_center_tasks')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(20),

        // Latest health score
        supabase
          .from('client_health_scores')
          .select('*')
          .eq('organization_id', orgId)
          .order('score_date', { ascending: false })
          .limit(1)
          .single(),

        // Recent documents
        supabase
          .from('workspace_documents')
          .select('*')
          .eq('organization_id', orgId)
          .order('updated_at', { ascending: false })
          .limit(10),

        // Recent agent messages
        supabase
          .from('agent_messages')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

    if (orgResult.error) {
      return NextResponse.json(
        { error: 'Organization not found', detail: orgResult.error.message },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        org: orgResult.data,
        tasks: tasksResult.data || [],
        healthScore: healthResult.data || null,
        documents: documentsResult.data || [],
        messages: messagesResult.data || [],
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('GET /api/command-center/orgs/[orgId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
