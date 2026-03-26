'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Target,
  Calendar,
  Bot,
  Settings,
} from 'lucide-react'

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

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-stretch border-t border-[rgba(148,163,184,0.1)] bg-[#111827] pb-safe"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const active = isActive(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
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
            </div>
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
