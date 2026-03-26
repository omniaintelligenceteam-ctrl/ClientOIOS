import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.getoios.com'

/**
 * POST /api/admin/onboard/[orgId]/welcome-email
 *
 * Sends a welcome email to the client with login info, agent phone number,
 * and call forwarding instructions.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const supabase = getSupabase()
    const { orgId } = await params

    // Get org + owner + agent info
    const [orgResult, userResult, agentResult] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', orgId).single(),
      supabase.from('users').select('*').eq('organization_id', orgId).eq('role', 'owner').single(),
      supabase.from('retell_agents').select('*').eq('organization_id', orgId).eq('is_default', true).single(),
    ])

    if (!orgResult.data || !userResult.data) {
      return NextResponse.json({ error: 'Organization or owner not found' }, { status: 404 })
    }

    const org = orgResult.data
    const owner = userResult.data
    const agent = agentResult.data
    const agentPhone = agent?.phone_number || 'Not yet assigned'

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e2e8f0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #111827; border-radius: 16px; padding: 40px; border: 1px solid rgba(148,163,184,0.1);">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #5eead4; font-size: 28px; margin: 0;">Welcome to OIOS</h1>
      <p style="color: #94a3b8; margin-top: 8px;">Your AI office manager is ready</p>
    </div>

    <p>Hey ${owner.full_name?.split(' ')[0] || 'there'},</p>

    <p>Your OIOS setup for <strong>${org.name}</strong> is live. Here is everything you need to get started.</p>

    <div style="background: #1e293b; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <h3 style="color: #5eead4; margin-top: 0;">Your Dashboard</h3>
      <p><a href="${APP_URL}" style="color: #5eead4; text-decoration: none; font-weight: bold;">${APP_URL}</a></p>
      <p style="color: #94a3b8; font-size: 14px;">Log in with: <strong>${owner.email}</strong></p>
    </div>

    <div style="background: #1e293b; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <h3 style="color: #5eead4; margin-top: 0;">Your AI Agent Phone Number</h3>
      <p style="font-size: 24px; font-weight: bold; margin: 8px 0;">${agentPhone}</p>
      <p style="color: #94a3b8; font-size: 14px;">This is the number Sarah answers. You will forward your business calls here.</p>
    </div>

    <div style="background: #1e293b; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <h3 style="color: #5eead4; margin-top: 0;">Set Up Call Forwarding</h3>
      <p style="color: #94a3b8; font-size: 14px;">Forward your business phone to your AI agent number:</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
        <tr>
          <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;"><strong>AT&T:</strong></td>
          <td style="padding: 8px 0; color: #e2e8f0; font-size: 14px;">Dial *21*${agentPhone.replace(/[^0-9]/g, '')}#</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;"><strong>Verizon:</strong></td>
          <td style="padding: 8px 0; color: #e2e8f0; font-size: 14px;">Dial *72${agentPhone.replace(/[^0-9]/g, '')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #94a3b8; font-size: 14px;"><strong>T-Mobile:</strong></td>
          <td style="padding: 8px 0; color: #e2e8f0; font-size: 14px;">Dial **21*${agentPhone.replace(/[^0-9]/g, '')}#</td>
        </tr>
      </table>
      <p style="color: #94a3b8; font-size: 13px; margin-top: 12px;">For other carriers or VoIP systems, check your provider's call forwarding instructions.</p>
    </div>

    <div style="background: #1e293b; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <h3 style="color: #5eead4; margin-top: 0;">Next Steps</h3>
      <ol style="color: #94a3b8; padding-left: 20px; line-height: 2;">
        <li>Log into your dashboard and explore</li>
        <li>Set up call forwarding using the codes above</li>
        <li>Make a test call to ${agentPhone} to hear Sarah in action</li>
        <li>Check your dashboard — the call should appear within seconds</li>
      </ol>
    </div>

    <p>Questions? Reply to this email or call Wes directly at (480) 305-0357.</p>

    <p style="margin-top: 32px;">— The OIOS Team</p>

    <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(148,163,184,0.1);">
      <p style="color: #64748b; font-size: 12px;">Omnia Intelligence AI — <a href="https://getoios.com" style="color: #5eead4; text-decoration: none;">getoios.com</a></p>
    </div>
  </div>
</body>
</html>`

    // Send via Resend
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
    }

    const emailResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'OIOS <form@getoios.com>',
        to: [owner.email],
        subject: `Welcome to OIOS — ${org.name} is live`,
        html,
      }),
    })

    if (!emailResp.ok) {
      const emailErr = await emailResp.json().catch(() => ({}))
      console.error('Welcome email failed:', emailErr)
      return NextResponse.json(
        { error: 'Failed to send welcome email', detail: emailErr },
        { status: 502 }
      )
    }

    const emailResult = await emailResp.json()
    return NextResponse.json({ ok: true, email_id: emailResult.id })
  } catch (err) {
    console.error('Welcome email error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
