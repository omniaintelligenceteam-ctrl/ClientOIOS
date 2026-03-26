import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function authorizeBearer(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')
  return token === process.env.COMMAND_CENTER_SECRET
}

/**
 * PATCH /api/command-center/messages/[id]
 * Update a message's status.
 * Requires bearer token auth (COMMAND_CENTER_SECRET).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!authorizeBearer(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getServiceSupabase()
    const body = await request.json()

    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Missing required field: status' },
        { status: 400 }
      )
    }

    const { data: message, error } = await supabase
      .from('agent_messages')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update message', detail: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message }, { status: 200 })
  } catch (err) {
    console.error('PATCH /api/command-center/messages/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
