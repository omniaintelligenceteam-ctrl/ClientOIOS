import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const VALID_STATUSES = ['pending', 'configuring', 'testing', 'live', 'paused'] as const

/**
 * PATCH /api/admin/onboard/[orgId]/status
 *
 * Updates the onboarding status for an organization.
 *
 * Body: { status: 'pending' | 'configuring' | 'testing' | 'live' | 'paused' }
 * Returns: { ok: true }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const supabase = getSupabase()
    const { orgId } = await params
    const body = await request.json()
    const { status } = body

    // ── Validate status value ─────────────────────────────────────────
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // ── Verify the org exists ────────────────────────────────────────
    const { data: org, error: lookupError } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', orgId)
      .single()

    if (lookupError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // ── Update the organization ───────────────────────────────────────
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        onboarding_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orgId)

    if (updateError) {
      console.error('Status update failed:', updateError)
      return NextResponse.json(
        { error: 'Failed to update onboarding status', detail: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Status update error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
