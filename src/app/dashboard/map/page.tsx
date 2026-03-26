'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import { JobMap } from '@/components/dashboard/map/job-map'
import { ServiceAreaHeatmap } from '@/components/dashboard/map/service-area-heatmap'
import { TechTracker } from '@/components/dashboard/map/tech-tracker'
import { RouteOptimizer } from '@/components/dashboard/map/route-optimizer'
import { MapPin, RefreshCw, Wifi } from 'lucide-react'

export default function MapPage() {
  const { organization } = useAuth()
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isLive, setIsLive] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!organization?.id) return
    const supabase = createSupabaseBrowserClient()
    const channel = supabase
      .channel('map-page-live')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `organization_id=eq.${organization.id}`,
      }, () => {
        setLastUpdated(new Date())
        setRefreshKey(k => k + 1)
      })
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED')
      })
    return () => { supabase.removeChannel(channel) }
  }, [organization?.id])

  function handleRefresh() {
    setRefreshKey(k => k + 1)
    setLastUpdated(new Date())
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })

  return (
    <div className="min-h-screen bg-[#0B1120] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-6 h-6 text-[#2DD4BF]" />
            <h1 className="text-2xl font-bold text-[#F8FAFC]">Geographic Intelligence</h1>
          </div>
          <p className="text-[#94A3B8] text-sm">{today}</p>
        </div>

        <div className="flex items-center gap-3">
          {isLive && (
            <div className="flex items-center gap-1.5 text-xs text-[#22C55E] bg-[rgba(34,197,94,0.1)] px-2.5 py-1.5 rounded-full">
              <Wifi className="w-3 h-3" />
              <span>Live</span>
            </div>
          )}
          <span className="text-xs text-[#64748B]">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-sm text-[#94A3B8] hover:text-[#F8FAFC] transition-colors bg-[rgba(148,163,184,0.05)] hover:bg-[rgba(148,163,184,0.1)] px-3 py-1.5 rounded-lg"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Job Map — full width on mobile, left column on xl */}
        <div key={`job-map-${refreshKey}`}>
          <JobMap />
        </div>

        {/* Tech Tracker */}
        <div key={`tech-tracker-${refreshKey}`}>
          <TechTracker />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Route Optimizer */}
        <div key={`route-optimizer-${refreshKey}`}>
          <RouteOptimizer />
        </div>

        {/* Service Area Heatmap */}
        <div key={`heatmap-${refreshKey}`}>
          <ServiceAreaHeatmap />
        </div>
      </div>
    </div>
  )
}
