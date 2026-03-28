'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import {
  LayoutDashboard,
  Phone,
  Target,
  Calendar,
  CalendarDays,
  Users,
  Receipt,
  Star,
  Megaphone,
  HardHat,
  BarChart3,
  TrendingUp,
  CreditCard,
  Settings,
  Shield,
  Search,
  Plus,
  Lock,
  LogOut,
  ChevronLeft,
  ChevronDown,
  Menu,
  X,
  Bot,
  GitFork,
  UserPlus,
  Activity,
  Zap,
  MapPin,
} from 'lucide-react'
import { ChatProvider } from '@/components/dashboard/chat/chat-provider'
import { MobileHeader } from '@/components/dashboard/mobile-header'
import { BottomNav } from '@/components/dashboard/bottom-nav'
import { ChatFAB } from '@/components/dashboard/chat/chat-fab'
import { NotificationCenter } from '@/components/dashboard/notification-center'
import { AmbientParticles } from '@/components/dashboard/ambient-particles'
import { CommandPalette } from '@/components/dashboard/command-palette'
import { useSidebarBadges } from '@/hooks/useSidebarBadges'
import { NewLeadModal } from '@/components/dashboard/modals/new-lead-modal'
import { LogCallModal } from '@/components/dashboard/modals/log-call-modal'
import { BookJobModal } from '@/components/dashboard/modals/book-job-modal'
import { Breadcrumbs } from '@/components/dashboard/breadcrumbs'
import { DemoBanner } from '@/components/dashboard/demo-banner'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useFieldMode } from '@/components/dashboard/field-mode/field-mode-toggle'
import { FieldModeView } from '@/components/dashboard/field-mode/field-mode-view'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OrgTier = 'answering_service' | 'office_manager' | 'growth_engine'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  minTier?: OrgTier
  superAdminOnly?: boolean
}

interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

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

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'overview',
    label: 'OVERVIEW',
    items: [
      { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    id: 'sales',
    label: 'SALES',
    items: [
      { label: 'Leads', href: '/dashboard/leads', icon: Target, minTier: 'office_manager' },
      { label: 'Pipeline', href: '/dashboard/pipeline', icon: GitFork, minTier: 'office_manager' },
      { label: 'Customers', href: '/dashboard/customers', icon: Users, minTier: 'office_manager' },
    ],
  },
  {
    id: 'operations',
    label: 'OPERATIONS',
    items: [
      { label: 'Calls', href: '/dashboard/calls', icon: Phone },
      { label: 'Schedule', href: '/dashboard/schedule', icon: Calendar, minTier: 'office_manager' },
      { label: 'Calendar', href: '/dashboard/calendar', icon: CalendarDays, minTier: 'office_manager' },
      { label: 'Invoicing', href: '/dashboard/invoicing', icon: Receipt, minTier: 'growth_engine' },
      { label: 'Map', href: '/dashboard/map', icon: MapPin, minTier: 'office_manager' },
    ],
  },
  {
    id: 'engagement',
    label: 'ENGAGEMENT',
    items: [
      { label: 'Reviews', href: '/dashboard/reviews', icon: Star, minTier: 'office_manager' },
      { label: 'Marketing', href: '/dashboard/marketing', icon: Megaphone, minTier: 'growth_engine' },
      { label: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone, minTier: 'growth_engine' },
    ],
  },
  {
    id: 'intelligence',
    label: 'INTELLIGENCE',
    items: [
      { label: 'AI Assistant', href: '/dashboard/ai', icon: Bot, minTier: 'office_manager' },
      { label: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp, minTier: 'office_manager' },
      { label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
      { label: 'Automations', href: '/dashboard/automations', icon: Zap },
      { label: 'Activity', href: '/dashboard/activity', icon: Activity },
    ],
  },
  {
    id: 'account',
    label: 'ACCOUNT',
    items: [
      { label: 'Team', href: '/dashboard/team', icon: HardHat, minTier: 'growth_engine' },
      { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
      { label: 'Admin', href: '/dashboard/admin', icon: Shield, superAdminOnly: true },
    ],
  },
]

// Flat list for other uses (e.g. mobile nav)
const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items)

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

const SECTION_STORAGE_KEY = 'oios-sidebar-sections-collapsed'

function loadCollapsedSections(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(SECTION_STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function saveCollapsedSections(set: Set<string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify([...set]))
}

/* ------------------------------------------------------------------ */
/*  Sidebar Nav Item                                                   */
/* ------------------------------------------------------------------ */

function SidebarNavItem({
  item,
  isActive,
  isCollapsed,
  isLocked,
  badgeCount,
  isUrgent,
}: {
  item: NavItem
  isActive: boolean
  isCollapsed: boolean
  isLocked: boolean
  badgeCount?: number
  isUrgent?: boolean
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
          <Lock size={10} className="absolute -right-1 -top-1 text-[#f97316]" />
        </div>
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            <span className="rounded bg-[#f97316]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#f97316]">
              Upgrade
            </span>
          </>
        )}
        {isCollapsed && (
          <div className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-[#1E293B] px-3 py-2 text-xs shadow-lg shadow-black/40 group-hover:block">
            <span className="text-[#F8FAFC]">{item.label}</span>
            <span className="ml-2 text-[#f97316]">Upgrade to {requiredLabel}</span>
          </div>
        )}
      </div>
    )
  }

  const showBadge = (badgeCount ?? 0) > 0

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

      {/* Icon + urgent dot */}
      <div className="relative flex-shrink-0">
        <Icon size={20} />
        {isUrgent && isCollapsed && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 ring-1 ring-[#111827]" />
        )}
      </div>

      {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}

      {/* Badge pill (expanded) */}
      {!isCollapsed && showBadge && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
            isUrgent
              ? 'bg-red-500/20 text-red-400'
              : 'bg-[#2DD4BF]/15 text-[#2DD4BF]'
          }`}
        >
          {badgeCount! > 99 ? '99+' : badgeCount}
        </span>
      )}

      {/* Tooltip (collapsed) */}
      {isCollapsed && (
        <div className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-[#1E293B] px-3 py-2 text-xs font-medium text-[#F8FAFC] shadow-lg shadow-black/40 group-hover:block">
          {item.label}
          {showBadge && (
            <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isUrgent ? 'bg-red-500 text-white' : 'bg-[#2DD4BF] text-[#0B1120]'}`}>
              {badgeCount}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  AI Status Indicator                                                */
