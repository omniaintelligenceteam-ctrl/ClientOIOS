'use client'

import { useChat } from './chat-provider'
import { Plus, MessageSquare, Trash2 } from 'lucide-react'

export function ConversationSidebar() {
  const {
    conversations,
    activeConversationId,
    loadConversation,
    newConversation,
    deleteConversation,
  } = useChat()

  return (
    <div className="flex h-full w-64 flex-col border-r border-[rgba(148,163,184,0.1)] bg-[#111827] lg:w-72">
      {/* New chat button */}
      <div className="border-b border-[rgba(148,163,184,0.1)] p-3">
        <button
          type="button"
          onClick={newConversation}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2DD4BF]/10 px-4 py-2.5 text-sm font-medium text-[#2DD4BF] transition-colors hover:bg-[#2DD4BF]/20"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <MessageSquare size={24} className="text-[#64748B]" />
            <p className="mt-2 text-sm text-[#64748B]">No conversations yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId
              const timeAgo = formatTimeAgo(conv.updated_at)

              return (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#2DD4BF]/10 text-[#F8FAFC]'
                      : 'text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#F8FAFC]'
                  }`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">
                      {conv.title || 'New chat'}
                    </p>
                    <p className="text-[10px] text-[#64748B]">{timeAgo}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteConversation(conv.id)
                    }}
                    className="flex-shrink-0 rounded p-1 text-[#64748B] opacity-0 transition-all hover:bg-[#EF4444]/10 hover:text-[#EF4444] group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}
