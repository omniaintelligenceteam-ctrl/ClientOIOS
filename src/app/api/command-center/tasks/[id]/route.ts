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
    // GET is used by the Command Center UI — no auth needed for internal reads.
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

    // Task chaining: if completed and has chain_next in metadata, create follow-up
    if (status === 'completed' && task.metadata?.chain_next) {
      const chain = task.metadata.chain_next as Record<string, unknown>
      await supabase
        .from('command_center_tasks')
        .insert({
          organization_id: task.organization_id,
          title: chain.title || 'Chained follow-up task',
          description: chain.description || null,
          task_type: chain.task_type || task.task_type,
          priority: chain.priority || task.priority,
          status: 'pending',
          assigned_platform: chain.assigned_platform || null,
          assigned_agent: chain.assigned_agent || null,
          created_by_platform: 'system',
          trigger_type: 'chain',
          trigger_ref: task.id,
          parent_task_id: task.id,
          metadata: chain.metadata || {},
        })
    }

    // Auto-retry: if failed and retry_count < max_retries, re-queue
    if (status === 'failed') {
      const retryCount = (task.metadata?.retry_count as number) || 0
      const maxRetries = (task.metadata?.max_retries as number) || 1
      if (retryCount < maxRetries) {
        await supabase
          .from('command_center_tasks')
          .insert({
            organization_id: task.organization_id,
            title: task.title,
            description: task.description,
            task_type: task.task_type,
            priority: task.priority,
            status: 'pending',
            assigned_platform: task.assigned_platform,
            assigned_agent: task.assigned_agent,
            created_by_platform: 'system',
            trigger_type: 'retry',
            trigger_ref: task.id,
            parent_task_id: task.id,
            metadata: { ...((task.metadata as Record<string, unknown>) || {}), retry_count: retryCount + 1 },
          })
      } else {
        // Escalate to Wes after max retries
        await supabase
          .from('command_center_tasks')
          .insert({
            organization_id: task.organization_id,
            title: `Escalation: "${task.title}" failed after ${maxRetries} retries`,
            description: `Original error: ${task.error_message || 'Unknown'}`,
            task_type: 'escalation',
            priority: 'urgent',
            status: 'pending',
            assigned_platform: 'wes',
            created_by_platform: 'system',
            trigger_type: 'escalation',
            trigger_ref: task.id,
            parent_task_id: task.id,
          })
      }
    }

    return NextResponse.json({ task }, { status: 200 })
  } catch (err) {
    console.error('PATCH /api/command-center/tasks/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
