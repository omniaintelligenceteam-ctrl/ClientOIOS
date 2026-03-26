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
 * GET /api/command-center/orgs/[orgId]/health
 * Returns health score history for an org (last 30 scores).
 * Internal only — no auth required.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    const supabase = getServiceSupabase()

    const { data: scores, error } = await supabase
      .from('client_health_scores')
      .select('*')
      .eq('organization_id', orgId)
      .order('score_date', { ascending: false })
      .limit(30)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch health scores', detail: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ scores }, { status: 200 })
  } catch (err) {
    console.error('GET /api/command-center/orgs/[orgId]/health error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/command-center/orgs/[orgId]/health
 * Manually trigger a health score insert.
 * Requires bearer token auth (COMMAND_CENTER_SECRET).
 * Also updates organizations.health_score and organizations.last_health_check_at.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    if (!authorizeBearer(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId } = await params
    const supabase = getServiceSupabase()
    const body = await request.json()

    const {
      overall_score,
      call_volume_score,
      response_quality_score,
      prompt_health_score,
      alerts,
      recommendations,
    } = body

    if (overall_score === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: overall_score' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    // Insert health score
    const { data: score, error: insertError } = await supabase
      .from('client_health_scores')
      .insert({
        organization_id: orgId,
        score_date: today,
        overall_score,
        call_volume_score: call_volume_score ?? null,
        response_quality_score: response_quality_score ?? null,
        prompt_health_score: prompt_health_score ?? null,
        alerts: alerts ?? null,
        recommendations: recommendations ?? null,
      })
      .select('*')
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to insert health score', detail: insertError.message },
        { status: 500 }
      )
    }

    // Update the organization's health_score and last_health_check_at
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        health_score: overall_score,
        last_health_check_at: new Date().toISOString(),
      })
      .eq('id', orgId)

    if (updateError) {
      console.error('Failed to update organization health fields:', updateError)
      // Non-fatal — the score was still inserted
    }

    return NextResponse.json({ score }, { status: 201 })
  } catch (err) {
    console.error('POST /api/command-center/orgs/[orgId]/health error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
