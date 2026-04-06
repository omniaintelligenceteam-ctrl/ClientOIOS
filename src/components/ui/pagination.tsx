'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PaginationProps {
  totalItems: number
  pageSize: number
  currentPage: number
  onPageChange: (page: number) => void
  className?: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]

  if (current > 3) pages.push('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('...')

  pages.push(total)
  return pages
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Pagination({
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const pages = useMemo(() => getPageNumbers(currentPage, totalPages), [currentPage, totalPages])

  const rangeStart = (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, totalItems)

  if (totalItems === 0) return null

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <span className="text-xs text-[#64748B]">
        Showing {rangeStart}–{rangeEnd} of {totalItems}
      </span>

      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
            'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200',
            currentPage <= 1 && 'pointer-events-none opacity-30'
          )}
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-[#64748B]">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors',
                p === currentPage
                  ? 'bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/30'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
              )}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
            'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200',
            currentPage >= totalPages && 'pointer-events-none opacity-30'
          )}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
