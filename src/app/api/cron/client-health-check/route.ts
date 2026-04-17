import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isCronAuthorized } from '@/lib/compliance'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/cron/client-health-check
 *
 * Daily cron — computes health scores for every active organization.
 * Scores are based on: call volume, task completion rate, and prompt freshness.
 * Creates tasks for clients scoring below 70.
 *
 * Secured by CRON_SECRET header (Vercel Cron).
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  try {
    // Fetch all active organizations
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, onboarding_status')
      .in('onboarding_status', ['live', 'testing', 'configuring'])

    if (orgError || !orgs) {
      return NextResponse.json({ error: 'Failed to fetch orgs', detail: orgError?.message }, { status: 500 })
    }

    const results: { orgId: string; name: string; score: number; taskCreated: boolean }[] = []

    for (const org of orgs) {
      // Count calls in last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
      const { count: callCount } = await supabase
        .from('calls')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .gte('created_at', sevenDaysAgo)

      // Count completed tasks in last 7 days
      const { count: completedTasks } = await supabase
        .from('command_center_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('status', 'completed')
        .gte('completed_at', sevenDaysAgo)

      // Count failed/stale tasks
      const { count: failedTasks } = await supabase
        .from('command_center_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('status', 'failed')
        .gte('created_at', sevenDaysAgo)

      // Compute sub-scores (0-100)
      const callVolumeScore = Math.min(100, (callCount || 0) * 5) // 20+ calls = 100
      const taskCompletionScore = (completedTasks || 0) > 0
        ? Math.min(100, Math.round(((completedTasks || 0) / ((completedTasks || 0) + (failedTasks || 0) || 1)) * 100))
        : 50 // neutral if no tasks
      const promptHealthScore = org.onboarding_status === 'live' ? 90 : org.onboarding_status === 'testing' ? 70 : 50

      // Overall score (weighted average)
      const overallScore = Math.round(
        callVolumeScore * 0.35 +
        taskCompletionScore * 0.35 +
        promptHealthScore * 0.3
      )

      // Build alerts
      const alerts: string[] = []
      if (callVolumeScore < 30) alerts.push('Low call volume — check agent availability')
      if ((failedTasks || 0) > 2) alerts.push(`${failedTasks} failed tasks this week`)
      if (org.onboarding_status !== 'live') alerts.push('Client not yet live')

      // Build recommendations
      const recommendations: string[] = []
      if (callVolumeScore < 50) recommendations.push('Review call routing and agent prompt')
      if ((failedTasks || 0) > 0) recommendations.push('Investigate and retry failed tasks')
      if (overallScore < 70) recommendations.push('Schedule a health check with this client')

      // Upsert health score for today
      await supabase
        .from('client_health_scores')
        .upsert({
          organization_id: org.id,
          score_date: today,
          overall_score: overallScore,
          call_volume_score: callVolumeScore,
          response_quality_score: taskCompletionScore,
          prompt_health_score: promptHealthScore,
          alerts,
          recommendations,
        }, { onConflict: 'organization_id,score_date' })

      // Update org health fields
      await supabase
        .from('organizations')
        .update({
          health_score: overallScore,
          last_health_check_at: now,
          alert_count: alerts.length,
        })
        .eq('id', org.id)

      // Create task if score is below 70
      let taskCreated = false
      if (overallScore < 70) {
        await supabase
          .from('command_center_tasks')
          .insert({
            organization_id: org.id,
            title: `Health check needed: ${org.name} (score: ${overallScore})`,
            description: `Automated health check flagged low score. Alerts: ${alerts.join('; ')}`,
            task_type: 'health_check',
            priority: overallScore < 40 ? 'urgent' : 'high',
            status: 'pending',
            assigned_platform: 'openclaw',
            assigned_agent: 'haven',
            created_by_platform: 'system',
            trigger_type: 'cron',
          })
        taskCreated = true
      }

      results.push({ orgId: org.id, name: org.name, score: overallScore, taskCreated })
    }

    return NextResponse.json({
      success: true,
      date: today,
      orgsProcessed: results.length,
      results,
    })
  } catch (err) {
    console.error('Health check cron error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
