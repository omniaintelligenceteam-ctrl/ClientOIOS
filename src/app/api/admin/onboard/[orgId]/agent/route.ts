import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * POST /api/admin/onboard/[orgId]/agent
 *
 * Links a Retell agent to the organization, or creates a new one via the Retell API.
 *
 * Body (link existing):  { agent_id, agent_name, phone_number }
 * Body (create new):     { create_new: true, agent_name }
 * Returns: { agent_id }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const supabase = getSupabase()
    const RETELL_API_KEY = process.env.RETELL_API_KEY || 'key_57a1e44d75cffc9b5e9f8188f048'
    const { orgId } = await params
    const body = await request.json()

    // ── Validate org exists ───────────────────────────────────────────
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    let agentId: string
    let agentName: string
    let phoneNumber: string | null = null

    if (body.create_new) {
      // ── Create a new agent via Retell API ─────────────────────────
      if (!body.agent_name) {
        return NextResponse.json(
          { error: 'agent_name is required when creating a new agent' },
          { status: 400 }
        )
      }

      const retellResp = await fetch('https://api.retellai.com/create-agent', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RETELL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_name: body.agent_name,
          response_engine: body.response_engine || {
            type: 'retell-llm',
          },
          voice_id: body.voice_id || undefined,
        }),
      })

      if (!retellResp.ok) {
        const retellErr = await retellResp.json().catch(() => ({}))
        console.error('Retell agent creation failed:', retellErr)
        return NextResponse.json(
          { error: 'Failed to create Retell agent', detail: retellErr },
          { status: 502 }
        )
      }

      const retellAgent = await retellResp.json()
      agentId = retellAgent.agent_id
      agentName = body.agent_name
      phoneNumber = retellAgent.phone_number || null

      if (!agentId) {
        return NextResponse.json(
          { error: 'Retell API did not return an agent_id' },
          { status: 502 }
        )
      }
    } else {
      // ── Link an existing agent ────────────────────────────────────
      if (!body.agent_id || !body.agent_name) {
        return NextResponse.json(
          { error: 'agent_id and agent_name are required when linking an existing agent' },
          { status: 400 }
        )
      }

      agentId = body.agent_id
      agentName = body.agent_name
      phoneNumber = body.phone_number || null
    }

    // ── Insert into retell_agents table ─────────────────────────────
    const { error: insertError } = await supabase.from('retell_agents').insert({
      agent_id: agentId,
      organization_id: orgId,
      agent_name: agentName,
      phone_number: phoneNumber,
      is_default: true,
    })

    if (insertError) {
      console.error('retell_agents insert failed:', insertError)
      return NextResponse.json(
        { error: 'Failed to save agent mapping', detail: insertError.message },
        { status: 500 }
      )
    }

    // ── Update organization.retell_agent_id ──────────────────────────
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ retell_agent_id: agentId })
      .eq('id', orgId)

    if (updateError) {
      console.error('Organization agent update failed:', updateError)
      // Non-fatal — the retell_agents row is the source of truth
    }

    return NextResponse.json({ agent_id: agentId }, { status: 201 })
  } catch (err) {
    console.error('Agent setup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
