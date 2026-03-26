'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Megaphone,
  Mail,
  MessageSquare,
  Send,
  Eye,
  MousePointerClick,
  DollarSign,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import { CampaignBuilderModal } from '@/components/dashboard/campaigns/campaign-builder-modal'
import { CampaignStats } from '@/components/dashboard/campaigns/campaign-stats'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignRow {
  id: string
  name: string
  channel: 'Email' | 'SMS' | 'Both'
  status: 'pending' | 'approved' | 'executed' | 'rejected' | 'failed'
  created_at: string
  payload: Record<string, unknown>
  template_id?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const cardClass =
  'bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6'

const STATUS_COLORS: Record<string, { text: string; bg: string }> = {
  executed: { text: 'text-green-400', bg: 'bg-green-400/10' },
  pending: { text: 'text-amber-400', bg: 'bg-amber-400/10' },
  approved: { text: 'text-blue-400', bg: 'bg-blue-400/10' },
  rejected: { text: 'text-red-400', bg: 'bg-red-400/10' },
  failed: { text: 'text-red-400', bg: 'bg-red-400/10' },
  active: { text: 'text-green-400', bg: 'bg-green-400/10' },
  completed: { text: 'text-teal-400', bg: 'bg-teal-400/10' },
  scheduled: { text: 'text-blue-400', bg: 'bg-blue-400/10' },
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
  Email: Mail,
  SMS: MessageSquare,
  Both: Send,
}

const CHANNEL_COLORS: Record<string, string> = {
  Email: '#2DD4BF',
  SMS: '#f97316',
  Both: '#a78bfa',
}

// Mock fallback campaigns when DB has no data
const MOCK_CAMPAIGNS: CampaignRow[] = [
  {
    id: 'mock-1',
    name: 'Spring Maintenance Special',
    channel: 'Email',
    status: 'executed',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    payload: { sent: 156, open_rate: 42, click_rate: 12 },
  },
  {
    id: 'mock-2',
    name: 'Re-engagement Blast',
    channel: 'SMS',
    status: 'executed',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    payload: { sent: 45, open_rate: 68, click_rate: 22 },
  },
  {
    id: 'mock-3',
    name: 'Review Request Campaign',
    channel: 'Both',
    status: 'pending',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    payload: { sent: 30, open_rate: 55, click_rate: 18 },
  },
]

// ---------------------------------------------------------------------------
// Campaign Card
// ---------------------------------------------------------------------------

function CampaignCard({
  campaign,
  organizationId,
}: {
  campaign: CampaignRow
  organizationId: string
}) {
  const [expanded, setExpanded] = useState(false)
  const Icon = CHANNEL_ICONS[campaign.channel] || Send
  const color = CHANNEL_COLORS[campaign.channel] || '#2DD4BF'
  const statusStyle = STATUS_COLORS[campaign.status] || STATUS_COLORS.pending

  const sent = (campaign.payload?.sent as number) || 0
  const openRate = (campaign.payload?.open_rate as number) || 0
  const clickRate = (campaign.payload?.click_rate as number) || 0

  return (
    <div className={`${cardClass} relative overflow-hidden`}>
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{ backgroundColor: color }}
      />

      <div className="mt-1 flex items-start justify-between gap-3">
        {/* Channel badge */}
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon size={12} />
          {campaign.channel}
        </span>

        {/* Status badge */}
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text}`}
        >
          {campaign.status}
        </span>
      </div>

      {/* Campaign name */}
      <h3 className="mt-3 text-base font-semibold text-[#F8FAFC] leading-tight">
        {campaign.name}
      </h3>

      <p className="mt-1 text-xs text-slate-500">
        Created {new Date(campaign.created_at).toLocaleDateString()}
      </p>

      {/* Quick metrics */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: 'Sent', value: sent },
          { label: 'Open', value: `${openRate}%` },
          { label: 'Click', value: `${clickRate}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-[rgba(148,163,184,0.04)] p-2.5 text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-0.5 text-sm font-bold text-[#F8FAFC]">{value}</p>
          </div>
        ))}
      </div>

      {/* View details toggle */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg border border-[rgba(148,163,184,0.1)] py-2 text-xs font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
      >
        {expanded ? (
          <>
            <ChevronUp size={13} /> Hide Details
          </>
        ) : (
          <>
            <ChevronDown size={13} /> View Details
          </>
        )}
      </button>

      {expanded && (
        <div className="mt-4 border-t border-[rgba(148,163,184,0.08)] pt-4">
          <CampaignStats organizationId={organizationId} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CampaignsPage() {
  const { profile, organization } = useAuth()
  const orgId = organization?.id || profile?.organization_id || ''
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const supabase = createSupabaseBrowserClient()

  async function loadCampaigns() {
    if (!orgId) return
    const { data } = await supabase
      .from('automation_queue')
      .select('*')
      .eq('organization_id', orgId)
      .eq('target_entity_type', 'campaign')
      .order('created_at', { ascending: false })

    if (data && data.length > 0) {
      setCampaigns(
        data.map((d) => ({
          id: d.id,
          name: (d.payload as any)?.campaign_name || 'Unnamed Campaign',
          channel: (d.payload as any)?.channel || 'Email',
          status: d.status,
          created_at: d.created_at,
          payload: d.payload as Record<string, unknown>,
        }))
      )
    } else {
      setCampaigns(MOCK_CAMPAIGNS)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadCampaigns()
  }, [orgId])

  // Aggregate stats
  const aggregateStats = useMemo(() => {
    const totalSent = campaigns.reduce((s, c) => s + ((c.payload?.sent as number) || 0), 0)
    const avgOpen =
      campaigns.length > 0
        ? Math.round(
            campaigns.reduce((s, c) => s + ((c.payload?.open_rate as number) || 0), 0) /
              campaigns.length
          )
        : 0
    const avgClick =
      campaigns.length > 0
        ? Math.round(
            campaigns.reduce((s, c) => s + ((c.payload?.click_rate as number) || 0), 0) /
              campaigns.length
          )
        : 0
    return { totalSent, avgOpen, avgClick, revenue: '$0' }
  }, [campaigns])

  const summaryCards = [
    { label: 'Total Sent', value: aggregateStats.totalSent, icon: Send, color: '#2DD4BF' },
    { label: 'Avg Open Rate', value: `${aggregateStats.avgOpen}%`, icon: Eye, color: '#60a5fa' },
    { label: 'Avg Click Rate', value: `${aggregateStats.avgClick}%`, icon: MousePointerClick, color: '#f97316' },
    { label: 'Revenue Attributed', value: aggregateStats.revenue, icon: DollarSign, color: '#34d399' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <Megaphone className="h-8 w-8 text-[#2DD4BF]" />
            Campaigns
          </h1>
          <p className="mt-1 text-slate-400">
            Create, manage, and track your outreach campaigns.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-[#2DD4BF] px-4 py-2.5 text-sm font-semibold text-[#0B1120] shadow-lg shadow-[#2DD4BF]/20 transition-all hover:bg-[#5EEAD4] hover:shadow-[#2DD4BF]/30 active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} />
          Create Campaign
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className={cardClass}>
              <div className="mb-3 flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${s.color}20` }}
                >
                  <Icon size={18} style={{ color: s.color }} />
                </div>
                <p className="text-sm text-slate-400">{s.label}</p>
              </div>
              <p className="text-3xl font-bold text-[#F8FAFC]">{s.value}</p>
            </div>
          )
        })}
      </div>

      {/* Campaign cards grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-[#F8FAFC]">All Campaigns</h2>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`${cardClass} animate-pulse`}>
                <div className="mb-3 h-5 w-24 rounded bg-slate-700" />
                <div className="h-6 w-40 rounded bg-slate-700 mb-2" />
                <div className="h-3 w-20 rounded bg-slate-800" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} organizationId={orgId} />
            ))}
          </div>
        )}
      </div>

      {/* Campaign builder modal */}
      {showModal && (
        <CampaignBuilderModal
          organizationId={orgId}
          onClose={() => setShowModal(false)}
          onCreated={loadCampaigns}
        />
      )}
    </div>
  )
}
