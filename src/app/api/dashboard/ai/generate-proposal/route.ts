import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getAnthropicClient } from '@/lib/anthropic'

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { leadName, service, value, notes, businessName, phone, email } = await req.json()

    const anthropic = getAnthropicClient()

    const prompt = `Generate a professional service proposal for the following:

Customer Name: ${leadName}
Service Needed: ${service}
Estimated Value: $${value.toLocaleString()}
Contact Phone: ${phone || 'N/A'}
Contact Email: ${email || 'N/A'}
Additional Notes: ${notes || 'None'}
Business Name: ${businessName}

Write a complete, professional proposal in markdown format. Include:
1. A personalized greeting
2. Understanding of their needs
3. Proposed scope of work
4. Investment/pricing section
5. Why choose us (3 bullet points)
6. Clear next steps
7. Professional closing

Keep it concise (300-400 words), warm, and professional. Use markdown formatting with headers and bullets.`

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const proposal = msg.content[0].type === 'text' ? msg.content[0].text : ''

    return Response.json({ proposal })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return Response.json({ error: message }, { status: 500 })
  }
}
