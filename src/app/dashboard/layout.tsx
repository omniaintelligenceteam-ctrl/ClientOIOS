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
  Sparkles,
  ArrowRight,
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
import { ToastProvider } from '@/components/ui/toast'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { ShortcutsHelp } from '@/components/dashboard/shortcuts-help'
import { ThemeProvider } from '@/lib/theme-context'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OrgTier = 'answering_service' | 'receptionist' | 'office_manager' | 'coo' | 'ai_coo' | 'growth_engine'

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
  receptionist: 1,
  office_manager: 2,
  coo: 3,
  ai_coo: 3,
  growth_engine: 3,
}

const TIER_LABELS: Record<OrgTier, string> = {
  answering_service: 'Tier 1',
  receptionist: 'Tier 1',
  office_manager: 'Tier 2',
  coo: 'Tier 3',
  ai_coo: 'Tier 3',
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
/*  Focus Rail                                                         */
/* ------------------------------------------------------------------ */

function FocusRail({
  pathname,
  currentTier,
  onNewLead,
  onLogCall,
  onBookJob,
}: {
  pathname: string
  currentTier: OrgTier
  onNewLead: () => void
  onLogCall: () => void
  onBookJob: () => void
}) {
  const contextLabel = pathname.startsWith('/dashboard/invoicing')
    ? 'Collections Focus'
    : pathname.startsWith('/dashboard/schedule')
      ? 'Today Execution'
      : pathname.startsWith('/dashboard/leads')
        ? 'Pipeline Focus'
        : pathname.startsWith('/dashboard/reports')
          ? 'Performance Focus'
          : 'Growth Focus'

  const quickActions = [
    { label: 'New Lead', onClick: onNewLead },
    { label: 'Log Call', onClick: onLogCall },
    { label: 'Book Job', onClick: onBookJob },
  ]

  const shortcuts = [
    { keys: 'Ctrl + K', label: 'Command Palette' },
    { keys: 'N', label: 'New Lead' },
    { keys: 'L', label: 'Log Call' },
    { keys: '?', label: 'Shortcuts Help' },
  ]

  return (
    <aside className="hidden xl:flex xl:min-h-0 xl:w-72 xl:flex-col xl:gap-4 xl:overflow-y-auto xl:border-l xl:border-[rgba(147,162,190,0.18)] xl:bg-[rgba(11,18,31,0.56)] xl:p-4 xl:backdrop-blur-xl">
      <section className="premium-card p-4">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f7b267]">
          <Sparkles size={13} />
          Executive Pulse
        </div>
        <p className="text-sm font-semibold text-[#ecf3ff]">{contextLabel}</p>
        <p className="mt-2 text-xs leading-relaxed text-[#a6b4cf]">
          {TIER_LABELS[currentTier]} workspace is active. Keep operations moving with direct actions and keyboard speed paths.
        </p>
      </section>

      <section className="premium-card p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#6f7f9d]">
          Fast Actions
        </h3>
        <div className="space-y-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="flex w-full items-center justify-between rounded-xl border border-[rgba(147,162,190,0.2)] bg-[rgba(12,20,35,0.8)] px-3 py-2 text-sm font-medium text-[#d8e4fb] transition-all hover:border-[rgba(23,207,178,0.38)] hover:text-[#ecf3ff]"
            >
              {action.label}
              <ArrowRight size={14} className="text-[#17cfb2]" />
            </button>
          ))}
        </div>
      </section>

      <section className="premium-card p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#6f7f9d]">
          Keyboard
        </h3>
        <div className="space-y-2">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.keys} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-2">
              <span className="text-xs text-[#a6b4cf]">{shortcut.label}</span>
              <kbd className="rounded-md border border-[rgba(147,162,190,0.32)] bg-[rgba(8,15,27,0.8)] px-2 py-0.5 font-mono text-[11px] text-[#e9f4ff]">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
      </section>
    </aside>
  )
}

