import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/* ------------------------------------------------------------------ */
/*  Lazy Supabase client                                               */
/* ------------------------------------------------------------------ */

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/* ------------------------------------------------------------------ */
/*  GET /api/billing/usage                                             */
/*  Returns the current-month usage for the authenticated user's org.  */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    const supabase = getSupabase()

    // --- Authenticate the request via the user's session cookie ------
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // --- Look up the user's organization -----------------------------
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        { error: 'User has no organization' },
        { status: 400 }
      )
    }

    const orgId = profile.organization_id

    // --- Fetch org metadata (tier / minutes included) ----------------
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('monthly_minutes_included, monthly_minutes_used, tier')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // --- Calculate current month boundaries (UTC) --------------------
    const now = new Date()
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    ).toISOString()
    const monthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
    ).toISOString()

    // --- Count calls & sum duration for this org this month ----------
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('duration_seconds')
      .eq('organization_id', orgId)
      .gte('started_at', monthStart)
      .lt('started_at', monthEnd)

    if (callsError) {
      // Non-fatal — fall back to org-level cached value
      const minutesIncluded = org.monthly_minutes_included ?? 0
      const totalMinutes = org.monthly_minutes_used ?? 0
      const isUnlimited = org.tier === 'growth_engine'

      return NextResponse.json({
        calls_count: 0,
        total_minutes: totalMinutes,
        minutes_included: minutesIncluded,
        minutes_remaining: isUnlimited
          ? null
          : Math.max(minutesIncluded - totalMinutes, 0),
        usage_percentage: isUnlimited
          ? 0
          : minutesIncluded > 0
            ? Math.min(Math.round((totalMinutes / minutesIncluded) * 100), 100)
            : 0,
      })
    }

    const callsCount = calls.length
    const totalSeconds = calls.reduce(
      (sum, c) => sum + (c.duration_seconds || 0),
      0
    )
    const totalMinutes = Math.round(totalSeconds / 60)
    const minutesIncluded = org.monthly_minutes_included ?? 0
    const isUnlimited = org.tier === 'growth_engine'

    return NextResponse.json({
      calls_count: callsCount,
      total_minutes: totalMinutes,
      minutes_included: minutesIncluded,
      minutes_remaining: isUnlimited
        ? null
        : Math.max(minutesIncluded - totalMinutes, 0),
      usage_percentage: isUnlimited
        ? 0
        : minutesIncluded > 0
          ? Math.min(Math.round((totalMinutes / minutesIncluded) * 100), 100)
          : 0,
    })
  } catch (err) {
    console.error('[billing/usage] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
