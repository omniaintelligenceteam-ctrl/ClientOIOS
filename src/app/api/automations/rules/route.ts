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
// Create a new rule
// Body: { name, action_type, trigger_type, mode?, active?, trigger_config?, action_config? }
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
    const body = await request.json()

    const {
      name,
      action_type,
      trigger_type,
      mode,
      active,
      trigger_config,
      action_config,
    } = body as {
      name?: string
      action_type: string
      trigger_type?: string
      mode?: 'auto' | 'approval'
      active?: boolean
      trigger_config?: Record<string, unknown>
      action_config?: Record<string, unknown>
    }

    if (!action_type) {
      return Response.json({ error: 'action_type is required' }, { status: 400 })
    }

    // Build trigger_config with mode embedded
    const finalTriggerConfig = {
      ...(trigger_config || {}),
      ...(mode ? { mode } : {}),
    }

     
    const { data: rule, error } = await (supabase as any)
      .from('automation_rules')
      .insert({
        organization_id: orgId,
        name: name || action_type,
        action_type,
        trigger_type: trigger_type || action_type,
        active: active ?? false,
        trigger_config: finalTriggerConfig,
        action_config: action_config || {},
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[automations/rules] POST error:', error)
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
// Toggle active/mode for a rule
// Body: { id, active?, mode? }
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
      active?: boolean
      mode?: 'auto' | 'approval'
    }

    const { id, active, mode } = body

    if (!id) {
      return Response.json({ error: 'id is required' }, { status: 400 })
    }
    if (active === undefined && mode === undefined) {
      return Response.json({ error: 'At least one of active or mode must be provided' }, { status: 400 })
    }

    // If toggling mode, we need to update trigger_config.mode
    // First fetch the current rule to preserve existing trigger_config
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (active !== undefined) updates.active = active

    if (mode !== undefined) {
       
      const { data: current } = await (supabase as any)
        .from('automation_rules')
        .select('trigger_config')
        .eq('id', id)
        .eq('organization_id', orgId)
        .single()

      updates.trigger_config = {
        ...(current?.trigger_config || {}),
        mode,
      }
    }

     
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
