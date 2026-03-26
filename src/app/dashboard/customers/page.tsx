'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Users,
  Search,
  DollarSign,
  Crown,
  Star,
  ArrowUpDown,
  Phone,
  Mail,
  Briefcase,
  Clock,
  Loader2,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import type { Customer } from '@/lib/types'
import { EmptyState } from '@/components/dashboard/empty-state'
import { InlineEdit } from '@/components/ui/inline-edit'
import { ContextMenu, type ContextMenuItem } from '@/components/ui/context-menu'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type SortField = 'name' | 'revenue' | 'last_contact'

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  VIP: { bg: 'bg-teal-500/15', text: 'text-teal-400' },
  repeat: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  commercial: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  property_manager: { bg: 'bg-indigo-500/15', text: 'text-indigo-400' },
  upsell_opportunity: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  new: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  eco_conscious: { bg: 'bg-lime-500/15', text: 'text-lime-400' },
  referral_source: { bg: 'bg-pink-500/15', text: 'text-pink-400' },
}

const DEFAULT_TAG_COLOR = { bg: 'bg-slate-500/15', text: 'text-slate-400' }

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

function formatTagLabel(tag: string): string {
  return tag
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function getTagColors(tag: string) {
  return TAG_COLORS[tag] ?? DEFAULT_TAG_COLOR
}

/* ------------------------------------------------------------------ */
/*  Satisfaction Display                                               */
/* ------------------------------------------------------------------ */

function SatisfactionScore({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-xs italic text-slate-600">N/A</span>
  }

  const fullStars = Math.floor(score / 2)
  const hasHalf = score % 2 >= 1
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0)

  let color = 'text-yellow-400'
  if (score >= 9) color = 'text-emerald-400'
  else if (score < 7) color = 'text-orange-400'

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            size={12}
            className={`fill-current ${color}`}
          />
        ))}
        {hasHalf && (
          <Star
            size={12}
            className={`${color} opacity-50`}
          />
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            size={12}
            className="text-slate-700"
          />
        ))}
      </div>
      <span className={`text-xs font-semibold ${color}`}>{score}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tag Pill                                                           */
/* ------------------------------------------------------------------ */

function TagPill({ tag }: { tag: string }) {
  const colors = getTagColors(tag)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colors.bg} ${colors.text}`}
    >
      {formatTagLabel(tag)}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Stats Row                                                          */
/* ------------------------------------------------------------------ */

function StatsRow({ customers }: { customers: Customer[] }) {
  const totalCustomers = customers.length

  const avgLifetimeValue = useMemo(() => {
    if (customers.length === 0) return 0
    const total = customers.reduce((sum, c) => sum + c.lifetime_value, 0)
    return Math.round(total / customers.length)
  }, [customers])

  const vipCount = useMemo(
    () =>
      customers.filter((c) => c.tags?.includes('VIP')).length,
    [customers],
  )

  const avgSatisfaction = useMemo(() => {
    const scored = customers.filter(
      (c) => c.satisfaction_score !== null,
    )
    if (scored.length === 0) return 0
    const total = scored.reduce(
      (sum, c) => sum + (c.satisfaction_score ?? 0),
      0,
    )
    return Number((total / scored.length).toFixed(1))
  }, [customers])

  const stats = [
    {
      label: 'Total Customers',
      value: String(totalCustomers),
      icon: Users,
      accent: 'text-[#2DD4BF]',
      accentBg: 'bg-[#2DD4BF]/10',
    },
    {
      label: 'Avg Lifetime Value',
      value: formatCurrency(avgLifetimeValue),
      icon: DollarSign,
      accent: 'text-[#f97316]',
      accentBg: 'bg-[#f97316]/10',
    },
    {
      label: 'VIP Customers',
      value: String(vipCount),
      icon: Crown,
      accent: 'text-teal-400',
      accentBg: 'bg-teal-500/10',
    },
    {
      label: 'Avg Satisfaction',
      value: String(avgSatisfaction),
      icon: Star,
      accent: 'text-yellow-400',
      accentBg: 'bg-yellow-500/10',
    },
  ]

  return (
    <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${stat.accentBg} ${stat.accent}`}
              >
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.accent}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sort Button                                                        */
/* ------------------------------------------------------------------ */

