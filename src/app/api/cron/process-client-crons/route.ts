import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/cron/process-client-crons
 *
 * Runs every 15 minutes — evaluates which client crons are due,
 * creates tasks for them, and updates next_run_at.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = getServiceSupabase()
  const now = new Date()

  try {
    // Fetch due cron schedules
    const { data: dueSchedules, error } = await supabase
      .from('client_cron_schedules')
      .select('*, organization:organizations(id, name)')
      .eq('enabled', true)
      .or(`next_run_at.is.null,next_run_at.lte.${now.toISOString()}`)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch schedules', detail: error.message }, { status: 500 })
    }

    const tasksCreated: { scheduleId: string; taskId: string; orgName: string }[] = []

    for (const schedule of dueSchedules || []) {
      const template = schedule.task_template as Record<string, unknown>
      const orgName = (schedule.organization as any)?.name || 'All Clients'

      // If org-specific, create task for that org. If null, create for all active orgs.
      const orgIds: string[] = []
      if (schedule.organization_id) {
        orgIds.push(schedule.organization_id)
      } else {
        const { data: activeOrgs } = await supabase
          .from('organizations')
          .select('id')
          .in('onboarding_status', ['live', 'testing'])
        if (activeOrgs) orgIds.push(...activeOrgs.map((o: { id: string }) => o.id))
      }

      for (const orgId of orgIds) {
        const { data: task } = await supabase
          .from('command_center_tasks')
          .insert({
            organization_id: orgId,
            title: template.title || schedule.name,
            description: template.description || null,
            task_type: schedule.task_type,
            priority: (template.priority as string) || 'normal',
            status: 'pending',
            assigned_platform: (template.assigned_platform as string) || null,
            assigned_agent: (template.assigned_agent as string) || null,
            created_by_platform: 'system',
            trigger_type: 'cron',
            trigger_ref: schedule.id,
            metadata: { cron_schedule_id: schedule.id },
          })
          .select('id')
          .single()

        if (task) {
          tasksCreated.push({ scheduleId: schedule.id, taskId: task.id, orgName })
        }
      }

      // Compute next_run_at based on cron_expr (simplified: add interval)
      const nextRun = computeNextRun(schedule.cron_expr, now, schedule.timezone || 'America/Phoenix')

      await supabase
        .from('client_cron_schedules')
        .update({ last_run_at: now.toISOString(), next_run_at: nextRun.toISOString() })
        .eq('id', schedule.id)
    }

    return NextResponse.json({
      success: true,
      schedulesProcessed: (dueSchedules || []).length,
      tasksCreated: tasksCreated.length,
      details: tasksCreated,
    })
  } catch (err) {
    console.error('Process client crons error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Simple cron interval parser — supports common patterns.
 * For production, use a proper cron library.
 */
function computeNextRun(cronExpr: string, from: Date, _timezone: string): Date {
  const next = new Date(from)

  // Parse simple patterns
  if (cronExpr.includes('0 8 * * *')) {
    // Daily at 8 AM
    next.setDate(next.getDate() + 1)
    next.setHours(8, 0, 0, 0)
  } else if (cronExpr.includes('0 9 * * 1')) {
    // Weekly Monday 9 AM
    const daysUntilMonday = ((1 - next.getDay() + 7) % 7) || 7
    next.setDate(next.getDate() + daysUntilMonday)
    next.setHours(9, 0, 0, 0)
  } else if (cronExpr.includes('0 16 * * 5')) {
    // Weekly Friday 4 PM
    const daysUntilFriday = ((5 - next.getDay() + 7) % 7) || 7
    next.setDate(next.getDate() + daysUntilFriday)
    next.setHours(16, 0, 0, 0)
  } else {
    // Default: run again in 24 hours
    next.setDate(next.getDate() + 1)
  }

  return next
}
