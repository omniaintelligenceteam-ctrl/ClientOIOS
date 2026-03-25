'use client'

import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="bg-[#111827] border border-[rgba(148,163,184,0.1)] rounded-2xl p-6">
      <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgba(148,163,184,0.06)]">
          <Icon className="w-8 h-8 text-slate-600" strokeWidth={1.5} />
        </div>

        {/* Text */}
        <div className="space-y-1.5 max-w-xs">
          <p className="text-sm font-semibold text-slate-300">{title}</p>
          <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
        </div>

        {/* Optional CTA */}
        {actionLabel && (
          <>
            {actionHref ? (
              <a
                href={actionHref}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#0B1120] text-sm font-semibold px-4 py-2 transition-colors"
              >
                {actionLabel}
              </a>
            ) : (
              <button
                type="button"
                onClick={onAction}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#0B1120] text-sm font-semibold px-4 py-2 transition-colors"
              >
                {actionLabel}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
