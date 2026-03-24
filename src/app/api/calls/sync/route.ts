import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RETELL_API_KEY = process.env.RETELL_API_KEY || 'key_57a1e44d75cffc9b5e9f8188f048'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function mapCallStatus(retellStatus: string, disconnectReason?: string): string {
  if (retellStatus === 'ended') {
    if (disconnectReason === 'voicemail_reached') return 'voicemail'
    return 'answered'
  }
  if (retellStatus === 'error') return 'missed'
  return 'answered'
}

function mapSentiment(analysis?: { user_sentiment?: string }): string {
  const s = analysis?.user_sentiment?.toLowerCase() || 'neutral'
  if (s.includes('positive')) return 'positive'
  if (s.includes('negative')) return 'negative'
  return 'neutral'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const agentId = body.agent_id || 'agent_b8f7dab7124e978dacac4a3b60'
    const limit = body.limit || 50

    // Fetch calls from Retell
    const retellResp = await fetch('https://api.retellai.com/v2/list-calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter_criteria: { agent_id: [agentId] },
        sort_order: 'descending',
        limit,
      }),
    })

    if (!retellResp.ok) {
      return NextResponse.json({ error: 'Retell API error' }, { status: 502 })
    }

    const calls = await retellResp.json()

    // Look up org for this agent
    const { data: agentMapping, error: agentError } = await supabase
      .from('retell_agents')
      .select('organization_id')
      .eq('agent_id', agentId)
      .single()

    if (!agentMapping) {
      console.error('Agent lookup failed:', { agentId, agentError })
      return NextResponse.json({ error: 'Unknown agent', agentId, detail: agentError?.message }, { status: 404 })
    }

    const orgId = agentMapping.organization_id
    let synced = 0
    let skipped = 0

    for (const call of calls) {
      const { error: insertError } = await supabase.from('calls').insert({
        organization_id: orgId,
        external_call_id: call.call_id,
        caller_phone: call.from_number || 'Web Demo',
        caller_name: call.call_analysis?.custom_analysis_data?.caller_name || null,
        direction: 'inbound',
        status: mapCallStatus(call.call_status, call.disconnection_reason),
        duration_seconds: Math.round((call.duration_ms || 0) / 1000),
        started_at: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : new Date().toISOString(),
        ended_at: call.end_timestamp ? new Date(call.end_timestamp).toISOString() : null,
        recording_url: call.recording_url || null,
        transcript: call.transcript || null,
        transcript_summary: call.call_analysis?.call_summary || null,
        sentiment: mapSentiment(call.call_analysis),
        ai_agent_handled: true,
        escalated_to_human: false,
        tags: [call.call_type, call.disconnection_reason].filter(Boolean),
      })

      if (insertError?.code === '23505') {
        skipped++
      } else if (!insertError) {
        synced++
      }
    }

    return NextResponse.json({ synced, skipped, total: calls.length })
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
