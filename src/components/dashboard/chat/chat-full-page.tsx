'use client'

import { useChat } from './chat-provider'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'
import { ChatEmptyState } from './chat-empty-state'
import { ConversationSidebar } from './conversation-sidebar'

export function ChatFullPage() {
  const { messages, isStreaming, error, sendMessage } = useChat()

  return (
    <div className="-m-4 sm:-m-6 flex h-[calc(100vh-64px)]">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <ConversationSidebar />
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col bg-[#0B1120]">
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
