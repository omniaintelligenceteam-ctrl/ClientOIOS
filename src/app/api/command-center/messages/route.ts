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
 * GET /api/command-center/messages
 * Returns agent messages with optional filters: org_id, task_id, to_platform, status.
 * Ordered by created_at DESC, limit 50.
 */
export async function GET(request: NextRequest) {
  try {
    if (!authorizeBearer(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceSupabase()
    const { searchParams } = new URL(request.url)

    const orgId = searchParams.get('org_id')
    const taskId = searchParams.get('task_id')
    const toPlatform = searchParams.get('to_platform')
    const status = searchParams.get('status')

    let query = supabase
      .from('agent_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (orgId) {
      query = query.eq('organization_id', orgId)
    }
    if (taskId) {
      query = query.eq('task_id', taskId)
    }
    if (toPlatform) {
      query = query.eq('to_platform', toPlatform)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: messages, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch messages', detail: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ messages }, { status: 200 })
  } catch (err) {
    console.error('GET /api/command-center/messages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/command-center/messages
 * Send a new agent message.
 * Requires bearer token auth (COMMAND_CENTER_SECRET).
 */
export async function POST(request: NextRequest) {
  try {
    if (!authorizeBearer(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceSupabase()
    const body = await request.json()

    const {
      organization_id,
      task_id,
      from_platform,
      from_agent,
      to_platform,
      to_agent,
      message_type,
      subject,
      body: messageBody,
      in_reply_to,
      metadata,
    } = body

    if (!from_platform || !to_platform || !message_type) {
      return NextResponse.json(
        { error: 'Missing required fields: from_platform, to_platform, message_type' },
        { status: 400 }
      )
    }

    const { data: message, error } = await supabase
      .from('agent_messages')
      .insert({
        organization_id: organization_id || null,
        task_id: task_id || null,
        from_platform,
        from_agent: from_agent || null,
        to_platform,
        to_agent: to_agent || null,
        message_type,
        subject: subject || null,
        body: messageBody || null,
        in_reply_to: in_reply_to || null,
        metadata: metadata || {},
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create message', detail: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (err) {
    console.error('POST /api/command-center/messages error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
