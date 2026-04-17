// ============================================================
// GET/POST /api/unsubscribe?t=<token>
// One-click unsubscribe. Verifies HMAC token, flips
// do_not_contact on any matching lead, appends to suppression_list.
// CAN-SPAM + RFC 8058 (List-Unsubscribe-Post) compliant.
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { verifyUnsubscribeToken } from '@/lib/compliance'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribe</title><style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f4f5;margin:0;padding:40px 20px;}
    .card{max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.05);}
    h1{margin:0 0 12px;font-size:22px;color:#18181b;} p{margin:0 0 8px;color:#52525b;line-height:1.5;}
    .ok{color:#059669;} .err{color:#dc2626;}
    </style></head><body><div class="card">${body}</div></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8' } },
  )
}

async function process(token: string): Promise<Response> {
  const verified = verifyUnsubscribeToken(token)
  if (!verified) {
    return htmlResponse(
      `<h1 class="err">Invalid unsubscribe link</h1><p>This link is expired or invalid. Reply to the email and we'll remove you manually.</p>`,
      400,
    )
  }

  const email = verified.email.toLowerCase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = getSupabase() as any

  const { data: leads } = await svc
    .from('leads')
    .select('id, organization_id')
    .eq('email', email)

  for (const lead of (leads ?? []) as Array<{ id: string; organization_id: string }>) {
    await svc
      .from('leads')
      .update({ do_not_contact: true, status: 'lost', updated_at: new Date().toISOString() })
      .eq('id', lead.id)

    try {
      await svc.from('suppression_list').upsert(
        {
          organization_id: lead.organization_id,
          email,
          source: 'one_click_unsubscribe',
          created_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,email' },
      )
    } catch {
      // suppression_list table may not exist yet
    }
  }

  return htmlResponse(
    `<h1 class="ok">You've been unsubscribed</h1><p><strong>${email}</strong> will no longer receive emails from us.</p><p>If this was a mistake, just reply to any prior message and we'll put you back on the list.</p>`,
  )
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('t')
  if (!token) return htmlResponse(`<h1 class="err">Missing token</h1>`, 400)
  return process(token)
}

export async function POST(request: Request) {
  // RFC 8058 one-click — token in query string, POST body may be empty
  const url = new URL(request.url)
  let token = url.searchParams.get('t')
  if (!token) {
    try {
      const form = await request.formData()
      token = String(form.get('t') || '')
    } catch {
      // no body — fall through
    }
  }
  if (!token) return htmlResponse(`<h1 class="err">Missing token</h1>`, 400)
  return process(token)
}
