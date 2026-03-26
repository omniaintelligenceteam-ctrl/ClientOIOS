'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  calls: 'Calls',
  leads: 'Leads',
  pipeline: 'Pipeline',
  schedule: 'Schedule',
  calendar: 'Calendar',
  customers: 'Customers',
  invoicing: 'Invoicing',
  reviews: 'Reviews',
  marketing: 'Marketing',
  campaigns: 'Campaigns',
  team: 'Team',
  ai: 'AI Assistant',
  analytics: 'Analytics',
  reports: 'Reports',
  billing: 'Billing',
  settings: 'Settings',
  admin: 'Admin',
  chat: 'Chat',
}

interface Crumb {
  label: string
  href: string
}

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: Crumb[] = []
  let path = ''
  for (const seg of segments) {
    path += `/${seg}`
    const label = ROUTE_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')
    crumbs.push({ label, href: path })
  }
  return crumbs
}

export function Breadcrumbs() {
  const pathname = usePathname()

  // Only show on sub-pages (not the root /dashboard)
  if (pathname === '/dashboard') return null

  const crumbs = buildCrumbs(pathname)
  if (crumbs.length <= 1) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex items-center gap-1 text-xs text-[#64748B]"
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-1 transition-colors hover:text-[#2DD4BF]"
      >
        <Home size={13} />
      </Link>

      {crumbs.slice(1).map((crumb, idx) => {
        const isLast = idx === crumbs.length - 2
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            <ChevronRight size={13} className="text-[#374151]" />
            {isLast ? (
              <span className="font-medium text-[#94A3B8]">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="transition-colors hover:text-[#2DD4BF]"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
