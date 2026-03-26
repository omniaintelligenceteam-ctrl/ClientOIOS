'use client'

import { Menu, Bell } from 'lucide-react'

interface MobileHeaderProps {
  onMenuClick: () => void
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="flex md:hidden flex-shrink-0 items-center justify-between h-14 border-b border-[rgba(148,163,184,0.1)] bg-[#111827] px-4">
      {/* Hamburger — triggers sidebar open */}
      <button
        type="button"
        onClick={onMenuClick}
        className="flex items-center justify-center h-11 w-11 rounded-lg text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC] -ml-2"
        aria-label="Open navigation"
      >
        <Menu size={22} />
      </button>

      {/* OIOS Logo */}
      <span className="gradient-text text-xl font-extrabold tracking-tight">OIOS</span>

      {/* Notification bell */}
      <a
        href="/dashboard/notifications"
        className="flex items-center justify-center h-11 w-11 rounded-lg text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC] -mr-2"
        aria-label="Notifications"
      >
        <Bell size={20} />
      </a>
    </header>
  )
}
