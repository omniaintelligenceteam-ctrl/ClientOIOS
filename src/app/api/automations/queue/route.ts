import { createSupabaseServerClient } from '@/lib/supabase-server'

// ============================================================
// GET /api/automations/queue
// List queue items for the org. Supports ?status=pending
// Returns up to 50 items ordered by created_at DESC
// ============================================================

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('automation_queue')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: items, error } = await query

    if (error) {
      console.error('[automations/queue] GET error:', error)
      return Response.json({ error: 'Failed to fetch automation queue' }, { status: 500 })
    }

    return Response.json(items ?? [])
  } catch (err) {
    console.error('[automations/queue] GET unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================
// PATCH /api/automations/queue
// Approve or reject a queue item
// Body: { id, action: 'approve' | 'reject' }
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
      action: 'approve' | 'reject'
    }

    const { id, action } = body

    if (!id) {
      return Response.json({ error: 'id is required' }, { status: 400 })
    }
    if (action !== 'approve' && action !== 'reject') {
      return Response.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })
    }

    const now = new Date().toISOString()

    const updates: Record<string, unknown> =
      action === 'approve'
        ? {
            status: 'approved',
            approved_by: user.id,
            approved_at: now,
          }
        : {
            status: 'rejected',
          }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: item, error } = await (supabase as any)
      .from('automation_queue')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) {
      console.error('[automations/queue] PATCH error:', error)
      return Response.json({ error: 'Failed to update queue item' }, { status: 500 })
    }

    if (!item) {
      return Response.json({ error: 'Queue item not found' }, { status: 404 })
    }

    return Response.json(item)
  } catch (err) {
    console.error('[automations/queue] PATCH unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
