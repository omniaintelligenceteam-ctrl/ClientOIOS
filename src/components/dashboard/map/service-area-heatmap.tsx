'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import { Grid3x3 } from 'lucide-react'

interface ZoneData {
  label: string
  zip: string
  count: number
  revenue: number
  services: string[]
}

function extractZip(address: string): string {
  const match = address.match(/\b\d{5}(-\d{4})?\b/)
  return match ? match[0].slice(0, 5) : 'Other'
}

export function ServiceAreaHeatmap() {
  const { organization } = useAuth()
  const [zones, setZones] = useState<ZoneData[]>([])
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState<ZoneData | null>(null)

  const fetchData = useCallback(async () => {
    if (!organization?.id) return
    const supabase = createSupabaseBrowserClient()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data, error } = await supabase
      .from('appointments')
      .select('address, service_type, estimated_value, actual_value')
      .eq('organization_id', organization.id)
      .gte('scheduled_date', thirtyDaysAgo.toISOString().split('T')[0])
      .not('status', 'in', '(cancelled,no_show)')

    if (!error && data) {
      const map = new Map<string, ZoneData>()
      for (const a of data) {
        const zip = extractZip(a.address || '')
        const existing = map.get(zip)
        const revenue = a.actual_value || a.estimated_value || 0
        if (existing) {
          existing.count++
          existing.revenue += revenue
          if (a.service_type && !existing.services.includes(a.service_type)) {
            existing.services.push(a.service_type)
          }
        } else {
          map.set(zip, {
            label: zip === 'Other' ? 'Unknown Area' : `ZIP ${zip}`,
            zip,
            count: 1,
            revenue,
            services: a.service_type ? [a.service_type] : [],
          })
        }
      }
      const sorted = Array.from(map.values()).sort((a, b) => b.count - a.count)
      setZones(sorted)
    }
    setLoading(false)
  }, [organization?.id])

  useEffect(() => { fetchData() }, [fetchData])

  const maxCount = Math.max(...zones.map(z => z.count), 1)

  function getIntensity(count: number): number {
    return Math.max(0.08, count / maxCount)
  }

  const gridSize = Math.ceil(Math.sqrt(zones.length)) || 4
  const cellSize = 100 / gridSize

  return (
    <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Grid3x3 className="w-5 h-5 text-[#2DD4BF]" />
          <h2 className="text-lg font-semibold text-[#F8FAFC]">Service Area Heatmap</h2>
        </div>
        <span className="text-sm text-[#94A3B8]">Last 30 days</span>
      </div>

      {/* Intensity scale */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-[#64748B]">Low</span>
        <div className="flex-1 h-2 rounded-full overflow-hidden">
          <div
            className="w-full h-full"
            style={{
              background: 'linear-gradient(to right, rgba(45,212,191,0.08), rgba(45,212,191,1))',
            }}
          />
        </div>
        <span className="text-xs text-[#64748B]">High</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-[#2DD4BF] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : zones.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-[#64748B] text-sm">
          No appointment data yet
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 100 ${100 * Math.ceil(zones.length / gridSize) / gridSize}`} className="w-full rounded-xl overflow-hidden">
            {zones.map((zone, i) => {
              const col = i % gridSize
              const row = Math.floor(i / gridSize)
              const x = col * cellSize
              const y = row * cellSize
              const intensity = getIntensity(zone.count)
              return (
                <g key={zone.zip}>
                  <rect
                    x={x + 0.5}
                    y={y + 0.5}
                    width={cellSize - 1}
                    height={cellSize - 1}
                    fill={`rgba(45,212,191,${intensity})`}
                    stroke={hovered?.zip === zone.zip ? '#2DD4BF' : 'rgba(148,163,184,0.08)'}
                    strokeWidth={hovered?.zip === zone.zip ? '0.8' : '0.3'}
                    rx="1"
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHovered(zone)}
                    onMouseLeave={() => setHovered(null)}
                  />
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize / 2 - 2}
                    textAnchor="middle"
                    fontSize={cellSize * 0.18}
                    fill="rgba(248,250,252,0.9)"
                    fontWeight="600"
                  >
                    {zone.zip === 'Other' ? '?' : zone.zip}
                  </text>
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize / 2 + cellSize * 0.14}
                    textAnchor="middle"
                    fontSize={cellSize * 0.14}
                    fill="rgba(148,163,184,0.8)"
                  >
                    {zone.count} job{zone.count !== 1 ? 's' : ''}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Hover tooltip */}
          {hovered && (
            <div className="absolute bottom-2 left-2 right-2 bg-[#1E293B] border border-[rgba(148,163,184,0.2)] rounded-xl p-3 pointer-events-none">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[#F8FAFC] text-sm">{hovered.label}</span>
                <span className="text-[#2DD4BF] font-bold text-sm">{hovered.count} jobs</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                <span>Revenue: <span className="text-[#F8FAFC]">${hovered.revenue.toLocaleString()}</span></span>
                <span>{hovered.services.slice(0, 2).join(', ')}{hovered.services.length > 2 ? '...' : ''}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
