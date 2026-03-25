import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: notifications, error } = await (supabase as any)
      .from('notifications')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return Response.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    return Response.json(notifications ?? [])
  } catch (err) {
    console.error('Notifications GET error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 401 })
    }

    const body = await request.json()
    const { ids } = body as { ids: string[] }

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: 'ids must be a non-empty array' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('notifications')
      .update({ read: true })
      .in('id', ids)
      .eq('organization_id', profile.organization_id)

    if (error) {
      return Response.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Notifications PATCH error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
