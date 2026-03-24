'use client'

import { useChat } from './chat-provider'
import { ChatMessages } from './chat-messages'
import { ChatInput } from './chat-input'
import { ChatEmptyState } from './chat-empty-state'
import { X, Maximize2 } from 'lucide-react'
import Link from 'next/link'

interface ChatPanelProps {
  onClose: () => void
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const { messages, isStreaming, error, sendMessage } = useChat()

  return (
    <div className="fixed bottom-20 right-4 z-50 flex h-[500px] w-[400px] flex-col overflow-hidden rounded-2xl border border-[rgba(148,163,184,0.15)] bg-[#111827] shadow-2xl shadow-black/40 animate-chat-slide-up sm:right-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.1)] px-4 py-3">
        <span className="text-sm font-semibold text-[#F8FAFC]">AI Assistant</span>
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard/chat"
            className="rounded-lg p-1.5 text-[#64748B] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
            title="Open full chat"
          >
            <Maximize2 size={16} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748B] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages area */}
      {messages.length === 0 ? (
        <ChatEmptyState compact onSuggestionClick={sendMessage} />
      ) : (
        <ChatMessages messages={messages} isStreaming={isStreaming} />
      )}

      {/* Error */}
      {error && (
        <div className="mx-3 mb-2 rounded-lg bg-[#EF4444]/10 px-3 py-2 text-xs text-[#EF4444]">
          {error}
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  )
}
