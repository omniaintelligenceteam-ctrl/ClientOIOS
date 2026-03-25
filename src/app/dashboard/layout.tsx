'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import {
  LayoutDashboard,
  Phone,
  Target,
  Calendar,
  Users,
  Receipt,
  Star,
  Megaphone,
  HardHat,
  BarChart3,
  CreditCard,
  Settings,
  Shield,
  Search,
  Plus,
  Lock,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  MessageSquare,
} from 'lucide-react'
import { ChatProvider } from '@/components/dashboard/chat/chat-provider'
import { ChatFAB } from '@/components/dashboard/chat/chat-fab'
import { NotificationCenter } from '@/components/dashboard/notification-center'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OrgTier = 'answering_service' | 'office_manager' | 'growth_engine'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  /** Minimum tier required. undefined = available at all tiers. */
  minTier?: OrgTier
  /** If true, only visible to super admins. */
  superAdminOnly?: boolean
}

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

/** Tier hierarchy – higher index = higher tier */
const TIER_RANK: Record<OrgTier, number> = {
  answering_service: 1,
  office_manager: 2,
  growth_engine: 3,
}

const TIER_LABELS: Record<OrgTier, string> = {
  answering_service: 'Tier 1',
  office_manager: 'Tier 2',
  growth_engine: 'Tier 3',
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Calls', href: '/dashboard/calls', icon: Phone },
  { label: 'Leads', href: '/dashboard/leads', icon: Target, minTier: 'office_manager' },
  { label: 'Schedule', href: '/dashboard/schedule', icon: Calendar, minTier: 'office_manager' },
  { label: 'Customers', href: '/dashboard/customers', icon: Users, minTier: 'office_manager' },
  { label: 'Invoicing', href: '/dashboard/invoicing', icon: Receipt, minTier: 'growth_engine' },
  { label: 'Reviews', href: '/dashboard/reviews', icon: Star, minTier: 'office_manager' },
  { label: 'Marketing', href: '/dashboard/marketing', icon: Megaphone, minTier: 'growth_engine' },
  { label: 'Team', href: '/dashboard/team', icon: HardHat, minTier: 'growth_engine' },
  { label: 'Chat', href: '/dashboard/chat', icon: MessageSquare, minTier: 'office_manager' },
  { label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  { label: 'Admin', href: '/dashboard/admin', icon: Shield, superAdminOnly: true },
]

// Tier is loaded from auth context in DashboardShell

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isTierUnlocked(requiredTier: OrgTier | undefined, currentTier: OrgTier): boolean {
  if (!requiredTier) return true
  return TIER_RANK[currentTier] >= TIER_RANK[requiredTier]
}

function isActiveLink(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname.startsWith(href)
}

/* ------------------------------------------------------------------ */
/*  Sidebar Nav Item                                                   */
/* ------------------------------------------------------------------ */

function SidebarNavItem({
  item,
  isActive,
  isCollapsed,
  isLocked,
}: {
  item: NavItem
  isActive: boolean
  isCollapsed: boolean
  isLocked: boolean
}) {
  const Icon = item.icon
  const requiredLabel = item.minTier ? TIER_LABELS[item.minTier] : ''

  const baseClasses =
    'group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200'
  const paddingClasses = isCollapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'

  if (isLocked) {
    return (
      <div
        className={`${baseClasses} ${paddingClasses} cursor-not-allowed text-[#64748B] opacity-60`}
        title={isCollapsed ? `${item.label} – Upgrade to ${requiredLabel}` : undefined}
      >
        <div className="relative flex-shrink-0">
          <Icon size={20} />
          <Lock
            size={10}
            className="absolute -right-1 -top-1 text-[#f97316]"
          />
        </div>
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            <span className="rounded bg-[#f97316]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#f97316]">
              Upgrade
            </span>
          </>
        )}

        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-[#1E293B] px-3 py-2 text-xs shadow-lg shadow-black/40 group-hover:block">
            <span className="text-[#F8FAFC]">{item.label}</span>
            <span className="ml-2 text-[#f97316]">Upgrade to {requiredLabel}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      className={`${baseClasses} ${paddingClasses} ${
        isActive
          ? 'bg-[#2DD4BF]/10 text-[#2DD4BF]'
          : 'text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#F8FAFC]'
      }`}
      title={isCollapsed ? item.label : undefined}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute inset-y-1 left-0 w-[3px] rounded-r-full bg-[#2DD4BF]" />
      )}

      <Icon size={20} className="flex-shrink-0" />

      {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}

      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-[#1E293B] px-3 py-2 text-xs font-medium text-[#F8FAFC] shadow-lg shadow-black/40 group-hover:block">
          {item.label}
        </div>
      )}
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Dashboard Layout                                                   */
/* ------------------------------------------------------------------ */

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ChatProvider>
        <DashboardShell>{children}</DashboardShell>
      </ChatProvider>
    </AuthProvider>
  )
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { profile, organization, isSuperAdmin, signOut } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  const CURRENT_TIER: OrgTier = (organization?.tier as OrgTier) || 'office_manager'
  const userName = profile?.full_name || 'User'
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const userRole = profile?.role || 'viewer'

  /* Close mobile menu on route change */
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  /* Close mobile menu when clicking outside */
  useEffect(() => {
    if (!mobileMenuOpen) return
    function handleClick(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [mobileMenuOpen])

  /* Close mobile menu on Escape */
  useEffect(() => {
    if (!mobileMenuOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [mobileMenuOpen])

  const toggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), [])
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((o) => !o), [])

  const sidebarWidth = sidebarCollapsed ? 72 : 256

  /* ---- Shared nav list renderer ---- */
  const renderNavItems = (collapsed: boolean) =>
    NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin).map((item) => {
      const unlocked = isTierUnlocked(item.minTier, CURRENT_TIER)
      const active = isActiveLink(pathname, item.href)

      return (
        <SidebarNavItem
          key={item.href}
          item={item}
          isActive={active}
          isCollapsed={collapsed}
          isLocked={!unlocked}
        />
      )
    })

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B1120]">
      {/* ============================================================ */}
      {/*  Desktop Sidebar                                              */}
      {/* ============================================================ */}
      <aside
        className="hidden md:flex flex-col border-r border-[rgba(148,163,184,0.1)] bg-[#111827] transition-[width] duration-300 ease-in-out"
        style={{ width: sidebarWidth, minWidth: sidebarWidth }}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center border-b border-[rgba(148,163,184,0.1)] px-4">
          <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
            <span className="gradient-text text-2xl font-extrabold tracking-tight">
              {sidebarCollapsed ? 'O' : 'OIOS'}
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="flex flex-col gap-1">{renderNavItems(sidebarCollapsed)}</div>
        </nav>

        {/* User section */}
        <div className="border-t border-[rgba(148,163,184,0.1)] p-3">
          <div
            className={`flex items-center ${
              sidebarCollapsed ? 'justify-center' : 'gap-3'
            }`}
          >
            {/* Avatar placeholder */}
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#2DD4BF]/20 text-sm font-bold text-[#2DD4BF]">
              {userInitials}
            </div>

            {!sidebarCollapsed && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-sm font-semibold text-[#F8FAFC]">
                  {userName}
                </span>
                <span className="truncate text-xs text-[#64748B] capitalize">{userRole}</span>
              </div>
            )}

            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={signOut}
                className="flex-shrink-0 rounded-md p-1.5 text-[#64748B] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
                title="Log out"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <div className="border-t border-[rgba(148,163,184,0.1)] p-2">
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center rounded-md p-2 text-[#64748B] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              size={18}
              className={`transition-transform duration-300 ${
                sidebarCollapsed ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/*  Mobile Sidebar Overlay                                       */}
      {/* ============================================================ */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" aria-hidden="true" />
      )}

      <aside
        ref={mobileMenuRef}
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[rgba(148,163,184,0.1)] bg-[#111827] transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile header */}
        <div className="flex h-16 items-center justify-between border-b border-[rgba(148,163,184,0.1)] px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="gradient-text text-2xl font-extrabold tracking-tight">OIOS</span>
          </Link>
          <button
            type="button"
            onClick={toggleMobileMenu}
            className="rounded-md p-1.5 text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="flex flex-col gap-1">{renderNavItems(false)}</div>
        </nav>

        {/* User section */}
        <div className="border-t border-[rgba(148,163,184,0.1)] p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#2DD4BF]/20 text-sm font-bold text-[#2DD4BF]">
              {userInitials}
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-semibold text-[#F8FAFC]">
                Mike Rodriguez
              </span>
              <span className="truncate text-xs text-[#64748B] capitalize">{userRole}</span>
            </div>
            <button
              type="button"
              className="flex-shrink-0 rounded-md p-1.5 text-[#64748B] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/*  Main column (top bar + content)                              */}
      {/* ============================================================ */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-[rgba(148,163,184,0.1)] bg-[#111827]/80 px-4 backdrop-blur-sm sm:gap-4 sm:px-6">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={toggleMobileMenu}
            className="rounded-md p-1.5 text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC] md:hidden"
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
            />
            <input
              type="text"
              placeholder="Search calls, leads, customers..."
              className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-9 pr-3 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Notification center */}
          <NotificationCenter
            organizationId={organization?.id || ''}
            userId={profile?.id || ''}
          />

          {/* Quick action */}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2DD4BF] text-[#0B1120] shadow-lg shadow-[#2DD4BF]/20 transition-all hover:bg-[#5EEAD4] hover:shadow-[#2DD4BF]/30 active:scale-95"
            aria-label="Quick action"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>

        {/* Chat FAB — floating on all pages */}
        <ChatFAB />
      </div>
    </div>
  )
}
