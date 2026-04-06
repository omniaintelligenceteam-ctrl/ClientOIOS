'use client'

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import type { ChatConversation, ChatMessage } from '@/lib/types'

interface ChatContextValue {
  conversations: ChatConversation[]
  activeConversationId: string | null
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  sendMessage: (text: string) => Promise<void>
  newConversation: () => void
  loadConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  loadConversations: () => Promise<void>
}

const ChatContext = createContext<ChatContextValue>({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  error: null,
  sendMessage: async () => {},
  newConversation: () => {},
  loadConversation: async () => {},
  deleteConversation: async () => {},
  loadConversations: async () => {},
})

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/chat/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations ?? [])
      }
    } catch {
      // silently fail — conversations list is non-critical
    }
  }, [])

  // Conversations are loaded on-demand when the chat panel opens,
  // not eagerly on every page load (perf: saves 1 API call per navigation)

  const loadConversation = useCallback(async (id: string) => {
    setActiveConversationId(id)
    setMessages([])
    setError(null)

    try {
      const res = await fetch(`/api/dashboard/chat/conversations/${id}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages ?? [])
      }
    } catch {
      setError('Failed to load conversation')
    }
  }, [])

  const newConversation = useCallback(() => {
    setActiveConversationId(null)
    setMessages([])
    setError(null)
  }, [])

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`/api/dashboard/chat/conversations/${id}`, { method: 'DELETE' })
      setConversations(prev => prev.filter(c => c.id !== id))
      if (activeConversationId === id) {
        setActiveConversationId(null)
        setMessages([])
      }
    } catch {
      setError('Failed to delete conversation')
    }
  }, [activeConversationId])

  const sendMessage = useCallback(async (text: string) => {
    if (isStreaming) return
    setIsStreaming(true)
    setError(null)

    // Optimistically add user message
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConversationId ?? '',
      role: 'user',
      content: text,
      model_used: null,
      context_tokens: null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])

    // Add placeholder assistant message for streaming
    const assistantMsg: ChatMessage = {
      id: `temp-assistant-${Date.now()}`,
      conversation_id: activeConversationId ?? '',
      role: 'assistant',
      content: '',
      model_used: null,
      context_tokens: null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, assistantMsg])

    try {
      abortRef.current = new AbortController()

      const res = await fetch('/api/dashboard/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversation_id: activeConversationId,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'message_start' && event.conversation_id) {
              // Update conversation ID if new
              if (!activeConversationId) {
                setActiveConversationId(event.conversation_id)
              }
            } else if (event.type === 'text_delta') {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + event.text,
                  }
                }
                return updated
              })
            } else if (event.type === 'message_stop') {
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    model_used: event.model,
                  }
                }
                return updated
              })
            } else if (event.type === 'error') {
              setError(event.error)
            }
          } catch {
            // skip unparseable events
          }
        }
      }

      // Refresh conversations list
      await loadConversations()
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to send message')
      // Remove the empty assistant message on error
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && !last.content) {
          return prev.slice(0, -1)
        }
        return prev
      })
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [activeConversationId, isStreaming, loadConversations])

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        messages,
        isStreaming,
        error,
        sendMessage,
        newConversation,
        loadConversation,
        deleteConversation,
        loadConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => useContext(ChatContext)
