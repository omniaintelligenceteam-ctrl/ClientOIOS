// ============================================================
// OIOS Client Dashboard — Bulk Customer Import Endpoint
// POST /api/customers/import
// Body: { rows: string[][], headers: string[], mapping: Record<string, number> }
//   mapping maps OIOS field names (customer_name|email|phone|address|notes)
//   to zero-based column indices in the rows arrays
// ============================================================

import { createSupabaseServerClient } from '@/lib/supabase-server'

type OIOSField = 'customer_name' | 'email' | 'phone' | 'address' | 'notes'

interface ImportBody {
  rows: string[][]
  headers: string[]
  mapping: Record<OIOSField | string, number>
  organizationId?: string // optional client hint; server always uses auth'd org
}

interface CustomerInsert {
  organization_id: string
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
  source: string
  created_at: string
}

export async function POST(request: Request) {
  try {
    // -------------------------------------------------------------------------
    // Auth
    // -------------------------------------------------------------------------
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single() as { data: { organization_id: string } | null }
    if (!profile) return Response.json({ error: 'Profile not found' }, { status: 401 })

    const orgId = profile.organization_id

    // -------------------------------------------------------------------------
    // Parse body
    // -------------------------------------------------------------------------
    let body: ImportBody
    try {
      body = await request.json() as ImportBody
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { rows, mapping } = body

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: 'rows must be a non-empty array' }, { status: 400 })
    }
    if (!mapping || typeof mapping !== 'object') {
      return Response.json({ error: 'mapping is required' }, { status: 400 })
    }

    // Validate required field
    if (mapping['customer_name'] === undefined || mapping['customer_name'] === null) {
      return Response.json(
        { error: 'mapping must include customer_name column index' },
        { status: 400 }
      )
    }

    const nameIdx    = mapping['customer_name']
    const emailIdx   = mapping['email']   ?? null
    const phoneIdx   = mapping['phone']   ?? null
    const addressIdx = mapping['address'] ?? null
    const notesIdx   = mapping['notes']   ?? null

    // -------------------------------------------------------------------------
    // Fetch existing phone numbers for deduplication (if phone is mapped)
    // -------------------------------------------------------------------------
    let existingPhones = new Set<string>()

    if (phoneIdx !== null) {
       
      const { data: existing } = await (supabase as any)
        .from('customers')
        .select('phone')
        .eq('organization_id', orgId)
        .not('phone', 'is', null)

      if (existing) {
        existingPhones = new Set(
          (existing as { phone: string }[])
            .map((r) => normalizePhone(r.phone))
            .filter(Boolean)
        )
      }
    }

    // -------------------------------------------------------------------------
    // Build insert objects
    // -------------------------------------------------------------------------
    const toInsert: CustomerInsert[] = []
    const skippedPhones              = new Set<string>()
    const errors: string[]           = []
    let   skipped                    = 0
    const now                        = new Date().toISOString()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      // Extract fields
      const name    = cellValue(row, nameIdx)
      const email   = cellValue(row, emailIdx)
      const phone   = cellValue(row, phoneIdx)
      const address = cellValue(row, addressIdx)
      const notes   = cellValue(row, notesIdx)

      // Skip if name is missing
      if (!name) {
        errors.push(`Row ${i + 1}: missing customer name — skipped`)
        skipped++
        continue
      }

      // Deduplicate by phone
      if (phone) {
        const normalised = normalizePhone(phone)
        if (existingPhones.has(normalised) || skippedPhones.has(normalised)) {
          skipped++
          continue
        }
        skippedPhones.add(normalised)
      }

      toInsert.push({
        organization_id: orgId,
        name,
        email:   email   || null,
        phone:   phone   || null,
        address: address || null,
        notes:   notes   || null,
        source:  'csv_import',
        created_at: now,
      })
    }

    if (toInsert.length === 0) {
      return Response.json({
        imported: 0,
        skipped,
        errors,
      })
    }

    // -------------------------------------------------------------------------
    // Batch upsert — chunk into groups of 500 to stay within Supabase limits
    // -------------------------------------------------------------------------
    const CHUNK_SIZE = 500
    let   imported   = 0

    for (let offset = 0; offset < toInsert.length; offset += CHUNK_SIZE) {
      const chunk = toInsert.slice(offset, offset + CHUNK_SIZE)

       
      const { error: insertError, count } = await (supabase as any)
        .from('customers')
        .upsert(chunk, {
          onConflict: 'organization_id,phone',
          ignoreDuplicates: true,
          count: 'exact',
        })

      if (insertError) {
        console.error('[customers/import] upsert error:', insertError)
        // Log chunk failure but continue
        const start = offset + 1
        const end   = Math.min(offset + CHUNK_SIZE, toInsert.length)
        errors.push(`Rows ${start}–${end}: database error — ${insertError.message ?? 'unknown'}`)
        skipped += chunk.length
      } else {
        imported += count ?? chunk.length
      }
    }

    return Response.json({ imported, skipped, errors })
  } catch (err) {
    console.error('[customers/import] unexpected error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cellValue(row: string[], index: number | null): string {
  if (index === null || index < 0 || index >= row.length) return ''
  return (row[index] ?? '').trim()
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}
