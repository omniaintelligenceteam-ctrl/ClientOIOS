'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  Terminal,
  Search,
  ChevronLeft,
  ListTodo,
  Bot,
  Settings,
  ShieldAlert,
  Activity,
  BarChart3,
  Menu,
  X,
  LogOut,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OrgListItem {
  id: string
  name: string
  tier: string
  onboarding_status: string
}

interface OrgWithHealth extends OrgListItem {
  healthScore: number
  activeTaskCount: number
  alertCount: number
  lastHealthCheck: string | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getTierColor(tier: string): string {
  switch (tier) {
    case 'answering_service':
      return 'bg-blue-400'
    case 'receptionist':
      return 'bg-emerald-400'
    case 'office_manager':
      return 'bg-amber-400'
    case 'coo':
    case 'growth_engine':
      return 'bg-purple-400'
    default:
      return 'bg-slate-400'
  }
}

function getHealthColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

function getTierLabel(tier: string): string {
  switch (tier) {
    case 'answering_service':
      return 'T1'
    case 'receptionist':
      return 'T2'
    case 'office_manager':
      return 'T3'
    case 'coo':
    case 'growth_engine':
      return 'T4'
    default:
      return tier.slice(0, 2).toUpperCase()
  }
}

/* ------------------------------------------------------------------ */
/*  Layout                                                             */
/* ------------------------------------------------------------------ */

export default function CommandCenterLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CommandCenterShell>{children}</CommandCenterShell>
    </AuthProvider>
  )
}

function CommandCenterShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { profile, isSuperAdmin: _isSuperAdmin, isLoading, signOut } = useAuth()
  // Dev bypass: skip super_admin gate for local testing
  const isSuperAdmin = process.env.NODE_ENV === 'development' ? true : _isSuperAdmin
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [orgs, setOrgs] = useState<OrgWithHealth[]>([])
  const [orgsLoading, setOrgsLoading] = useState(true)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  const sidebarWidth = sidebarCollapsed ? 72 : 280

  /* Fetch organizations with task counts via internal API */
  useEffect(() => {
    const load = async () => {
      setOrgsLoading(true)
      try {
        const res = await fetch('/api/command-center/orgs')
        if (res.ok) {
          const { orgs: orgData } = await res.json()
          setOrgs(orgData || [])
        }
      } catch (err) {
        console.error('Failed to load orgs:', err)
      }
      setOrgsLoading(false)
    }
    load()
  }, [])

  /* Close mobile menu on route change */
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  /* Close mobile menu on outside click */
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

  // While loading auth, show nothing
  if (isLoading) {
    return (
      <div className="premium-shell flex h-screen items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#17cfb2] border-t-transparent" />
          <span className="text-[#a6b4cf] text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  // Super admin gate
  if (!isSuperAdmin) {
    return (
      <div className="premium-shell flex h-screen items-center justify-center">
        <div className="premium-card max-w-md rounded-xl p-8 text-center">
          <ShieldAlert size={48} className="mx-auto mb-4 text-red-400" />
          <h1 className="mb-2 text-xl font-bold text-[#ecf3ff]">Access Denied</h1>
          <p className="mb-6 text-[#a6b4cf]">
            The Command Center is restricted to super administrators. Contact your system administrator if you believe this is an error.
          </p>
          <Link
            href="/dashboard"
            className="premium-button inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Extract current orgId from pathname
  const pathSegments = pathname.split('/')
  const currentOrgId = pathSegments.length >= 3 && pathSegments[1] === 'command-center' && pathSegments[2] && !['tasks', 'agents', 'settings', 'pipeline'].includes(pathSegments[2])
    ? pathSegments[2]
    : null

  // Filter orgs by search
  const filteredOrgs = searchQuery
    ? orgs.filter((org) => org.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : orgs

  const bottomLinks = [
    { label: 'All Tasks', href: '/command-center', icon: ListTodo, exact: true },
    { label: 'Pipeline', href: '/command-center/pipeline', icon: BarChart3 },
    { label: 'Agents', href: '/command-center/agents', icon: Bot },
    { label: 'Settings', href: '/command-center/settings', icon: Settings },
  ]

  /* ---- Sidebar content renderer ---- */
  const renderSidebarContent = (collapsed: boolean) => (
    <>
      {/* Header */}
      <div className="flex h-16 items-center border-b border-[rgba(148,163,184,0.1)] px-4">
        <Link href="/command-center" className="flex items-center gap-2 overflow-hidden">
          <Terminal size={22} className="flex-shrink-0 text-[#2DD4BF]" />
          {!collapsed && (
            <span className="text-sm font-bold text-[#F8FAFC] tracking-tight whitespace-nowrap">
              OIOS Command Center
            </span>
          )}
        </Link>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B]"
            />
            <input
              type="text"
              placeholder="Filter clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-md border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-8 pr-3 text-xs text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
            />
          </div>
        </div>
      )}

      {/* Organization list */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {!collapsed && (
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
            Organizations
          </p>
        )}

        {orgsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2DD4BF] border-t-transparent" />
          </div>
        ) : filteredOrgs.length === 0 ? (
          <p className="px-2 py-4 text-xs text-[#64748B]">
            {searchQuery ? 'No matching clients.' : 'No organizations found.'}
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {filteredOrgs.map((org) => {
              const isActive = currentOrgId === org.id
              return (
                <Link
                  key={org.id}
                  href={`/command-center/${org.id}`}
                  className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-[#2DD4BF]/10 text-[#2DD4BF]'
                      : 'text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#F8FAFC]'
                  }`}
                  title={collapsed ? org.name : undefined}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute inset-y-1 left-0 w-[3px] rounded-r-full bg-[#2DD4BF]" />
                  )}

                  {/* Tier dot */}
                  <span className={`flex-shrink-0 h-2.5 w-2.5 rounded-full ${getTierColor(org.tier)}`} />

                  {!collapsed && (
                    <>
                      {/* Name */}
                      <span className="flex-1 truncate text-xs font-medium">{org.name}</span>

                      {/* Health score */}
                      <span className={`text-[10px] font-semibold ${getHealthColor(org.healthScore)}`}>
                        {org.healthScore}
                      </span>

                      {/* Alert badge */}
                      {org.alertCount > 0 && (
                        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500/20 px-1 text-[10px] font-bold text-red-400">
                          {org.alertCount}
                        </span>
                      )}

                      {/* Active task count */}
                      {org.activeTaskCount > 0 && (
                        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#2DD4BF]/20 px-1 text-[10px] font-bold text-[#2DD4BF]">
                          {org.activeTaskCount}
                        </span>
                      )}
                    </>
                  )}

                  {/* Collapsed tooltip */}
                  {collapsed && (
                    <div className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-[#1E293B] px-3 py-2 text-xs font-medium text-[#F8FAFC] shadow-lg shadow-black/40 group-hover:block">
                      <span>{org.name}</span>
                      <span className={`ml-2 ${getHealthColor(org.healthScore)}`}>{org.healthScore}</span>
                      {org.activeTaskCount > 0 && (
                        <span className="ml-2 text-[#2DD4BF]">{org.activeTaskCount} tasks</span>
                      )}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* Bottom links */}
      <div className="border-t border-[rgba(148,163,184,0.1)] px-2 py-3">
        <div className="flex flex-col gap-0.5">
          {bottomLinks.map((link) => {
            const Icon = link.icon
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-[#2DD4BF]/10 text-[#2DD4BF]'
                    : 'text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#F8FAFC]'
                }`}
                title={collapsed ? link.label : undefined}
              >
                {isActive && (
                  <span className="absolute inset-y-1 left-0 w-[3px] rounded-r-full bg-[#2DD4BF]" />
                )}
                <Icon size={16} className="flex-shrink-0" />
                {!collapsed && <span className="text-xs font-medium">{link.label}</span>}

                {collapsed && (
                  <div className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md bg-[#1E293B] px-3 py-2 text-xs font-medium text-[#F8FAFC] shadow-lg shadow-black/40 group-hover:block">
                    {link.label}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Dashboard link + sign out */}
      <div className="border-t border-[rgba(148,163,184,0.1)] p-3">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <Link
            href="/dashboard"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#2DD4BF]/20 text-sm font-bold text-[#2DD4BF] transition-colors hover:bg-[#2DD4BF]/30"
            title="Back to Dashboard"
          >
            <Activity size={16} />
          </Link>
          {!collapsed && (
            <>
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-xs font-semibold text-[#F8FAFC]">
                  {profile?.full_name || 'Admin'}
                </span>
                <span className="truncate text-[10px] text-[#64748B]">Super Admin</span>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="flex-shrink-0 rounded-md p-1.5 text-[#64748B] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
                title="Log out"
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <div className="border-t border-[rgba(148,163,184,0.1)] p-2">
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-md p-2 text-[#64748B] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC]"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            size={16}
            className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>
    </>
  )

  return (
    <div className="premium-shell flex h-screen overflow-hidden">
      {/* ============================================================ */}
      {/*  Desktop Sidebar                                              */}
      {/* ============================================================ */}
      <aside
        className="premium-sidebar hidden md:flex flex-col transition-[width] duration-300 ease-in-out"
        style={{ width: sidebarWidth, minWidth: sidebarWidth }}
      >
        {renderSidebarContent(sidebarCollapsed)}
      </aside>

      {/* ============================================================ */}
      {/*  Mobile Sidebar Overlay                                       */}
      {/* ============================================================ */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" aria-hidden="true" />
      )}

      <aside
        ref={mobileMenuRef}
        className={`premium-sidebar fixed inset-y-0 left-0 z-50 flex w-72 flex-col transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile close button overlay */}
        <div className="absolute right-2 top-4 z-10">
          <button
            type="button"
            onClick={toggleMobileMenu}
            className="rounded-md p-1.5 text-[#a6b4cf] transition-colors hover:bg-white/[0.08] hover:text-[#ecf3ff]"
          >
            <X size={18} />
          </button>
        </div>
        {renderSidebarContent(false)}
      </aside>

      {/* ============================================================ */}
      {/*  Main column                                                  */}
      {/* ============================================================ */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="premium-header flex h-14 flex-shrink-0 items-center gap-3 px-4 sm:px-6">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={toggleMobileMenu}
            className="rounded-md p-1.5 text-[#a6b4cf] transition-colors hover:bg-white/[0.08] hover:text-[#ecf3ff] md:hidden"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm">
            <Link href="/command-center" className="text-[#a6b4cf] transition-colors hover:text-[#ecf3ff]">
              Command Center
            </Link>
            {currentOrgId && (
              <>
                <span className="text-[#6f7f9d]">/</span>
                <span className="max-w-[200px] truncate font-medium text-[#ecf3ff]">
                  {orgs.find((o) => o.id === currentOrgId)?.name || 'Organization'}
                </span>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            <span className="hidden text-[10px] text-[#6f7f9d] sm:inline">Live</span>
          </div>
        </header>

        {/* Page content */}
        <main className="premium-main flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
