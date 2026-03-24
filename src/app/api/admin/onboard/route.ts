import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * POST /api/admin/onboard
 *
 * Creates a new client organization with an owner user account.
 *
 * Body: { name, trade, phone_number, timezone, business_hours, owner_name, owner_email, owner_password, tier }
 * Returns: { organization_id, user_id }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const body = await request.json()
    const {
      name,
      trade,
      phone_number,
      timezone,
      business_hours,
      owner_name,
      owner_email,
      owner_password,
      tier,
    } = body

    // ── Validate required fields ──────────────────────────────────────
    if (!name || !trade || !owner_name || !owner_email || !owner_password) {
      return NextResponse.json(
        { error: 'Missing required fields: name, trade, owner_name, owner_email, owner_password' },
        { status: 400 }
      )
    }

    // ── Generate slug from org name ───────────────────────────────────
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // ── 1. Create the organization ────────────────────────────────────
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        trade,
        phone_number: phone_number || null,
        timezone: timezone || 'America/New_York',
        business_hours: business_hours || null,
        tier: tier || 'answering_service',
        onboarding_status: 'pending',
        ai_agent_name: 'Sarah',
        monthly_minutes_included: 0,
        monthly_minutes_used: 0,
      })
      .select('id')
      .single()

    if (orgError || !org) {
      console.error('Organization creation failed:', orgError)
      return NextResponse.json(
        { error: 'Failed to create organization', detail: orgError?.message },
        { status: 500 }
      )
    }

    const organizationId = org.id

    // ── 2. Create auth user via Supabase Auth signup endpoint ─────────
    const signupResp = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        email: owner_email,
        password: owner_password,
        data: {
          full_name: owner_name,
          organization_id: organizationId,
        },
      }),
    })

    if (!signupResp.ok) {
      const signupErr = await signupResp.json().catch(() => ({}))
      console.error('Auth signup failed:', signupErr)
      // Roll back: delete the org we just created
      await supabase.from('organizations').delete().eq('id', organizationId)
      return NextResponse.json(
        { error: 'Failed to create auth user', detail: signupErr.msg || signupErr.message },
        { status: 500 }
      )
    }

    const authUser = await signupResp.json()
    const userId = authUser.id

    if (!userId) {
      console.error('Signup returned no user ID:', authUser)
      await supabase.from('organizations').delete().eq('id', organizationId)
      return NextResponse.json(
        { error: 'Auth signup did not return a user ID' },
        { status: 500 }
      )
    }

    // ── 3. Confirm the user's email immediately ──────────────────────
    // Use the Supabase Auth Admin API to auto-confirm email
    const adminUpdateResp = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${userId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          email_confirm: true,
        }),
      }
    )

    if (!adminUpdateResp.ok) {
      const adminErr = await adminUpdateResp.json().catch(() => ({}))
      console.error('Email confirmation failed:', adminErr)
      // Non-fatal — user just needs to confirm email manually
    }

    // ── 4. Create public.users row ───────────────────────────────────
    const { error: userRowError } = await supabase.from('users').insert({
      id: userId,
      organization_id: organizationId,
      full_name: owner_name,
      email: owner_email,
      role: 'owner',
      is_super_admin: false,
    })

    if (userRowError) {
      console.error('Public user row creation failed:', userRowError)
      return NextResponse.json(
        { error: 'Failed to create user profile', detail: userRowError.message },
        { status: 500 }
      )
    }

    // ── Done ──────────────────────────────────────────────────────────
    return NextResponse.json(
      { organization_id: organizationId, user_id: userId },
      { status: 201 }
    )
  } catch (err) {
    console.error('Onboard error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
