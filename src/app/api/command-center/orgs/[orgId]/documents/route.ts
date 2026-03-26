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
 * GET /api/command-center/orgs/[orgId]/documents
 * Returns documents for an org, ordered by updated_at DESC, limit 20.
 * Internal only — no auth required.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    const supabase = getServiceSupabase()

    const { data: documents, error } = await supabase
      .from('workspace_documents')
      .select('*')
      .eq('organization_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch documents', detail: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ documents }, { status: 200 })
  } catch (err) {
    console.error('GET /api/command-center/orgs/[orgId]/documents error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/command-center/orgs/[orgId]/documents
 * Create a new workspace document for an org.
 * Requires bearer token auth (COMMAND_CENTER_SECRET).
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

    const { doc_type, title, content, created_by_platform, metadata } = body

    if (!doc_type || !title || !created_by_platform) {
      return NextResponse.json(
        { error: 'Missing required fields: doc_type, title, created_by_platform' },
        { status: 400 }
      )
    }

    const { data: document, error } = await supabase
      .from('workspace_documents')
      .insert({
        organization_id: orgId,
        doc_type,
        title,
        content: content || null,
        created_by_platform,
        metadata: metadata || {},
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create document', detail: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ document }, { status: 201 })
  } catch (err) {
    console.error('POST /api/command-center/orgs/[orgId]/documents error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
