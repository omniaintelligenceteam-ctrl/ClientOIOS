'use client'

import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { glassCard } from '@/lib/design-system'

/* ------------------------------------------------------------------ */
/*  Reusable dashboard error page                                      */
/* ------------------------------------------------------------------ */

interface DashboardErrorProps {
  error: Error & { digest?: string }
  reset: () => void
  className?: string
}

export function DashboardError({ error, reset, className }: DashboardErrorProps) {
  return (
    <div className={cn('flex min-h-[60vh] items-center justify-center p-6', className)}>
      <div className={cn(glassCard, 'max-w-md text-center')}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
          <AlertTriangle size={24} className="text-red-400" />
        </div>

        <h2 className="mb-2 text-lg font-semibold text-[#F8FAFC]">Something went wrong</h2>

        <p className="mb-6 text-sm text-[#94A3B8] line-clamp-3">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2DD4BF] px-4 py-2.5 text-sm font-semibold text-[#0B1120] shadow-lg shadow-[#2DD4BF]/20 transition-all hover:bg-[#5EEAD4] active:scale-95"
          >
            <RotateCcw size={16} />
            Try Again
          </button>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-[#2DD4BF]/40 hover:text-[#2DD4BF]"
          >
            <Home size={16} />
            Dashboard
          </Link>
        </div>

        {error.digest && (
          <p className="mt-4 font-mono text-[10px] text-[#475569]">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
