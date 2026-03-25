import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
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
      .single() as { data: { organization_id: string } | null }

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 401 })
    }

    const orgId = profile.organization_id

    const body = await request.json()
    const { endpoint, keys, userAgent } = body as {
      endpoint: string
      keys: { p256dh: string; auth: string }
      userAgent?: string
    }

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return Response.json({ error: 'endpoint and keys are required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          organization_id: orgId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: userAgent ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )

    if (error) {
      return Response.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Subscribe POST error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint } = body as { endpoint: string }

    if (!endpoint) {
      return Response.json({ error: 'endpoint is required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id)

    if (error) {
      return Response.json({ error: 'Failed to delete subscription' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('Subscribe DELETE error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
