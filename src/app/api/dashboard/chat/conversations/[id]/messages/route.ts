import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify conversation belongs to user (RLS handles org scoping)
  const { data: conv } = await supabase
    .from('chat_conversations')
    .select('id')
    .eq('id', id)
    .eq('user_id', authUser.id)
    .single()

  if (!conv) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, model_used, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ messages: data })
}
