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
  XCircle,
  Bell,
} from 'lucide-react'
import type { Invoice, Customer, InvoiceStatus } from '@/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cardClass =
  'bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6'

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
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filter, setFilter] = useState<'all' | InvoiceStatus>('all')

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    const fetchData = async () => {
      const [invRes, custRes] = await Promise.all([
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*'),
      ])
      if (invRes.data) setInvoices(invRes.data as unknown as Invoice[])
      if (custRes.data) setCustomers(custRes.data as unknown as Customer[])
    }
    fetchData()
  }, [])

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

  return (
    <div className="space-y-8">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoicing</h1>
          <p className="mt-1 text-slate-400">
            Track payments, send reminders, and manage your accounts receivable.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-[#2DD4BF] px-5 py-2.5 text-sm font-semibold text-[#0B1120] shadow-lg shadow-[#2DD4BF]/20 transition-all hover:bg-[#5EEAD4] hover:shadow-[#2DD4BF]/30 active:scale-[0.97]">
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
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-[#2DD4BF]/40 bg-[#2DD4BF]/10 text-[#2DD4BF]'
                  : 'border-[rgba(148,163,184,0.1)] bg-[#111827] text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`ml-1.5 ${isActive ? 'text-[#2DD4BF]/70' : 'text-slate-600'}`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Invoice Table ────────────────────────────────────────────── */}
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
                return (
                  <tr
                    key={inv.id}
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
                    <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-[#F8FAFC]">
                      {formatCurrencyExact(inv.amount)}
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
    </div>
  )
}
