'use client'

import type { ChatMessage } from '@/lib/types'
import { Bot, User } from 'lucide-react'

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 animate-chat-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
          isUser
            ? 'bg-[#2DD4BF]/20 text-[#2DD4BF]'
            : 'bg-[#6366F1]/20 text-[#818CF8]'
        }`}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-[#2DD4BF]/10 text-[#F8FAFC]'
            : 'bg-[#1E293B] text-[#E2E8F0]'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        {message.model_used && (
          <div className="mt-1.5 text-[10px] text-[#64748B]">
            {message.model_used}
          </div>
        )}
      </div>
    </div>
  )
}
