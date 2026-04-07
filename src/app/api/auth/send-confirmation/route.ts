import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.getoios.com'

/**
 * POST /api/auth/send-confirmation
 *
 * Sends a signup confirmation email to a newly registered user.
 * Called immediately after successful Supabase auth.signUp.
 *
 * Body: { email, fullName }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, fullName } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    if (!RESEND_API_KEY) {
      console.error('[send-confirmation] RESEND_API_KEY not configured')
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    const firstName = fullName?.split(' ')[0] || 'there'

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e2e8f0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #111827; border-radius: 16px; padding: 40px; border: 1px solid rgba(148,163,184,0.1);">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #5eead4; font-size: 28px; margin: 0;">OIOS</h1>
      <p style="color: #94a3b8; margin-top: 8px;">Account Created Successfully</p>
    </div>

    <p>Hey ${firstName},</p>

    <p>Your OIOS account has been created. You're in the queue — our team will reach out shortly to complete your setup.</p>

    <div style="background: #1e293b; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
      <a href="${APP_URL}/dashboard" style="display: inline-block; background: linear-gradient(to right, #14b8a6, #2dd4bf); color: white; text-decoration: none; font-weight: 600; padding: 12px 32px; border-radius: 8px; font-size: 14px;">Go to Dashboard</a>
    </div>

    <p style="color: #94a3b8; font-size: 14px;">Your login email: <strong style="color: #e2e8f0;">${email}</strong></p>

    <p style="color: #94a3b8; font-size: 14px;">Questions? Reply to this email or reach us at <a href="mailto:team@oioscoo.com" style="color: #5eead4; text-decoration: none;">team@oioscoo.com</a>.</p>

    <p style="margin-top: 32px;">— The OIOS Team</p>

    <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(148,163,184,0.1);">
      <p style="color: #64748b; font-size: 12px;">Omnia Intelligence AI — <a href="https://getoios.com" style="color: #5eead4; text-decoration: none;">getoios.com</a></p>
    </div>
  </div>
</body>
</html>`

    const emailResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'OIOS <team@oioscoo.com>',
        to: [email],
        subject: 'Welcome to OIOS — your account is ready',
        html,
      }),
    })

    if (!emailResp.ok) {
      const emailErr = await emailResp.json().catch(() => ({}))
      console.error('[send-confirmation] Resend error:', emailErr)
      return NextResponse.json(
        { error: 'Failed to send confirmation email', detail: emailErr },
        { status: 502 }
      )
    }

    const result = await emailResp.json()
    console.log(`[send-confirmation] Sent to ${email} — email_id: ${result.id}`)
    return NextResponse.json({ ok: true, email_id: result.id })
  } catch (err) {
    console.error('[send-confirmation] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
