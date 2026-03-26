'use client'

import { useChat } from './chat-provider'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'
import { ChatEmptyState } from './chat-empty-state'
import { ConversationSidebar } from './conversation-sidebar'
import { Sparkles } from 'lucide-react'

export function ChatFullPage() {
  const { messages, isStreaming, error, sendMessage } = useChat()

  return (
    <div className="-m-4 sm:-m-6 flex h-[calc(100vh-64px)]">
      {/* Sidebar — conversations + stats (hidden on mobile) */}
      <div className="hidden md:block">
        <ConversationSidebar />
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col bg-[#0B1120]">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[rgba(148,163,184,0.1)] px-4 py-3 flex-shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600/20 border border-teal-500/30">
            <Sparkles className="h-4.5 w-4.5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#F8FAFC]">AI Assistant</h1>
            <p className="text-[10px] text-slate-500">Powered by Claude</p>
          </div>
        </div>

        {messages.length === 0 ? (
          <ChatEmptyState onSuggestionClick={sendMessage} />
        ) : (
          <ChatMessages messages={messages} isStreaming={isStreaming} />
        )}

        {/* Error */}
        {error && (
          <div className="mx-4 mb-2 rounded-lg bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]">
            {error}
          </div>
        )}

        <ChatInput onSend={sendMessage} disabled={isStreaming} />
      </div>
    </div>
  )
}
