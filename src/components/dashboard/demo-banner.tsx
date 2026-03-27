'use client'

import { useState } from 'react'
import { X, ArrowRight } from 'lucide-react'

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="relative flex items-center justify-between gap-4 bg-gradient-to-r from-teal-500/15 via-teal-400/10 to-teal-500/15 border-b border-teal-400/20 px-4 py-2.5 sm:px-6">
      <div className="flex items-center gap-3 text-sm">
        <span className="hidden sm:inline rounded-full bg-teal-400/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-teal-300">
          Demo
        </span>
        <span className="text-slate-300">
          You&apos;re viewing a demo &mdash;{' '}
          <span className="font-semibold text-white">Mike&apos;s Plumbing</span>
          <span className="hidden sm:inline">, Gilbert AZ</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="https://getoios.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:bg-teal-400 hover:shadow-teal-500/30"
        >
          Get OIOS
          <ArrowRight size={12} />
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="rounded p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Dismiss demo banner"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
