'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'card' | 'stat' | 'text' | 'chart' | 'avatar' | 'badge'
  lines?: number
}

/**
 * Base shimmer skeleton element
 */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md',
        'bg-gradient-to-r from-[#1e293b] via-[#334155] to-[#1e293b]',
        'bg-[length:200%_100%]',
        '[animation:shimmer_1.8s_ease-in-out_infinite]',
        className
      )}
      style={style}
    />
  )
}

/**
 * Stat card skeleton
 */
export function StatSkeleton({ animDelay = 0 }: { animDelay?: number }) {
  return (
    <div
      className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

/**
 * Card skeleton
 */
export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
      <Skeleton className="h-6 w-40 mb-5" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Chart skeleton
 */
export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="w-full rounded-xl" style={{ height }} />
    </div>
  )
}

/**
 * Text line skeleton
 */
export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  const widths = ['100%', '85%', '70%', '90%', '60%']
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4" style={{ width: widths[i % widths.length] }} />
      ))}
    </div>
  )
}

/**
 * Table row skeleton
 */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-white/[0.04]">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" style={{ maxWidth: i === 0 ? 180 : undefined }} />
      ))}
    </div>
  )
}

/**
 * Full page loading skeleton (Command Center style)
 */
export function PageSkeleton() {
  return (
    <div className="space-y-8 animate-page-enter">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 80, 160, 240].map((d) => (
          <StatSkeleton key={d} animDelay={d} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton height={240} />
        <ChartSkeleton height={240} />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6">
        <CardSkeleton rows={5} />
        <div className="space-y-6">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={2} />
        </div>
      </div>
    </div>
  )
}

/**
 * Inline loader replacement for Loader2 spinner
 */
export function SkeletonLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-12', className)}>
      <div className="space-y-3 w-full max-w-sm">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    </div>
  )
}

export default Skeleton
