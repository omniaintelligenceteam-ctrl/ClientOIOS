'use client'

import { useState } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { ChatPanel } from './chat-panel'

const TIER_RANK: Record<string, number> = {
  answering_service: 1,
  receptionist: 1,
  office_manager: 2,
  coo: 3,
  growth_engine: 3,
}

export function ChatFAB() {
  const [isOpen, setIsOpen] = useState(false)
  const { organization } = useAuth()

  // Tier gate — hide for answering_service / receptionist
  const tierRank = TIER_RANK[organization?.tier ?? 'answering_service'] ?? 0
  if (tierRank < 2) return null

  return (
    <>
      {isOpen && <ChatPanel onClose={() => setIsOpen(false)} />}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#2DD4BF] text-[#0B1120] shadow-lg shadow-[#2DD4BF]/25 transition-all hover:bg-[#5EEAD4] hover:shadow-[#2DD4BF]/35 active:scale-95 sm:right-6"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
      </button>
    </>
  )
}
