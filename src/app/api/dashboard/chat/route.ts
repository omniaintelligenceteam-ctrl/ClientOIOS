import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'
import { getAnthropicClient } from '@/lib/anthropic'
import { routeModel, getModelConfig } from '@/lib/chat/model-router'
import { buildContext } from '@/lib/chat/context-builder'
import { buildSystemPrompt } from '@/lib/chat/system-prompt'
import type { Organization, User, ChatMessage } from '@/lib/types'

const TIER_RANK: Record<string, number> = {
  answering_service: 1,
  receptionist: 1,
  office_manager: 2,
  coo: 3,
  growth_engine: 3,
}

export async function POST(req: Request) {
  try {
    // 1. Auth check
    const supabase = await createSupabaseServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Fetch profile + org
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 401 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', (profile as User).organization_id)
      .single()

    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    const organization = org as Organization
    const userProfile = profile as User

    // 3. Tier gate
    const tierRank = TIER_RANK[organization.tier] ?? 0
    if (tierRank < 2) {
      return Response.json(
        { error: 'Chat requires Office Manager tier or above' },
        { status: 403 }
      )
    }

    // 4. Parse request
    const body = await req.json()
    const { message, conversation_id } = body as {
      message: string
      conversation_id: string | null
    }

    if (!message?.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400 })
    }

    // Use service client for persistence (bypasses RLS for assistant messages)
    const serviceClient = await createSupabaseServiceClient()
     
    const svc = serviceClient as any

    // 5. Conversation management
    let conversationId = conversation_id
    if (!conversationId) {
      const { data: newConv, error: convError } = await svc
        .from('chat_conversations')
        .insert({
          organization_id: organization.id,
          user_id: authUser.id,
          title: message.slice(0, 60),
        })
        .select('id')
        .single()

      if (convError || !newConv) {
        return Response.json({ error: 'Failed to create conversation' }, { status: 500 })
      }
      conversationId = (newConv as { id: string }).id
    }

    // 6. Persist user message
    await svc.from('chat_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
    })

    // 7. Load conversation history (last 10 messages)
    const { data: history } = await svc
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10)

    // 8. Build context
    const businessContext = await buildContext(supabase, organization, message)

    // 9. Build system prompt
    const systemPrompt = buildSystemPrompt(organization, userProfile, businessContext)

    // 10. Route model
    const modelChoice = routeModel(message, organization.tier)
    const modelConfig = getModelConfig(modelChoice)

    // 11. Build messages array (exclude the just-inserted user message since it's at the end of history)
    const messages = (history ?? []).map((m: Pick<ChatMessage, 'role' | 'content'>) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // 12. Stream response
    const anthropic = getAnthropicClient()
    const stream = anthropic.messages.stream({
      model: modelConfig.model,
      max_tokens: modelConfig.maxTokens,
      system: systemPrompt,
      messages,
    })

    // Create a ReadableStream to pipe SSE events to the client
    const encoder = new TextEncoder()
    let fullResponse = ''

    const readable = new ReadableStream({
      async start(controller) {
        // Send preamble with conversation ID
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'message_start', conversation_id: conversationId })}\n\n`)
        )

        try {
          // Stream text events as they arrive
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullResponse += event.delta.text
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'text_delta', text: event.delta.text })}\n\n`)
              )
            }
          }

          // Get the final message for usage stats after stream completes
          const finalMessage = await stream.finalMessage()

          // Send completion
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'message_stop', model: modelChoice })}\n\n`)
          )

          // Persist assistant message
          try {
            await svc.from('chat_messages').insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: fullResponse,
              model_used: modelChoice,
              context_tokens: finalMessage.usage?.input_tokens ?? null,
            })
          } catch (insertErr) {
            console.error('Failed to persist assistant message:', insertErr)
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Stream error'
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`)
          )
          // Attempt to save an error message so the conversation stays coherent
          try {
            await svc.from('chat_messages').insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: `[Error: ${errorMsg}] I encountered an issue generating a response. Please try again.`,
              model_used: modelChoice ?? null,
            })
          } catch (fallbackErr) {
            console.error('Failed to persist error message:', fallbackErr)
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('Chat API error:', err)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
