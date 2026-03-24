'use client'

import { Bot } from 'lucide-react'

export function ChatTypingIndicator() {
  return (
    <div className="flex gap-3 animate-chat-fade-in">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#6366F1]/20 text-[#818CF8]">
        <Bot size={16} />
      </div>
      <div className="flex items-center gap-1 rounded-2xl bg-[#1E293B] px-4 py-3">
        <span className="chat-typing-dot h-2 w-2 rounded-full bg-[#64748B]" style={{ animationDelay: '0ms' }} />
        <span className="chat-typing-dot h-2 w-2 rounded-full bg-[#64748B]" style={{ animationDelay: '150ms' }} />
        <span className="chat-typing-dot h-2 w-2 rounded-full bg-[#64748B]" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