/* ------------------------------------------------------------------ */

function AIStatusIndicator({ collapsed, organizationId }: { collapsed: boolean; organizationId: string }) {
  const [callsToday, setCallsToday] = useState(0)

  useEffect(() => {
    if (!organizationId) return
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    async function fetch() {
      const { count } = await supabase
        .from('calls')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('ai_agent_handled', true)
        .gte('started_at', todayStart.toISOString())
      setCallsToday(count ?? 0)
    }

    fetch()

    const channel = supabase
      .channel(`ai-status:${organizationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls', filter: `organization_id=eq.${organizationId}` },
        () => fetch()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [organizationId])

  if (collapsed) {
    return (
      <div className="group relative flex justify-center py-2">
        <div className="relative">
          <Bot size={18} className="text-emerald-400" />
          <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        </div>
        <div className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-[#1E293B] px-3 py-2 text-xs font-medium text-[#F8FAFC] shadow-lg shadow-black/40 group-hover:block">
          AI Active · {callsToday} calls today
        </div>
      </div>
    )
  }

  return (
    <div className="mx-1 mb-2 flex items-center gap-2 rounded-lg bg-emerald-400/5 border border-emerald-400/10 px-3 py-2">
      <div className="relative flex-shrink-0">
        <Bot size={16} className="text-emerald-400" />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[11px] font-semibold text-emerald-400 leading-none">AI Active</span>
        <span className="text-[10px] text-[#64748B] leading-none">{callsToday} calls today</span>
      </div>
      <Zap size={12} className="text-emerald-400/50" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Quick Actions                                                      */
/* ------------------------------------------------------------------ */

function QuickActions({
  collapsed,
  onNewLead,
  onLogCall,
  onBookJob,
}: {
  collapsed: boolean
  onNewLead: () => void
  onLogCall: () => void
  onBookJob: () => void
}) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 px-1 py-2">
        <button
          type="button"
          onClick={onNewLead}
          title="New Lead"
          className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#2DD4BF]/10 hover:text-[#2DD4BF]"
        >
          <UserPlus size={18} />
          <div className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-[#1E293B] px-2 py-1.5 text-xs font-medium text-[#F8FAFC] shadow-lg group-hover:block">
            New Lead
          </div>
        </button>
        <button
          type="button"
          onClick={onLogCall}
          title="Log Call"
          className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#2DD4BF]/10 hover:text-[#2DD4BF]"
        >
          <Phone size={18} />
          <div className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-[#1E293B] px-2 py-1.5 text-xs font-medium text-[#F8FAFC] shadow-lg group-hover:block">
            Log Call
          </div>
        </button>
        <button
          type="button"
          onClick={onBookJob}
          title="Book Job"
          className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-[#64748B] transition-colors hover:bg-[#2DD4BF]/10 hover:text-[#2DD4BF]"
        >
          <CalendarDays size={18} />
          <div className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-[#1E293B] px-2 py-1.5 text-xs font-medium text-[#F8FAFC] shadow-lg group-hover:block">
            Book Job
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="px-3 py-2 flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#64748B] mb-1">
        Quick Actions
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onNewLead}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#2DD4BF]/10 py-2 text-[11px] font-semibold text-[#2DD4BF] transition-all hover:bg-[#2DD4BF]/20 active:scale-95"
        >
          <UserPlus size={13} />
          New Lead
        </button>
        <button
          type="button"
          onClick={onLogCall}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/[0.04] py-2 text-[11px] font-semibold text-[#94A3B8] transition-all hover:bg-white/[0.08] hover:text-[#F8FAFC] active:scale-95"
        >
          <Phone size={13} />
          Log Call
        </button>
        <button
          type="button"
          onClick={onBookJob}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/[0.04] py-2 text-[11px] font-semibold text-[#94A3B8] transition-all hover:bg-white/[0.08] hover:text-[#F8FAFC] active:scale-95"
        >
          <CalendarDays size={13} />
          Book Job
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Grouped Nav Sections                                               */
/* ------------------------------------------------------------------ */

function NavSections({
  collapsed,
  pathname,
  currentTier,
  isSuperAdmin,
  badges,
  collapsedSections,
  onToggleSection,
}: {
  collapsed: boolean
  pathname: string
  currentTier: OrgTier
  isSuperAdmin: boolean
  badges: ReturnType<typeof useSidebarBadges>
  collapsedSections: Set<string>
  onToggleSection: (id: string) => void
}) {
  return (
    <>
      {NAV_SECTIONS.map((section) => {
        // Filter items for this section
        const visibleItems = section.items.filter(
          (item) => !item.superAdminOnly || isSuperAdmin
        )
        if (visibleItems.length === 0) return null

        const isSectionCollapsed = collapsedSections.has(section.id)

        return (
          <div key={section.id} className="mb-1">
            {/* Section header — hidden when sidebar is icon-only */}
            {!collapsed && (
              <button
                type="button"
                onClick={() => onToggleSection(section.id)}
                className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#64748B] transition-colors hover:text-[#94A3B8]"
              >
                <span>{section.label}</span>
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-200 ${isSectionCollapsed ? '-rotate-90' : ''}`}
                />
              </button>
            )}

            {/* Items */}
            {(!isSectionCollapsed || collapsed) && (
              <div className="flex flex-col gap-0.5">
                {visibleItems.map((item) => {
                  const unlocked = isTierUnlocked(item.minTier, currentTier)
                  const active = isActiveLink(pathname, item.href)
                  const badgeCount = badges.counts[item.href]
                  const isUrgent = badges.urgent[item.href] ?? false

                  return (
                    <SidebarNavItem
                      key={item.href}
                      item={item}
                      isActive={active}
                      isCollapsed={collapsed}
                      isLocked={!unlocked}
                      badgeCount={badgeCount}
                      isUrgent={isUrgent}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </>
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
  const router = useRouter()
  const { profile, organization, isLoading, isSuperAdmin, isDemoMode, signOut } = useAuth()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Modals
  const [newLeadOpen, setNewLeadOpen] = useState(false)
  const [logCallOpen, setLogCallOpen] = useState(false)
  const [bookJobOpen, setBookJobOpen] = useState(false)
  const [fieldMode, setFieldMode] = useFieldMode()

  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // Load localStorage after mount
  useEffect(() => {
    setCollapsedSections(loadCollapsedSections())
  }, [])

  const CURRENT_TIER: OrgTier = isDemoMode ? 'growth_engine' : ((organization?.tier as OrgTier) || 'office_manager')
  const userName = profile?.full_name || 'User'
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
  const userRole = profile?.role || 'viewer'

  const badges = useSidebarBadges()

  const toggleSection = useCallback((id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      saveCollapsedSections(next)
      return next
    })
  }, [])

  /* Close mobile menu on route change */
  useEffect(() => { setMobileMenuOpen(false) }, [pathname])

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

  /* Redirect to onboarding if org is not live */
  useEffect(() => {
    if (!isLoading && organization && organization.onboarding_status && organization.onboarding_status !== 'live') {
      if (!pathname.startsWith('/dashboard/onboarding') && !pathname.startsWith('/dashboard/admin') && !pathname.startsWith('/command-center')) {
        router.push('/dashboard/onboarding')
      }
    }
  }, [isLoading, organization, pathname, router])

  const toggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), [])
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((o) => !o), [])

  const sidebarWidth = sidebarCollapsed ? 72 : 256

  /* ---- Shared nav render ---- */
  function renderGroupedNav(collapsed: boolean) {
    return (
      <NavSections
        collapsed={collapsed}
        pathname={pathname}
        currentTier={CURRENT_TIER}
        isSuperAdmin={isSuperAdmin}
        badges={badges}
        collapsedSections={collapsedSections}
        onToggleSection={toggleSection}
      />
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B1120]">
      {/* Modals */}
      <NewLeadModal open={newLeadOpen} onClose={() => setNewLeadOpen(false)} />
      <LogCallModal open={logCallOpen} onClose={() => setLogCallOpen(false)} />
      <BookJobModal open={bookJobOpen} onClose={() => setBookJobOpen(false)} />

      {/* ============================================================ */}
      {/*  Desktop Sidebar                                              */}
      {/* ============================================================ */}
      <aside
        className="hidden md:flex flex-col glass-sidebar transition-[width] duration-300 ease-in-out"
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
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {renderGroupedNav(sidebarCollapsed)}
        </nav>

        {/* AI Status */}
        <AIStatusIndicator collapsed={sidebarCollapsed} organizationId={organization?.id || ''} />

        {/* Quick Actions */}
        <div className="border-t border-[rgba(148,163,184,0.1)]">
          <QuickActions
            collapsed={sidebarCollapsed}
            onNewLead={() => setNewLeadOpen(true)}
            onLogCall={() => setLogCallOpen(true)}
            onBookJob={() => setBookJobOpen(true)}
          />
        </div>

        {/* User section */}
        <div className="border-t border-[rgba(148,163,184,0.1)] p-3">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#2DD4BF]/20 text-sm font-bold text-[#2DD4BF]">
              {userInitials}
            </div>

            {!sidebarCollapsed && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-sm font-semibold text-[#F8FAFC]">{userName}</span>
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
              className={`transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`}
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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col glass-sidebar transition-transform duration-300 ease-in-out md:hidden ${
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
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {renderGroupedNav(false)}
        </nav>

        {/* AI Status */}
        <AIStatusIndicator collapsed={false} organizationId={organization?.id || ''} />

        {/* Quick Actions */}
        <div className="border-t border-[rgba(148,163,184,0.1)]">
          <QuickActions
            collapsed={false}
            onNewLead={() => { setMobileMenuOpen(false); setNewLeadOpen(true) }}
            onLogCall={() => { setMobileMenuOpen(false); setLogCallOpen(true) }}
            onBookJob={() => { setMobileMenuOpen(false); setBookJobOpen(true) }}
          />
        </div>

        {/* User section */}
        <div className="border-t border-[rgba(148,163,184,0.1)] p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#2DD4BF]/20 text-sm font-bold text-[#2DD4BF]">
              {userInitials}
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-semibold text-[#F8FAFC]">{userName}</span>
              <span className="truncate text-xs text-[#64748B] capitalize">{userRole}</span>
            </div>
            <button
              type="button"
              onClick={signOut}
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
        <header className="hidden md:flex flex-shrink-0 items-center gap-3 h-16 glass-header px-4 sm:gap-4 sm:px-6">
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
              placeholder="Search or press ⌘K..."
              className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-9 pr-3 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
            />
          </div>

          <div className="flex-1" />

          <NotificationCenter
            organizationId={organization?.id || ''}
            userId={profile?.id || ''}
          />

          <button
            type="button"
            onClick={() => setNewLeadOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2DD4BF] text-[#0B1120] shadow-lg shadow-[#2DD4BF]/20 transition-all hover:bg-[#5EEAD4] hover:shadow-[#2DD4BF]/30 active:scale-95"
            aria-label="New Lead"
            title="New Lead"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </header>

        {/* Demo banner */}
        {isDemoMode && <DemoBanner />}

        {/* Page content */}
        <MobileHeader onMenuClick={toggleMobileMenu} onFieldModeToggle={setFieldMode} />

        {/* Field Mode overlay (mobile only) */}
        {fieldMode && (
          <div className="flex md:hidden flex-1 flex-col overflow-hidden">
            <FieldModeView onExit={() => setFieldMode(false)} />
          </div>
        )}

        <main className={`flex-1 overflow-y-auto p-4 pb-24 sm:pb-0 sm:px-6 ${fieldMode ? 'hidden md:block' : ''}`}>
          <Breadcrumbs />
          {children}
        </main>

        <BottomNav onFieldModeClick={() => setFieldMode(!fieldMode)} />
        <ChatFAB />
        <AmbientParticles />
        <CommandPalette />
      </div>
    </div>
  )
}