function SortButton({
  label,
  field,
  currentSort,
  onClick,
}: {
  label: string
  field: SortField
  currentSort: SortField
  onClick: (f: SortField) => void
}) {
  const isActive = currentSort === field
  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
        isActive
          ? 'text-[#2DD4BF]'
          : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {label}
      <ArrowUpDown
        size={11}
        className={isActive ? 'text-[#2DD4BF]' : 'text-slate-600'}
      />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Customer Row                                                       */
/* ------------------------------------------------------------------ */

function CustomerRow({ customer, onUpdate }: { customer: Customer; onUpdate?: (c: Customer) => void }) {
  const supabase = createSupabaseBrowserClient()

  const handleSave = useCallback(async (field: string, value: string | number) => {
    const { data } = await supabase
      .from('customers')
      .update({ [field]: value })
      .eq('id', customer.id)
      .select()
      .single()
    if (data && onUpdate) onUpdate(data as unknown as Customer)
  }, [customer.id, onUpdate, supabase])

  const contextItems: ContextMenuItem[] = [
    { id: 'call', label: 'Call Customer', icon: Phone, onClick: () => window.open(`tel:${customer.phone}`) },
    { id: 'email', label: 'Send Email', icon: Mail, onClick: () => window.open(`mailto:${customer.email}`) },
    { id: 'copy', label: 'Copy Phone', icon: Phone, onClick: () => navigator.clipboard?.writeText(customer.phone) },
  ]

  return (
    <ContextMenu items={contextItems}>
    <tr className="group border-b border-[rgba(148,163,184,0.05)] transition-all hover:border-[#2DD4BF]/20 hover:bg-white/[0.02]">
      {/* Name */}
      <td className="px-4 py-3.5">
        <div>
          <span className="text-sm font-semibold text-[#F8FAFC]">
            {customer.first_name} {customer.last_name}
          </span>
          {customer.notes && (
            <p className="mt-0.5 max-w-[200px] truncate text-xs text-slate-600">
              {customer.notes}
            </p>
          )}
        </div>
      </td>

      {/* Phone */}
      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1.5 text-sm text-slate-400">
          <Phone size={12} className="flex-shrink-0 text-slate-600" />
          <InlineEdit value={customer.phone} type="text" onSave={v => handleSave('phone', v)} className="text-sm text-slate-400" />
        </div>
      </td>

      {/* Email */}
      <td className="px-4 py-3.5">
        {customer.email ? (
          <div className="flex items-center gap-1.5 text-sm text-slate-400">
            <Mail size={12} className="flex-shrink-0 text-slate-600" />
            <span className="max-w-[180px] truncate">{customer.email}</span>
          </div>
        ) : (
          <span className="text-xs italic text-slate-600">--</span>
        )}
      </td>

      {/* Total Jobs */}
      <td className="px-4 py-3.5 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <Briefcase size={12} className="text-slate-500" />
          <span className="text-sm font-medium text-slate-300">
            {customer.total_jobs}
          </span>
        </div>
      </td>

      {/* Revenue */}
      <td className="px-4 py-3.5 text-right">
        <span className="text-sm font-semibold text-[#2DD4BF]">
          {formatCurrency(customer.total_revenue)}
        </span>
      </td>

      {/* Last Contact */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 text-sm text-slate-400">
          <Clock size={12} className="flex-shrink-0 text-slate-600" />
          {formatRelativeTime(customer.last_contact_at)}
        </div>
      </td>

      {/* Satisfaction */}
      <td className="px-4 py-3.5">
        <SatisfactionScore score={customer.satisfaction_score} />
      </td>

      {/* Tags */}
      <td className="px-4 py-3.5">
        <div className="flex flex-wrap gap-1">
          {(customer.tags ?? []).map((tag) => (
            <TagPill key={tag} tag={tag} />
          ))}
          {(!customer.tags || customer.tags.length === 0) && (
            <span className="text-xs italic text-slate-600">--</span>
          )}
        </div>
      </td>
    </tr>
    </ContextMenu>
  )
}

/* ------------------------------------------------------------------ */
/*  Mobile Customer Card                                               */
/* ------------------------------------------------------------------ */

function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 transition-all hover:border-[#2DD4BF]/20">
      {/* Top row */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#F8FAFC]">
            {customer.first_name} {customer.last_name}
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">{customer.phone}</p>
        </div>
        <span className="text-sm font-bold text-[#2DD4BF]">
          {formatCurrency(customer.total_revenue)}
        </span>
      </div>

      {/* Stats */}
      <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
        <div className="text-slate-500">
          <span className="text-slate-300 font-medium">{customer.total_jobs}</span> jobs
        </div>
        <div className="text-slate-500">
          <Clock size={10} className="mb-0.5 mr-0.5 inline" />
          {formatRelativeTime(customer.last_contact_at)}
        </div>
        <div>
          <SatisfactionScore score={customer.satisfaction_score} />
        </div>
      </div>

      {/* Tags */}
      {customer.tags && customer.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {customer.tags.map((tag) => (
            <TagPill key={tag} tag={tag} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .order('last_contact_at', { ascending: false })
      if (data) setCustomers(data as unknown as Customer[])
      setLoading(false)
    }
    fetchCustomers()
  }, [])

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers
    const q = searchQuery.toLowerCase()
    return customers.filter((c) => {
      const fullName = `${c.first_name} ${c.last_name}`.toLowerCase()
      const phone = c.phone.toLowerCase()
      const email = (c.email ?? '').toLowerCase()
      const tags = (c.tags ?? []).join(' ').toLowerCase()
      return (
        fullName.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        tags.includes(q)
      )
    })
  }, [searchQuery, customers])

  // Sort customers
  const sortedCustomers = useMemo(() => {
    const sorted = [...filteredCustomers]
    switch (sortField) {
      case 'name':
        sorted.sort((a, b) =>
          `${a.first_name} ${a.last_name}`.localeCompare(
            `${b.first_name} ${b.last_name}`,
          ),
        )
        break
      case 'revenue':
        sorted.sort((a, b) => b.total_revenue - a.total_revenue)
        break
      case 'last_contact':
        sorted.sort((a, b) => {
          const aDate = a.last_contact_at
            ? new Date(a.last_contact_at).getTime()
            : 0
          const bDate = b.last_contact_at
            ? new Date(b.last_contact_at).getTime()
            : 0
          return bDate - aDate
        })
        break
    }
    return sorted
  }, [filteredCustomers, sortField])

  return (
    <div className="flex h-full flex-col gap-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Customers</h1>
          <p className="mt-1 text-sm text-slate-400">
            {customers.length} total
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
          />
          <input
            type="text"
            placeholder="Search name, phone, email, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-[rgba(148,163,184,0.1)] bg-[#0B1120] pl-9 pr-3 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20"
          />
        </div>
      </div>

      {/* ---- Stats Row ---- */}
      <StatsRow customers={customers} />

      {/* ---- Empty State ---- */}
      {!loading && customers.length === 0 && (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Import your existing customers or let OIOS build your directory from calls."
          actionLabel="Import Customers"
          actionHref="#"
        />
      )}

      {/* ---- Desktop Table ---- */}
      <div className="hidden overflow-x-auto backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl md:block">
        <table className="w-full min-w-[1000px] text-left">
          <thead>
            <tr className="border-b border-[rgba(148,163,184,0.1)]">
              <th className="px-4 py-3">
                <SortButton
                  label="Name"
                  field="name"
                  currentSort={sortField}
                  onClick={setSortField}
                />
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Phone
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                Jobs
              </th>
              <th className="px-4 py-3 text-right">
                <SortButton
                  label="Revenue"
                  field="revenue"
                  currentSort={sortField}
                  onClick={setSortField}
                />
              </th>
              <th className="px-4 py-3">
                <SortButton
                  label="Last Contact"
                  field="last_contact"
                  currentSort={sortField}
                  onClick={setSortField}
                />
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Satisfaction
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tags
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCustomers.map((customer, idx) => (
              <CustomerRow key={customer.id} customer={customer} onUpdate={updated => setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c))} />
            ))}
            {sortedCustomers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <Search
                    size={32}
                    className="mx-auto mb-3 text-slate-600"
                  />
                  <p className="text-sm font-medium text-slate-400">
                    No customers found
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Try adjusting your search terms
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ---- Mobile Cards ---- */}
      <div className="flex flex-col gap-3 md:hidden">
        {sortedCustomers.map((customer) => (
          <CustomerCard key={customer.id} customer={customer} />
        ))}
        {sortedCustomers.length === 0 && (
          <div className="flex flex-col items-center backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-12">
            <Search size={32} className="mb-3 text-slate-600" />
            <p className="text-sm font-medium text-slate-400">
              No customers found
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Try adjusting your search terms
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
