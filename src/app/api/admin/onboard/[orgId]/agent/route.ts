import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { provisionAgent, type BusinessConfig } from '@/lib/retell-provisioning'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * POST /api/admin/onboard/[orgId]/agent
 *
 * Links a Retell agent to the organization, or provisions a new one with a custom prompt.
 *
 * Body (link existing):    { agent_id, agent_name, phone_number }
 * Body (provision new):    { provision: true, business_config: BusinessConfig }
 * Body (create bare):      { create_new: true, agent_name }
 * Returns: { agent_id, phone_number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const supabase = getSupabase()
    const { orgId } = await params
    const body = await request.json()

    // ── Validate org exists ───────────────────────────────────────────
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, trade')
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

    if (body.provision && body.business_config) {
      // ── Full provisioning: create agent with custom prompt + phone ──
      const config: BusinessConfig = body.business_config
      // Fill in defaults from org if not provided
      config.businessName = config.businessName || org.name
      config.trade = config.trade || org.trade

      const result = await provisionAgent(config)
      agentId = result.agentId
      agentName = `Sarah - ${config.businessName}`
      phoneNumber = result.phoneNumber

      // Update onboarding status to configuring
      await supabase
        .from('organizations')
        .update({ onboarding_status: 'configuring' })
        .eq('id', orgId)

    } else if (body.create_new) {
      // ── Create bare agent via Retell API (legacy) ──────────────────
      const RETELL_API_KEY = process.env.RETELL_API_KEY || ''
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
          response_engine: body.response_engine || { type: 'retell-llm' },
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
    await supabase
      .from('organizations')
      .update({ retell_agent_id: agentId })
      .eq('id', orgId)

    return NextResponse.json(
      { agent_id: agentId, phone_number: phoneNumber },
      { status: 201 }
    )
  } catch (err) {
    console.error('Agent setup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
