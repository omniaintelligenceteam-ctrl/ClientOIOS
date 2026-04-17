// ============================================================
// OIOS Compliance helpers — CAN-SPAM, cron auth, unsubscribe
// ============================================================

import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Cron / internal auth — hard-fails in production without a secret
// ---------------------------------------------------------------------------

export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  const isProd = process.env.NODE_ENV === 'production'

  if (isProd) {
    if (!secret) {
      console.error('[compliance] CRON_SECRET missing in production — denying')
      return false
    }
    return request.headers.get('authorization') === `Bearer ${secret}`
  }

  // Dev: if secret is configured, still require it; otherwise allow.
  if (!secret) return true
  return request.headers.get('authorization') === `Bearer ${secret}`
}

// ---------------------------------------------------------------------------
// Resend webhook signature verification
// Resend sends svix-style signed webhooks (svix-id, svix-timestamp, svix-signature)
// ---------------------------------------------------------------------------

export function verifyResendSignature(
  rawBody: string,
  headers: Headers,
  secret: string | undefined,
): boolean {
  if (!secret) return false
  const id = headers.get('svix-id')
  const ts = headers.get('svix-timestamp')
  const sig = headers.get('svix-signature')
  if (!id || !ts || !sig) return false

  // Replay protection — reject if timestamp older than 5 minutes
  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum)) return false
  if (Math.abs(Date.now() / 1000 - tsNum) > 300) return false

  const signedPayload = `${id}.${ts}.${rawBody}`
  const secretBytes = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice(6), 'base64')
    : Buffer.from(secret, 'utf8')
  const expected = crypto
    .createHmac('sha256', secretBytes)
    .update(signedPayload)
    .digest('base64')

  // svix-signature is space-separated "v1,<sig> v1,<sig>..."
  const candidates = sig.split(' ').map((s) => s.split(',')[1]).filter(Boolean)
  return candidates.some((c) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(c, 'base64'), Buffer.from(expected, 'base64'))
    } catch {
      return false
    }
  })
}

// ---------------------------------------------------------------------------
// Unsubscribe token — HMAC-signed so we can honor one-click unsubscribes
// without a DB lookup. Format: <base64url payload>.<base64url sig>
// Payload: { e: email, t: issued_at_unix }
// ---------------------------------------------------------------------------

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

function unsubSecret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || 'oios-dev-secret'
}

export function createUnsubscribeToken(email: string): string {
  const payload = b64url(Buffer.from(JSON.stringify({ e: email.toLowerCase(), t: Math.floor(Date.now() / 1000) })))
  const sig = b64url(crypto.createHmac('sha256', unsubSecret()).update(payload).digest())
  return `${payload}.${sig}`
}

export function verifyUnsubscribeToken(token: string): { email: string } | null {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = b64url(crypto.createHmac('sha256', unsubSecret()).update(payload).digest())
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch {
    return null
  }
  try {
    const parsed = JSON.parse(b64urlDecode(payload).toString('utf8')) as { e?: string }
    if (!parsed.e) return null
    return { email: parsed.e }
  } catch {
    return null
  }
}

export function unsubscribeUrl(email: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://getoios.com'
  return `${base}/api/unsubscribe?t=${encodeURIComponent(createUnsubscribeToken(email))}`
}

// ---------------------------------------------------------------------------
// do_not_contact fetch — returns lowercased email set for an org
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchDncEmails(svc: any, organizationId: string): Promise<Set<string>> {
  const dnc = new Set<string>()

  const { data: leads } = await svc
    .from('leads')
    .select('email')
    .eq('organization_id', organizationId)
    .eq('do_not_contact', true)
    .not('email', 'is', null)

  for (const row of (leads ?? []) as Array<{ email: string | null }>) {
    if (row.email) dnc.add(row.email.toLowerCase())
  }

  // suppression_list table is optional — only query if present
  try {
    const { data: suppressed } = await svc
      .from('suppression_list')
      .select('email')
      .eq('organization_id', organizationId)
    for (const row of (suppressed ?? []) as Array<{ email: string | null }>) {
      if (row.email) dnc.add(row.email.toLowerCase())
    }
  } catch {
    // table doesn't exist yet — that's fine
  }

  return dnc
}

// ---------------------------------------------------------------------------
// CAN-SPAM mailing address — configurable per-env
// ---------------------------------------------------------------------------

export function senderPhysicalAddress(): string {
  return (
    process.env.SENDER_PHYSICAL_ADDRESS ||
    'OIOS, LLC · 2261 Market St #86437 · San Francisco, CA 94114'
  )
}