/* ------------------------------------------------------------------ */
/*  Dashboard Layout                                                   */
/* ------------------------------------------------------------------ */

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <ChatProvider>
            <DashboardShell>{children}</DashboardShell>
          </ChatProvider>
        </ToastProvider>
      </ThemeProvider>
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
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
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

  const openCommandPalette = useCallback(() => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new Event('oios:command-palette-open'))
  }, [])

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

  useKeyboardShortcuts({
    onNewLead: () => setNewLeadOpen(true),
    onLogCall: () => setLogCallOpen(true),
    onSchedule: () => router.push('/dashboard/schedule'),
    onFocusSearch: openCommandPalette,
    onShowHelp: () => setShortcutsOpen(true),
  })

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

  /* Route-level guard for tier-locked pages */
  useEffect(() => {
    if (isLoading) return
    if (!pathname.startsWith('/dashboard')) return
    if (pathname.startsWith('/dashboard/onboarding') || pathname.startsWith('/dashboard/admin')) return

    const matchedItem = NAV_ITEMS
      .slice()
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => isActiveLink(pathname, item.href))

    if (!matchedItem) return

    const lockedByTier = !isTierUnlocked(matchedItem.minTier, CURRENT_TIER)
    const lockedByAdmin = Boolean(matchedItem.superAdminOnly && !isSuperAdmin)

    if (lockedByTier || lockedByAdmin) {
      router.replace('/dashboard/billing')
    }
  }, [isLoading, pathname, CURRENT_TIER, isSuperAdmin, router])

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
    <div className="premium-shell flex h-screen overflow-hidden">
      {/* Modals */}
      <NewLeadModal open={newLeadOpen} onClose={() => setNewLeadOpen(false)} />
      <LogCallModal open={logCallOpen} onClose={() => setLogCallOpen(false)} />
      <BookJobModal open={bookJobOpen} onClose={() => setBookJobOpen(false)} />

      {/* ============================================================ */}
      {/*  Desktop Sidebar                                              */}
      {/* ============================================================ */}
      <aside
        className="premium-sidebar hidden md:flex flex-col transition-[width] duration-300 ease-in-out"
        style={{ width: sidebarWidth, minWidth: sidebarWidth }}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center border-b border-[rgba(147,162,190,0.18)] px-4">
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
        <div className="border-t border-[rgba(147,162,190,0.18)]">
          <QuickActions
            collapsed={sidebarCollapsed}
            onNewLead={() => setNewLeadOpen(true)}
            onLogCall={() => setLogCallOpen(true)}
            onBookJob={() => setBookJobOpen(true)}
          />
        </div>

        {/* User section */}
        <div className="border-t border-[rgba(147,162,190,0.18)] p-3">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#17cfb2]/20 text-sm font-bold text-[#17cfb2]">
              {userInitials}
            </div>

            {!sidebarCollapsed && (
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-sm font-semibold text-[#ecf3ff]">{userName}</span>
                <span className="truncate text-xs text-[#6f7f9d] capitalize">{userRole}</span>
              </div>
            )}

            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={signOut}
                className="flex-shrink-0 rounded-md p-1.5 text-[#6f7f9d] transition-colors hover:bg-white/[0.08] hover:text-[#ecf3ff]"
                title="Log out"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <div className="border-t border-[rgba(147,162,190,0.18)] p-2">
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center rounded-md p-2 text-[#6f7f9d] transition-colors hover:bg-white/[0.08] hover:text-[#ecf3ff]"
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
        className={`premium-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile header */}
        <div className="flex h-16 items-center justify-between border-b border-[rgba(147,162,190,0.18)] px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="gradient-text text-2xl font-extrabold tracking-tight">OIOS</span>
          </Link>
          <button
            type="button"
            onClick={toggleMobileMenu}
            className="rounded-md p-1.5 text-[#a6b4cf] transition-colors hover:bg-white/[0.08] hover:text-[#ecf3ff]"
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
        <div className="border-t border-[rgba(147,162,190,0.18)]">
          <QuickActions
            collapsed={false}
            onNewLead={() => { setMobileMenuOpen(false); setNewLeadOpen(true) }}
            onLogCall={() => { setMobileMenuOpen(false); setLogCallOpen(true) }}
            onBookJob={() => { setMobileMenuOpen(false); setBookJobOpen(true) }}
          />
        </div>

        {/* User section */}
        <div className="border-t border-[rgba(147,162,190,0.18)] p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#17cfb2]/20 text-sm font-bold text-[#17cfb2]">
              {userInitials}
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-semibold text-[#ecf3ff]">{userName}</span>
              <span className="truncate text-xs text-[#6f7f9d] capitalize">{userRole}</span>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="flex-shrink-0 rounded-md p-1.5 text-[#6f7f9d] transition-colors hover:bg-white/[0.08] hover:text-[#ecf3ff]"
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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="premium-header hidden h-16 flex-shrink-0 items-center gap-3 px-4 sm:gap-4 sm:px-6 md:flex">
          <button
            type="button"
            onClick={toggleMobileMenu}
            className="rounded-md p-1.5 text-[#a6b4cf] transition-colors hover:bg-white/[0.08] hover:text-[#ecf3ff] md:hidden"
            aria-label="Open navigation"
          >
            <Menu size={22} />
          </button>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7f9d]"
            />
            <input
              type="text"
              readOnly
              onFocus={openCommandPalette}
              onClick={openCommandPalette}
              placeholder="Search or press Ctrl+K..."
              aria-label="Open command palette"
              className="premium-input h-9 w-full rounded-lg border border-[rgba(147,162,190,0.22)] bg-[rgba(8,15,27,0.82)] pl-9 pr-3 text-sm text-[#ecf3ff] placeholder-[#6f7f9d] outline-none transition-colors focus:border-[rgba(23,207,178,0.45)] focus:ring-1 focus:ring-[rgba(23,207,178,0.28)]"
            />
          </div>

          <div className="hidden lg:flex items-center gap-2 rounded-full border border-[rgba(147,162,190,0.2)] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-[#f7b267]">
            <Sparkles size={12} />
            {pathname.startsWith('/dashboard/leads') ? 'Pipeline Acceleration' : pathname.startsWith('/dashboard/schedule') ? 'Field Execution' : pathname.startsWith('/dashboard/invoicing') ? 'Collections Control' : 'Executive View'}
          </div>

          <div className="flex-1" />

          <NotificationCenter
            organizationId={organization?.id || ''}
            userId={profile?.id || ''}
          />

          <button
            type="button"
            onClick={() => setNewLeadOpen(true)}
            className="premium-button flex h-9 w-9 items-center justify-center rounded-lg"
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

        <div className={`premium-main min-h-0 flex-1 overflow-hidden ${fieldMode ? '' : 'xl:grid xl:grid-cols-[minmax(0,1fr)_18rem] xl:grid-rows-[minmax(0,1fr)]'}`}>
          <main className={`min-h-0 flex-1 overflow-y-auto p-4 pb-24 sm:px-6 sm:pb-0 ${fieldMode ? 'hidden md:block' : ''}`}>
            <div className="mb-4 mt-1">
              <Breadcrumbs />
            </div>
            {children}
          </main>
          {!fieldMode && (
            <FocusRail
              pathname={pathname}
              currentTier={CURRENT_TIER}
              onNewLead={() => setNewLeadOpen(true)}
              onLogCall={() => setLogCallOpen(true)}
              onBookJob={() => setBookJobOpen(true)}
            />
          )}
        </div>

        <BottomNav onFieldModeClick={() => setFieldMode(!fieldMode)} />
        <ChatFAB />
        <AmbientParticles />
        <CommandPalette />
        {shortcutsOpen && <ShortcutsHelp onClose={() => setShortcutsOpen(false)} />}
      </div>
    </div>
  )
}

