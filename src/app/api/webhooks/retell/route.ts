import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DISCORD_WEBHOOK =
  'https://discord.com/api/webhooks/1486106951061344386/KP7rwhexB-MfIyikmAUNVSfAD73r_9rI2S_-QtHRWSg8HNTr_XcbdxrctNSATRqeWg-J'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Map Retell call_status to our CallStatus type
function mapCallStatus(retellStatus: string, disconnectReason?: string): string {
  if (retellStatus === 'ended') {
    if (disconnectReason === 'voicemail_reached') return 'voicemail'
    return 'answered'
  }
  if (retellStatus === 'error') {
    if (disconnectReason === 'error_no_audio_received') return 'missed'
    return 'missed'
  }
  return 'answered'
}

// Map Retell sentiment to our Sentiment type
function mapSentiment(analysis?: { user_sentiment?: string }): string {
  const s = analysis?.user_sentiment?.toLowerCase() || 'neutral'
  if (s.includes('positive')) return 'positive'
  if (s.includes('negative')) return 'negative'
  if (s.includes('urgent')) return 'urgent'
  return 'neutral'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const payload = await request.json()

    // Retell webhook sends the full call object on call_ended
    const {
      call_id,
      agent_id,
      call_status,
      start_timestamp,
      end_timestamp,
      duration_ms,
      transcript,
      recording_url,
      disconnection_reason,
      call_analysis,
      call_type,
    } = payload

    if (!call_id || !agent_id) {
      return NextResponse.json({ error: 'Missing call_id or agent_id' }, { status: 400 })
    }

    // Look up which organization this agent belongs to
    const { data: agentMapping } = await supabase
      .from('retell_agents')
      .select('organization_id')
      .eq('agent_id', agent_id)
      .single()

    if (!agentMapping) {
      console.error(`No org mapping for agent: ${agent_id}`)
      return NextResponse.json({ error: 'Unknown agent' }, { status: 404 })
    }

    const orgId = agentMapping.organization_id

    // Extract caller info from transcript and analysis
    const callerPhone = payload.from_number || payload.caller_phone || 'Unknown'
    // Retell may put custom fields directly under call_analysis or under custom_analysis_data
    const analysisData = call_analysis?.custom_analysis_data || call_analysis || {}
    const callerName = analysisData.caller_name || null

    // Insert call record
    const { error: insertError } = await supabase.from('calls').insert({
      organization_id: orgId,
      external_call_id: call_id,
      caller_phone: callerPhone,
      caller_name: callerName,
      direction: call_type === 'web_call' ? 'inbound' : 'inbound',
      status: mapCallStatus(call_status, disconnection_reason),
      duration_seconds: Math.round((duration_ms || 0) / 1000),
      started_at: start_timestamp ? new Date(start_timestamp).toISOString() : new Date().toISOString(),
      ended_at: end_timestamp ? new Date(end_timestamp).toISOString() : null,
      recording_url: recording_url || null,
      transcript: transcript || null,
      transcript_summary: call_analysis?.call_summary || null,
      sentiment: mapSentiment(call_analysis),
      ai_agent_handled: true,
      escalated_to_human: false,
      tags: [call_type, disconnection_reason].filter(Boolean),
    })

    if (insertError) {
      // Duplicate check — if call already exists, skip
      if (insertError.code === '23505') {
        return NextResponse.json({ status: 'duplicate', call_id })
      }
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to insert call' }, { status: 500 })
    }

    // Auto-create lead from call if caller phone is known
    let leadId: string | null = null
    if (callerPhone && callerPhone !== 'Unknown') {
      // Check if a lead already exists for this phone + org
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', orgId)
        .eq('phone', callerPhone)
        .maybeSingle()

      if (existingLead) {
        leadId = existingLead.id
        // Update last_contact_at on existing lead
        await supabase
          .from('leads')
          .update({ last_contact_at: new Date().toISOString() })
          .eq('id', existingLead.id)
      } else {
        // Parse name from call analysis
        const fullName = callerName || 'Unknown Caller'
        const nameParts = fullName.trim().split(/\s+/)
        const firstName = nameParts[0] || 'Unknown'
        const lastName = nameParts.slice(1).join(' ') || 'Caller'

        // Extract service needed from call analysis
        const serviceNeeded =
          analysisData.service_needed ||
          call_analysis?.call_summary?.slice(0, 100) ||
          'Phone inquiry'

        const { data: newLead } = await supabase
          .from('leads')
          .insert({
            organization_id: orgId,
            source: 'phone_call',
            status: 'new',
            priority:
              analysisData.urgency === 'emergency' || analysisData.urgency === 'urgent'
                ? 'hot'
                : 'warm',
            score: 50,
            first_name: firstName,
            last_name: lastName,
            phone: callerPhone,
            service_needed: serviceNeeded,
            estimated_value: 0,
            follow_up_count: 0,
            last_contact_at: new Date().toISOString(),
            notes: call_analysis?.call_summary || null,
          })
          .select('id')
          .single()

        if (newLead) {
          leadId = newLead.id
        }
      }

      // Link call to lead
      if (leadId) {
        await supabase
          .from('calls')
          .update({ lead_id: leadId })
          .eq('external_call_id', call_id)
      }
    }

    // Log activity
    await supabase.from('activity_feed').insert({
      organization_id: orgId,
      actor: 'Sarah AI',
      action: `Call ${mapCallStatus(call_status, disconnection_reason)} — ${Math.round((duration_ms || 0) / 1000)}s`,
      entity_type: 'call',
      entity_id: call_id,
      importance: call_analysis?.user_sentiment === 'Negative' ? 'high' : 'low',
      read: false,
    })

    // Create in-app notification for all org users
    const durationSec = Math.round((duration_ms || 0) / 1000)
    const callDurationStr = durationSec >= 60 ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s` : `${durationSec}s`
    const callerDisplay = callerName || callerPhone

    await supabase.from('notifications').insert({
      organization_id: orgId,
      user_id: null, // broadcast to all org users
      type: 'call_answered',
      title: 'New call answered',
      body: `Sarah handled a ${callDurationStr} call from ${callerDisplay}`,
      icon: 'Phone',
      href: '/dashboard/calls',
      metadata: { call_id, caller_phone: callerPhone, duration_seconds: durationSec },
    })

    // Trigger push notification (fire-and-forget)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    fetch(`${appUrl}/api/notifications/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET || 'internal'}`,
      },
      body: JSON.stringify({
        organizationId: orgId,
        title: 'New call answered',
        body: `Sarah handled a ${callDurationStr} call from ${callerDisplay}`,
        href: '/dashboard/calls',
      }),
    }).catch((err) => console.error('Push notification error:', err))

    // Notify Discord
    const mins = Math.floor(durationSec / 60)
    const secs = durationSec % 60
    const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
    const sentiment = call_analysis?.user_sentiment || 'Unknown'
    const summary = call_analysis?.call_summary || 'No summary available'

    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: `📞 Sarah Handled a Call`,
            color: sentiment === 'Positive' ? 0x2ecc71 : sentiment === 'Negative' ? 0xe74c3c : 0x3498db,
            fields: [
              { name: 'Caller', value: callerPhone, inline: true },
              { name: 'Duration', value: durationStr, inline: true },
              { name: 'Sentiment', value: sentiment, inline: true },
              { name: 'Summary', value: summary.slice(0, 200) },
            ],
            footer: {
              text: `Call ID: ${call_id}`,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    }).catch((err) => console.error('Discord notification error:', err))

    return NextResponse.json({ status: 'ok', call_id })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Also support GET for webhook verification
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'oios-retell-webhook' })
}
