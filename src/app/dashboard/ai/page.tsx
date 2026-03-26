'use client'

import { useAuth } from '@/lib/auth-context'
import { ChatFullPage } from '@/components/dashboard/chat/chat-full-page'
import { Lock, ArrowUpRight } from 'lucide-react'

const TIER_RANK: Record<string, number> = {
  answering_service: 1,
  receptionist: 1,
  office_manager: 2,
  coo: 3,
  growth_engine: 3,
}

export default function AIAssistantPage() {
  const { organization } = useAuth()
  const tierRank = TIER_RANK[organization?.tier ?? 'answering_service'] ?? 0

  if (tierRank < 2) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f97316]/10 text-[#f97316]">
          <Lock size={32} />
        </div>
        <h2 className="mt-6 text-xl font-bold text-[#F8FAFC]">
          AI Assistant — Office Manager Tier
        </h2>
        <p className="mt-2 max-w-md text-center text-sm text-[#94A3B8]">
          Get an AI assistant that knows your entire business. Ask about calls, leads,
          customers, invoices, reviews, and more.
        </p>
        <button
          type="button"
          onClick={() => window.open('https://getoios.com/pricing', '_blank')}
          className="mt-6 flex items-center gap-2 rounded-xl bg-[#2DD4BF] px-6 py-2.5 text-sm font-semibold text-[#0B1120] transition-all hover:bg-[#5EEAD4]"
        >
          Upgrade Now
          <ArrowUpRight size={16} />
        </button>
      </div>
    )
  }

  return <ChatFullPage />
}
