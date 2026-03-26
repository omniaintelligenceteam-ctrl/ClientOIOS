'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Target,
  Calendar,
  Bot,
  Settings,
  HardHat,
} from 'lucide-react'
import { useFieldMode } from './field-mode/field-mode-toggle'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface BadgeDotProps {
  count?: number
  color?: string
}

function BadgeDot({ count, color = 'bg-red-500' }: BadgeDotProps) {
  if (!count) return null
  return (
    <span
      className={`absolute -top-0.5 -right-1 flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full text-[9px] font-bold text-white leading-none ${color}`}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Nav config                                                          */
/* ------------------------------------------------------------------ */

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Leads', href: '/dashboard/leads', icon: Target },
  { label: 'Calendar', href: '/dashboard/schedule', icon: Calendar },
  { label: 'AI', href: '/dashboard/ai', icon: Bot },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname.startsWith(href)
}

/* ------------------------------------------------------------------ */
/* Badge counts — wire up to real data as needed                      */
/* ------------------------------------------------------------------ */

interface NavBadges {
  leads?: number
  calls?: number
  schedule?: number
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface BottomNavProps {
  badges?: NavBadges
  onFieldModeClick?: () => void
}

export function BottomNav({ badges = {}, onFieldModeClick }: BottomNavProps) {
  const pathname = usePathname()
  const [fieldMode] = useFieldMode()

  const badgeMap: Record<string, number | undefined> = {
    '/dashboard/leads': badges.leads,
    '/dashboard/calls': badges.calls,
    '/dashboard/schedule': badges.schedule,
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-stretch border-t border-[rgba(148,163,184,0.1)] bg-[#0B1120]/95 backdrop-blur-md pb-safe"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const active = isActive(pathname, item.href)
        const badgeCount = badgeMap[item.href]

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] min-w-[44px] transition-colors ${
              active
                ? 'text-[#2DD4BF]'
                : 'text-[#64748B] hover:text-[#94A3B8]'
            }`}
          >
            <div className="relative">
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {active && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#2DD4BF] shadow-[0_0_6px_#2DD4BF]" />
              )}
              <BadgeDot count={badgeCount} />
            </div>
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </Link>
        )
      })}

      {/* Field Mode button — prominent, centered above */}
      <button
        type="button"
        onClick={onFieldModeClick}
        aria-label={fieldMode ? 'Exit Field Mode' : 'Enter Field Mode'}
        className={`absolute -top-5 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-0.5 h-12 w-12 rounded-full border-2 shadow-lg transition-all ${
          fieldMode
            ? 'bg-[#2DD4BF] border-[#2DD4BF] text-black shadow-[0_0_16px_rgba(45,212,191,0.5)]'
            : 'bg-[#0B1120] border-[rgba(148,163,184,0.2)] text-[#64748B] hover:border-[#2DD4BF]/50 hover:text-[#2DD4BF]'
        }`}
      >
        <HardHat size={18} strokeWidth={fieldMode ? 2.5 : 2} />
      </button>
    </nav>
  )
}
