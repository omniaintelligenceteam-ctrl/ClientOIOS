// Phase Beta: Command Center Header
'use client'

import { useState } from 'react'
import { Search, Bell, User } from 'lucide-react'

interface CommandCenterHeaderProps {
  pageName?: string
}

export function CommandCenterHeader({ pageName = 'Command Center' }: CommandCenterHeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false)

  return (
    <div className="hidden md:flex items-center gap-4 h-12 px-4 border-b border-[rgba(148,163,184,0.06)] bg-white/[0.015] backdrop-blur-sm">
      {/* Logo */}
      <span className="gradient-text text-sm font-extrabold tracking-tight mr-2">OIOS</span>

      {/* Page name */}
      <span className="text-xs text-slate-500 font-medium">/</span>
      <span className="text-xs text-slate-300 font-medium">{pageName}</span>

      <div className="flex-1" />

      {/* Search */}
      <div className={`relative transition-all duration-200 ${searchFocused ? 'w-72' : 'w-48'}`}>
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search... (⌘K)"
          className="w-full h-7 rounded-md border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-8 pr-3 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-teal-500/30"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </div>

      {/* Bell */}
      <button className="relative p-1.5 rounded-md text-slate-400 hover:text-white transition-colors">
        <Bell size={16} />
        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" />
      </button>

      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center">
        <User size={14} className="text-teal-400" />
      </div>
    </div>
  )
}
