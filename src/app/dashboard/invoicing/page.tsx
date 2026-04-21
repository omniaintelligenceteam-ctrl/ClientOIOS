'use client'

import { useState, useEffect, useMemo } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  Receipt,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  Eye,
  FileText,
  Bell,
  Copy,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/toast'
import { EmptyState } from '@/components/dashboard/empty-state'
import { InlineEdit } from '@/components/ui/inline-edit'
import { ContextMenu, type ContextMenuItem } from '@/components/ui/context-menu'
import type { Invoice, Customer, InvoiceStatus } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cardClass =
  'premium-card rounded-2xl p-6'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatCurrencyExact(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function customerName(customerId: string, customers: Customer[]): string {
  const c = customers.find((cust) => cust.id === customerId)
  if (!c) return 'Unknown'
  return `${c.first_name} ${c.last_name}`
}

function getNextInvoiceNumber(invoices: Invoice[]): string {
  const year = new Date().getFullYear()
  const pattern = /^INV-(\d{4})-(\d+)$/
  let maxForYear = 0

  for (const invoice of invoices) {
    const match = pattern.exec(invoice.invoice_number ?? '')
    if (!match) continue
    const invoiceYear = Number(match[1])
    const invoiceNumber = Number(match[2])
    if (invoiceYear === year && Number.isFinite(invoiceNumber)) {
      maxForYear = Math.max(maxForYear, invoiceNumber)
    }
  }

  return `INV-${year}-${String(maxForYear + 1).padStart(4, '0')}`
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  draft: {
    label: 'Draft',
    bg: 'bg-gray-500/15',
    text: 'text-gray-400',
    border: 'border-gray-500/30',
  },
  sent: {
    label: 'Sent',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  viewed: {
    label: 'Viewed',
    bg: 'bg-teal-500/15',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
  },
  paid: {
    label: 'Paid',
    bg: 'bg-green-500/15',
    text: 'text-green-400',
    border: 'border-green-500/30',
  },
  overdue: {
    label: 'Overdue',
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
    border: 'border-slate-500/30',
  },
  partially_paid: {
    label: 'Partial',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
  },
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      {cfg.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Summary card icon helper
// ---------------------------------------------------------------------------

function SummaryIcon({
  icon: Icon,
  color,
}: {
  icon: React.ElementType
  color: string
}) {
  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}
    >
      <Icon className="h-5 w-5" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InvoicingPage() {
  const { profile, organization } = useAuth()
  const toast = useToast()
  const orgId = organization?.id || profile?.organization_id || ''
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filter, setFilter] = useState<'all' | InvoiceStatus>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      if (!orgId) { setLoading(false); return }
      setError(null)
      const [invRes, custRes] = await Promise.all([
        supabase.from('invoices').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
        supabase.from('customers').select('*').eq('organization_id', orgId),
      ])
      if (invRes.error || custRes.error) {
        setError('Failed to load invoicing data.')
      } else {
        if (invRes.data) setInvoices(invRes.data as unknown as Invoice[])
        if (custRes.data) setCustomers(custRes.data as unknown as Customer[])
      }
      setLoading(false)
    }
    fetchData()
  }, [orgId])

  const unpaidInvoices = useMemo(
    () => invoices.filter((inv) => inv.status !== 'paid' && inv.status !== 'cancelled'),
    [invoices],
  )
  const outstandingAR = useMemo(
    () => unpaidInvoices.reduce((sum, inv) => sum + (inv.amount - inv.amount_paid), 0),
    [unpaidInvoices],
  )

  const overdueInvoices = useMemo(
    () => invoices.filter((inv) => inv.status === 'overdue'),
    [invoices],
  )
  const overdueTotal = useMemo(
    () => overdueInvoices.reduce((sum, inv) => sum + (inv.amount - inv.amount_paid), 0),
    [overdueInvoices],
  )

  const paidInvoices = useMemo(
    () => invoices.filter((inv) => inv.status === 'paid'),
    [invoices],
  )
  const collectedThisMonth = useMemo(
    () => paidInvoices.reduce((sum, inv) => sum + inv.amount_paid, 0),
    [paidInvoices],
  )

  const avgDaysToPay = useMemo(
    () =>
      paidInvoices.length > 0
        ? paidInvoices.reduce((sum, inv) => {
            if (!inv.sent_at || !inv.paid_at) return sum
            const sent = new Date(inv.sent_at).getTime()
            const paid = new Date(inv.paid_at).getTime()
            return sum + (paid - sent) / 86400000
          }, 0) / paidInvoices.length
        : 0,
    [paidInvoices],
  )

  const filteredInvoices =
    filter === 'all'
      ? invoices
      : invoices.filter((inv) => inv.status === filter)

  async function handleCreateInvoice() {
    if (!orgId) {
      toast.error('Organization not found. Please refresh and try again.')
      return
    }

    if (customers.length === 0) {
      toast.error('Add a customer first before creating an invoice.')
      return
    }

    const customer = customers[0]
    const now = new Date()
    const dueDate = new Date(now)
    dueDate.setDate(now.getDate() + 14)
    const invoiceNumber = getNextInvoiceNumber(invoices)
    const nowIso = now.toISOString()

    const { data, error: insertError } = await supabase
      .from('invoices')
      .insert({
        organization_id: orgId,
        customer_id: customer.id,
        appointment_id: null,
        invoice_number: invoiceNumber,
        status: 'draft',
        amount: 0,
        amount_paid: 0,
        tax_amount: 0,
        line_items: [],
        due_date: dueDate.toISOString().slice(0, 10),
        sent_at: null,
        paid_at: null,
        payment_method: null,
        reminder_count: 0,
        last_reminder_at: null,
        notes: 'Created from dashboard quick action.',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single()

    if (insertError || !data) {
      toast.error('Could not create invoice. Please try again.')
      return
    }

    setInvoices((prev) => [data as unknown as Invoice, ...prev])
    setFilter('all')
    toast.success(`Draft invoice ${invoiceNumber} created.`)
  }

  function handleViewInvoice(inv: Invoice) {
    const estimateUrl = `/portal/estimate?estimate_id=${inv.id}`
    window.open(estimateUrl, '_blank', 'noopener,noreferrer')
  }

  async function handleCopyInvoiceNumber(invoiceNumber: string | null) {
    if (!invoiceNumber) return
    try {
      await navigator.clipboard.writeText(invoiceNumber)
      toast.success('Invoice number copied.')
    } catch {
      toast.error('Could not copy invoice number.')
    }
  }

  async function handleSendReminder(inv: Invoice) {
    if (inv.status === 'paid' || inv.status === 'cancelled') {
      toast.error('Reminder is not available for paid or cancelled invoices.')
      return
    }

    const nowIso = new Date().toISOString()
    const nextReminderCount = (inv.reminder_count ?? 0) + 1
    const updates: Partial<Invoice> = {
      reminder_count: nextReminderCount,
      last_reminder_at: nowIso,
      updated_at: nowIso,
    }

    if (!inv.sent_at) {
      updates.sent_at = nowIso
      if (inv.status === 'draft') {
        updates.status = 'sent'
      }
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', inv.id)

    if (updateError) {
      toast.error('Failed to log reminder. Please try again.')
      return
    }

    setInvoices((prev) =>
      prev.map((invoice) => (invoice.id === inv.id ? { ...invoice, ...updates } : invoice))
    )
    toast.success(`Reminder ${nextReminderCount} logged for ${inv.invoice_number}.`)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2DD4BF] border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="animate-page-enter space-y-8">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="premium-card flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="premium-kicker mb-1">Revenue Operations</p>
          <h1 className="premium-title text-3xl font-bold tracking-tight gradient-text">Invoicing</h1>
          <p className="mt-2 text-[#a6b4cf]">
            Track payments, send reminders, and manage your accounts receivable.
          </p>
        </div>
        <button
          onClick={handleCreateInvoice}
          className="premium-button inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Create Invoice
        </button>
      </div>

      {/* ── Summary Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Outstanding AR */}
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Outstanding AR</p>
            <SummaryIcon
              icon={DollarSign}
              color="bg-blue-500/15 text-blue-400"
            />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#F8FAFC]">
            {formatCurrency(outstandingAR)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {unpaidInvoices.length} unpaid invoice
            {unpaidInvoices.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Overdue */}
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Overdue</p>
            <SummaryIcon
              icon={AlertTriangle}
              color="bg-red-500/15 text-red-400"
            />
          </div>
          <p className="mt-3 text-3xl font-bold text-red-400">
            {formatCurrency(overdueTotal)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {overdueInvoices.length} overdue invoice
            {overdueInvoices.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Collected This Month */}
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Collected This Month</p>
            <SummaryIcon
              icon={CheckCircle2}
              color="bg-green-500/15 text-green-400"
            />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#F8FAFC]">
            {formatCurrency(collectedThisMonth)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {paidInvoices.length} payment{paidInvoices.length !== 1 ? 's' : ''}{' '}
            received
          </p>
        </div>

        {/* Avg Days to Pay */}
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Avg Days to Pay</p>
            <SummaryIcon icon={Clock} color="bg-teal-500/15 text-teal-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#F8FAFC]">
            {avgDaysToPay.toFixed(1)}{' '}
            <span className="text-base font-normal text-slate-500">days</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Across {paidInvoices.length} paid invoices
          </p>
        </div>
      </div>

      {/* ── Filter Tabs ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            'all',
            'draft',
            'sent',
            'viewed',
            'paid',
            'overdue',
            'cancelled',
            'partially_paid',
          ] as const
        ).map((s) => {
          const isActive = filter === s
          const label = s === 'all' ? 'All' : STATUS_CONFIG[s].label
          const count =
            s === 'all'
              ? invoices.length
              : invoices.filter((i) => i.status === s).length
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors min-h-[44px] ${
                isActive
                  ? 'border-[rgba(23,207,178,0.4)] bg-[rgba(23,207,178,0.12)] text-[#71ecd8]'
                  : 'border-[rgba(147,162,190,0.2)] bg-white/[0.03] text-[#a6b4cf] hover:border-[rgba(147,162,190,0.36)] hover:text-[#ecf3ff]'
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`ml-1.5 ${isActive ? 'text-[#71ecd8]/75' : 'text-[#6f7f9d]'}`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Empty State ──────────────────────────────────────────────── */}
      {invoices.length === 0 && (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Create your first invoice to start tracking payments and revenue."
        />
      )}

      {/* ── Invoice Table ────────────────────────────────────────────── */}
      {invoices.length > 0 && (
      <div
        className={`${cardClass} overflow-hidden !p-0`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(148,163,184,0.1)] text-left">
                <th className="whitespace-nowrap px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Invoice #
                </th>
                <th className="whitespace-nowrap px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Customer
                </th>
                <th className="whitespace-nowrap px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                  Amount
                </th>
                <th className="whitespace-nowrap px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="whitespace-nowrap px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Due Date
                </th>
                <th className="whitespace-nowrap px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Sent Date
                </th>
                <th className="whitespace-nowrap px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Paid Date
                </th>
                <th className="whitespace-nowrap px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">
                  Reminders
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => {
                const isOverdue = inv.status === 'overdue'
                const invoiceContextItems: ContextMenuItem[] = [
                  { id: 'view', label: 'View Invoice', icon: Eye, onClick: () => handleViewInvoice(inv) },
                  { id: 'copy', label: 'Copy Invoice #', icon: Copy, onClick: () => { void handleCopyInvoiceNumber(inv.invoice_number) } },
                  {
                    id: 'send',
                    label: 'Send Reminder',
                    icon: Send,
                    disabled: inv.status === 'paid' || inv.status === 'cancelled',
                    onClick: () => { void handleSendReminder(inv) },
                  },
                  { id: 'div', label: '', onClick: () => {}, divider: true },
                  { id: 'delete', label: 'Delete Invoice', icon: Trash2, danger: true, onClick: async () => {
                    setInvoices(prev => prev.filter(i => i.id !== inv.id))
                    const { error: deleteError } = await supabase.from('invoices').delete().eq('id', inv.id)
                    if (deleteError) {
                      toast.error('Failed to delete invoice.')
                      setInvoices(prev => [inv, ...prev])
                      return
                    }
                    toast.success('Invoice deleted.')
                  }},
                ]
                return (
                  <ContextMenu key={inv.id} items={invoiceContextItems}>
                  <tr
                    className={`group border-b border-[rgba(148,163,184,0.06)] transition-colors hover:bg-white/[0.02] ${
                      isOverdue ? 'border-l-2 border-l-red-500' : ''
                    }`}
                  >
                    {/* Invoice # */}
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-600" />
                        <span className="font-medium text-[#F8FAFC]">
                          {inv.invoice_number}
                        </span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="whitespace-nowrap px-6 py-4 text-slate-300">
                      {customerName(inv.customer_id, customers)}
                    </td>

                    {/* Amount */}
                    <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-[#F8FAFC]" onClick={e => e.stopPropagation()}>
                      <InlineEdit
                        value={inv.amount}
                        type="currency"
                        formatDisplay={v => formatCurrencyExact(Number(v))}
                        onSave={async (v) => {
                          const num = parseFloat(String(v).replace(/[$,]/g, ''))
                          if (isNaN(num)) return
                          await supabase.from('invoices').update({ amount: num }).eq('id', inv.id)
                          setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, amount: num } : i))
                        }}
                        className="text-right font-semibold text-[#F8FAFC]"
                      />
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge status={inv.status} />
                    </td>

                    {/* Due Date */}
                    <td
                      className={`whitespace-nowrap px-6 py-4 ${
                        isOverdue ? 'text-red-400 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {formatDate(inv.due_date)}
                    </td>

                    {/* Sent Date */}
                    <td className="whitespace-nowrap px-6 py-4 text-slate-400">
                      {formatDate(inv.sent_at)}
                    </td>

                    {/* Paid Date */}
                    <td className="whitespace-nowrap px-6 py-4 text-slate-400">
                      {inv.paid_at ? (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {formatDate(inv.paid_at)}
                        </span>
                      ) : (
                        '\u2014'
                      )}
                    </td>

                    {/* Reminders */}
                    <td className="whitespace-nowrap px-6 py-4 text-center">
                      {inv.reminder_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-400">
                          <Bell className="h-3.5 w-3.5" />
                          {inv.reminder_count}
                        </span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                  </tr>
                  </ContextMenu>
                )
              })}

              {filteredInvoices.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No invoices match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  )
}
