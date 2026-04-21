import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const organizationId = String(body.organizationId || '')
    const requestText = String(body.request || '').trim()
    const agentName = String(body.agentName || 'AI Receptionist').trim()

    if (!organizationId || !requestText) {
      return Response.json({ error: 'organizationId and request are required' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id, full_name')
      .eq('id', user.id)
      .single() as { data: { organization_id: string; full_name: string | null } | null }

    if (!profile || profile.organization_id !== organizationId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const actorName = profile.full_name || 'Team member'
    // Some installs use a narrowed generated DB type. Use a loose client for cross-table inserts.
     
    const svc = supabase as any

    const [activityResult, notificationResult] = await Promise.all([
      svc.from('activity_feed').insert({
        organization_id: organizationId,
        actor: actorName,
        action: 'requested greeting update',
        entity_type: 'organization',
        entity_id: organizationId,
        metadata: {
          request: requestText,
          requested_by: user.id,
          agent_name: agentName,
        },
        importance: 'medium',
        read: false,
        created_at: now,
      }),
      svc.from('notifications').insert({
        organization_id: organizationId,
        user_id: null,
        type: 'system',
        title: 'Greeting update request',
        body: `${actorName} requested an update to ${agentName}'s greeting.`,
        href: '/dashboard/onboarding',
        metadata: {
          request: requestText,
          requested_by: user.id,
          agent_name: agentName,
        },
        read: false,
        pushed: false,
        created_at: now,
      }),
    ])

    if (activityResult.error || notificationResult.error) {
      return Response.json({ error: 'Failed to submit request' }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
