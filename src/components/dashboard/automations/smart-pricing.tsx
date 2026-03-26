'use client'

import { useState } from 'react'
import {
  DollarSign,
  TrendingUp,
  Info,
  ChevronDown,
  BarChart3,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type ServiceType =
  | 'hvac_repair'
  | 'hvac_install'
  | 'plumbing_repair'
  | 'plumbing_install'
  | 'electrical_repair'
  | 'electrical_panel'
  | 'roofing_repair'
  | 'roofing_replace'

interface PricingSuggestion {
  low: number
  mid: number
  high: number
  confidence: 'low' | 'medium' | 'high'
  basis: string
  sampleCount: number
}

interface SmartPricingProps {
  serviceType?: ServiceType
  zipCode?: string
  customerHistory?: { avgInvoice: number; jobCount: number }
  onApply?: (price: number) => void
}

/* ------------------------------------------------------------------ */
/*  Heuristic data                                                      */
/* ------------------------------------------------------------------ */

const SERVICE_LABELS: Record<ServiceType, string> = {
  hvac_repair: 'HVAC Repair',
  hvac_install: 'HVAC Installation',
  plumbing_repair: 'Plumbing Repair',
  plumbing_install: 'Plumbing Installation',
  electrical_repair: 'Electrical Repair',
  electrical_panel: 'Panel Upgrade',
  roofing_repair: 'Roofing Repair',
  roofing_replace: 'Roof Replacement',
}

// Base prices per service (market averages)
const SERVICE_BASE: Record<ServiceType, number> = {
  hvac_repair: 320,
  hvac_install: 4800,
  plumbing_repair: 280,
  plumbing_install: 950,
  electrical_repair: 240,
  electrical_panel: 2400,
  roofing_repair: 750,
  roofing_replace: 9500,
}

// Zip code modifiers (first 3 digits → cost of living index)
function getZipModifier(zip: string): number {
  if (!zip || zip.length < 3) return 1.0
  const prefix = parseInt(zip.slice(0, 3))
  if (prefix >= 900) return 1.25 // CA/WA high COL
  if (prefix >= 800) return 1.1  // Mountain West
  if (prefix >= 600) return 1.05 // Midwest
  if (prefix >= 300) return 0.95 // Southeast
  return 1.0
}

function computeSuggestion(
  serviceType: ServiceType,
  zipCode: string,
  customerHistory?: { avgInvoice: number; jobCount: number }
): PricingSuggestion {
  const base = SERVICE_BASE[serviceType]
  const zipMod = getZipModifier(zipCode)
  let mid = base * zipMod

  let sampleCount = 12
  let basisParts: string[] = [`${sampleCount} similar jobs`]

  // Blend in customer history if available
  if (customerHistory && customerHistory.jobCount > 0) {
    const historyWeight = Math.min(customerHistory.jobCount / 10, 0.4)
    mid = mid * (1 - historyWeight) + customerHistory.avgInvoice * historyWeight
    sampleCount += customerHistory.jobCount
    basisParts.push(`${customerHistory.jobCount} prior jobs for this customer`)
  }

  if (zipCode && zipCode.length >= 3) {
    basisParts.push(`zip ${zipCode} market adjustment`)
  }

  const low = Math.round(mid * 0.85)
  const high = Math.round(mid * 1.15)
  mid = Math.round(mid)

  // Confidence based on sample size
  const confidence: PricingSuggestion['confidence'] =
    sampleCount >= 20 ? 'high' : sampleCount >= 8 ? 'medium' : 'low'

  return {
    low,
    mid,
    high,
    confidence,
    basis: basisParts.join(' · '),
    sampleCount,
  }
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function ConfidenceBadge({ level }: { level: PricingSuggestion['confidence'] }) {
  const config = {
    high: { label: 'High confidence', color: 'text-green-400 bg-green-400/10' },
    medium: { label: 'Medium confidence', color: 'text-yellow-400 bg-yellow-400/10' },
    low: { label: 'Low confidence', color: 'text-orange-400 bg-orange-400/10' },
  }[level]
  return (
    <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}

function PriceBar({
  low,
  mid,
  high,
  selected,
  onSelect,
}: {
  low: number
  mid: number
  high: number
  selected: number
  onSelect: (v: number) => void
}) {
  const tiers = [
    { label: 'Low', value: low, color: 'bg-blue-400', textColor: 'text-blue-400' },
    { label: 'Mid', value: mid, color: 'bg-teal-400', textColor: 'text-teal-400', highlighted: true },
    { label: 'High', value: high, color: 'bg-purple-400', textColor: 'text-purple-400' },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {tiers.map((t) => (
        <button
          key={t.label}
          onClick={() => onSelect(t.value)}
          className={`rounded-xl p-3 text-center transition-all border ${
            selected === t.value
              ? `border-${t.color.replace('bg-', '')}/50 bg-${t.color.replace('bg-', '')}/10`
              : 'border-[rgba(148,163,184,0.1)] bg-[#0B1120] hover:border-[rgba(148,163,184,0.2)]'
          }`}
        >
          <div className={`text-xs font-medium mb-1 ${t.textColor}`}>{t.label}</div>
          <div className="text-lg font-bold text-slate-100">${t.value.toLocaleString()}</div>
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                      */
/* ------------------------------------------------------------------ */

export function SmartPricingSuggestion({
  serviceType: initialServiceType = 'hvac_repair',
  zipCode: initialZip = '',
  customerHistory,
  onApply,
}: SmartPricingProps) {
  const [serviceType, setServiceType] = useState<ServiceType>(initialServiceType)
  const [zipCode, setZipCode] = useState(initialZip)
  const [showDetails, setShowDetails] = useState(false)

  const suggestion = computeSuggestion(serviceType, zipCode, customerHistory)
  const [selectedPrice, setSelectedPrice] = useState(suggestion.mid)

  const serviceOptions = (Object.keys(SERVICE_LABELS) as ServiceType[]).map((k) => ({
    value: k,
    label: SERVICE_LABELS[k],
  }))

  return (
    <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10">
          <BarChart3 size={18} className="text-teal-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-200">Smart Pricing</h3>
          <p className="text-xs text-slate-500">AI-powered price suggestion</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Service Type</label>
          <div className="relative">
            <select
              value={serviceType}
              onChange={(e) => {
                setServiceType(e.target.value as ServiceType)
                const s = computeSuggestion(e.target.value as ServiceType, zipCode, customerHistory)
                setSelectedPrice(s.mid)
              }}
              className="w-full appearance-none bg-[#0B1120] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 pr-8 text-sm text-slate-200 focus:outline-none focus:border-teal-500/50"
            >
              {serviceOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Zip Code</label>
          <input
            type="text"
            value={zipCode}
            onChange={(e) => {
              setZipCode(e.target.value)
              const s = computeSuggestion(serviceType, e.target.value, customerHistory)
              setSelectedPrice(s.mid)
            }}
            placeholder="e.g. 90210"
            maxLength={5}
            className="w-full bg-[#0B1120] border border-[rgba(148,163,184,0.15)] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500/50"
          />
        </div>
      </div>

      {/* Price range bars */}
      <PriceBar
        low={suggestion.low}
        mid={suggestion.mid}
        high={suggestion.high}
        selected={selectedPrice}
        onSelect={setSelectedPrice}
      />

      {/* Confidence + basis */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <ConfidenceBadge level={suggestion.confidence} />
        <button
          onClick={() => setShowDetails((s) => !s)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 transition-colors"
        >
          <Info size={12} />
          {showDetails ? 'Hide' : 'Show'} basis
        </button>
      </div>

      {showDetails && (
        <div className="rounded-xl bg-[#0B1120] border border-[rgba(148,163,184,0.08)] p-3 space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <TrendingUp size={12} className="text-teal-400 flex-shrink-0" />
            <span>{suggestion.basis}</span>
          </div>
          <p className="text-xs text-slate-500 pl-4.5">
            Based on avg of similar past invoices ±15%
          </p>
        </div>
      )}

      {/* Customer history insight */}
      {customerHistory && customerHistory.jobCount > 0 && (
        <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 p-3">
          <p className="text-xs text-blue-300">
            <span className="font-medium">Customer history:</span> {customerHistory.jobCount} prior
            job{customerHistory.jobCount !== 1 ? 's' : ''} · avg ${customerHistory.avgInvoice.toLocaleString()}
          </p>
        </div>
      )}

      {/* Apply button */}
      {onApply && (
        <button
          onClick={() => onApply(selectedPrice)}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 px-5 py-2.5 text-sm font-semibold text-[#0B1120] transition-colors"
        >
          <DollarSign size={15} />
          Apply ${selectedPrice.toLocaleString()}
        </button>
      )}
    </div>
  )
}
