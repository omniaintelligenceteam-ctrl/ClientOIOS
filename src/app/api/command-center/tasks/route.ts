import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { routeTask } from '@/lib/task-router'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Authenticate the request via bearer token or super_admin session.
 * Returns true if authorized, false otherwise.
 */
async function authorize(request: NextRequest): Promise<boolean> {
  // Check bearer token first
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    if (token === process.env.COMMAND_CENTER_SECRET) {
      return true
    }
  }

  // Fallback: check if the caller is a logged-in super_admin
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: profile } = await supabase
      .from('users')
      .select('is_super_admin')
      .eq('id', user.id)
      .single() as { data: { is_super_admin?: boolean } | null }

    return profile?.is_super_admin === true
  } catch {
    return false
  }
}

/**
 * GET /api/command-center/tasks
 *
 * Query params: org_id, status, platform, limit (default 50)
 * Returns filtered tasks ordered by created_at DESC with organization name.
 */
export async function GET(request: NextRequest) {
  try {
    // GET is used by the Command Center UI (same-origin) — no auth needed for internal reads.
    // POST remains auth-gated for external platform writes.
    const supabase = getServiceSupabase()
    const { searchParams } = new URL(request.url)

    const orgId = searchParams.get('org_id')
    const status = searchParams.get('status')
    const platform = searchParams.get('platform')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    let query = supabase
      .from('command_center_tasks')
      .select('*, organization:organizations(id, name)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (orgId) {
      query = query.eq('organization_id', orgId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (platform) {
      query = query.eq('assigned_platform', platform)
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error('Failed to fetch tasks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tasks', detail: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ tasks }, { status: 200 })
  } catch (err) {
    console.error('GET /api/command-center/tasks error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/command-center/tasks
 *
 * Body: { organization_id?, title, description?, task_type, priority?,
 *         created_by_platform, trigger_type?, trigger_ref?, metadata? }
 *
 * Calls routeTask() to determine assignment, inserts into command_center_tasks.
 * Returns the created task.
 */
export async function POST(request: NextRequest) {
  try {
    const authorized = await authorize(request)
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceSupabase()
    const body = await request.json()

    const {
      organization_id,
      title,
      description,
      task_type,
      priority,
      created_by_platform,
      trigger_type,
      trigger_ref,
      metadata,
    } = body

    // Validate required fields
    if (!title || !task_type || !created_by_platform) {
      return NextResponse.json(
        { error: 'Missing required fields: title, task_type, created_by_platform' },
        { status: 400 }
      )
    }

    // Route the task
    const routing = await routeTask(task_type)

    const taskStatus = routing.requires_approval ? 'awaiting_approval' : 'assigned'

    const { data: task, error } = await supabase
      .from('command_center_tasks')
      .insert({
        organization_id: organization_id || null,
        title,
        description: description || null,
        task_type,
        priority: priority || 'normal',
        status: taskStatus,
        assigned_platform: routing.assigned_platform,
        assigned_agent: routing.assigned_agent,
        routed_by: 'task-router',
        created_by_platform,
        trigger_type: trigger_type || null,
        trigger_ref: trigger_ref || null,
        requires_approval: routing.requires_approval,
        metadata: metadata || {},
      })
      .select('*, organization:organizations(id, name)')
      .single()

    if (error) {
      console.error('Failed to create task:', error)
      return NextResponse.json(
        { error: 'Failed to create task', detail: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ task }, { status: 201 })
  } catch (err) {
    console.error('POST /api/command-center/tasks error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
