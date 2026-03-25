import { createSupabaseServerClient } from '@/lib/supabase-server'

// ============================================================
// GET /api/automations/rules
// List all automation rules for the user's organization
// ============================================================

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single() as { data: { organization_id: string } | null }
    if (!profile) return Response.json({ error: 'Profile not found' }, { status: 401 })

    const orgId = profile.organization_id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rules, error } = await (supabase as any)
      .from('automation_rules')
      .select('*')
      .eq('organization_id', orgId)
      .order('action_type', { ascending: true })

    if (error) {
      console.error('[automations/rules] GET error:', error)
      return Response.json({ error: 'Failed to fetch automation rules' }, { status: 500 })
    }

    return Response.json(rules ?? [])
  } catch (err) {
    console.error('[automations/rules] GET unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================
// POST /api/automations/rules
// Upsert a rule (action_type + organization_id is unique)
// Body: { action_type, mode, enabled, config }
// ============================================================

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single() as { data: { organization_id: string } | null }
    if (!profile) return Response.json({ error: 'Profile not found' }, { status: 401 })

    const orgId = profile.organization_id

    const body = await request.json() as {
      action_type: string
      mode: 'auto' | 'approve'
      enabled: boolean
      config: Record<string, unknown>
    }

    const { action_type, mode, enabled, config } = body

    if (!action_type) {
      return Response.json({ error: 'action_type is required' }, { status: 400 })
    }
    if (mode && mode !== 'auto' && mode !== 'approve') {
      return Response.json({ error: 'mode must be "auto" or "approve"' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rule, error } = await (supabase as any)
      .from('automation_rules')
      .upsert(
        {
          organization_id: orgId,
          action_type,
          mode: mode ?? 'approve',
          enabled: enabled ?? false,
          config: config ?? {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,action_type' }
      )
      .select()
      .single()

    if (error) {
      console.error('[automations/rules] POST upsert error:', error)
      return Response.json({ error: 'Failed to save automation rule' }, { status: 500 })
    }

    return Response.json(rule, { status: 200 })
  } catch (err) {
    console.error('[automations/rules] POST unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================
// PATCH /api/automations/rules
// Toggle enabled/mode for a rule
// Body: { id, enabled?, mode? }
// ============================================================

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single() as { data: { organization_id: string } | null }
    if (!profile) return Response.json({ error: 'Profile not found' }, { status: 401 })

    const orgId = profile.organization_id

    const body = await request.json() as {
      id: string
      enabled?: boolean
      mode?: 'auto' | 'approve'
    }

    const { id, enabled, mode } = body

    if (!id) {
      return Response.json({ error: 'id is required' }, { status: 400 })
    }
    if (mode !== undefined && mode !== 'auto' && mode !== 'approve') {
      return Response.json({ error: 'mode must be "auto" or "approve"' }, { status: 400 })
    }
    if (enabled === undefined && mode === undefined) {
      return Response.json({ error: 'At least one of enabled or mode must be provided' }, { status: 400 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (enabled !== undefined) updates.enabled = enabled
    if (mode !== undefined) updates.mode = mode

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rule, error } = await (supabase as any)
      .from('automation_rules')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      console.error('[automations/rules] PATCH error:', error)
      return Response.json({ error: 'Failed to update automation rule' }, { status: 500 })
    }

    if (!rule) {
      return Response.json({ error: 'Rule not found' }, { status: 404 })
    }

    return Response.json(rule)
  } catch (err) {
    console.error('[automations/rules] PATCH unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
