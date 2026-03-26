import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Authenticate the request via bearer token or super_admin session.
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
 * GET /api/command-center/tasks/[id]
 *
 * Returns a single task with organization details.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authorized = await authorize(request)
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getServiceSupabase()

    const { data: task, error } = await supabase
      .from('command_center_tasks')
      .select('*, organization:organizations(id, name)')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Failed to fetch task:', error)
      return NextResponse.json(
        { error: 'Task not found', detail: error.message },
        { status: 404 }
      )
    }

    return NextResponse.json({ task }, { status: 200 })
  } catch (err) {
    console.error('GET /api/command-center/tasks/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/command-center/tasks/[id]
 *
 * Body: { status?, result?, result_summary?, error_message?,
 *         approved_by?, assigned_platform?, assigned_agent? }
 *
 * Updates the task. Sets started_at when status changes to in_progress,
 * and completed_at when status changes to completed.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authorized = await authorize(request)
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getServiceSupabase()
    const body = await request.json()

    const {
      status,
      result,
      result_summary,
      error_message,
      approved_by,
      assigned_platform,
      assigned_agent,
    } = body

    // Build the update payload — only include fields that were provided
    const updateData: Record<string, unknown> = {}

    if (status !== undefined) updateData.status = status
    if (result !== undefined) updateData.result = result
    if (result_summary !== undefined) updateData.result_summary = result_summary
    if (error_message !== undefined) updateData.error_message = error_message
    if (approved_by !== undefined) updateData.approved_by = approved_by
    if (assigned_platform !== undefined) updateData.assigned_platform = assigned_platform
    if (assigned_agent !== undefined) updateData.assigned_agent = assigned_agent

    // Set timestamps based on status transitions
    if (status === 'in_progress') {
      updateData.started_at = new Date().toISOString()
    }
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No update fields provided' },
        { status: 400 }
      )
    }

    const { data: task, error } = await supabase
      .from('command_center_tasks')
      .update(updateData)
      .eq('id', id)
      .select('*, organization:organizations(id, name)')
      .single()

    if (error) {
      console.error('Failed to update task:', error)
      return NextResponse.json(
        { error: 'Failed to update task', detail: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ task }, { status: 200 })
  } catch (err) {
    console.error('PATCH /api/command-center/tasks/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
