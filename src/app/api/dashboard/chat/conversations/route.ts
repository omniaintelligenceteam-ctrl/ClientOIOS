import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { User } from '@/lib/types'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', authUser.id)
    .single()

  if (!profile) {
    return Response.json({ error: 'Profile not found' }, { status: 401 })
  }

  const orgId = (profile as unknown as Pick<User, 'organization_id'>).organization_id

  const { data, error } = await supabase
    .from('chat_conversations')
    .select('id, title, created_at, updated_at')
    .eq('organization_id', orgId)
    .eq('user_id', authUser.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ conversations: data })
}
