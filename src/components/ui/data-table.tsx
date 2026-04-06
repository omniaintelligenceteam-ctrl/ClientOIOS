'use client'

import { useState, useMemo, type ReactNode } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Pagination } from './pagination'
import { Skeleton } from './skeleton'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  render?: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyState?: ReactNode
  pageSize?: number
  selectable?: boolean
  onSelectionChange?: (ids: string[]) => void
  mobileCardRender?: (row: T) => ReactNode
  className?: string
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  emptyState,
  pageSize = 20,
  selectable = false,
  onSelectionChange,
  mobileCardRender,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // sort
  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey]
      const bv = (b as Record<string, unknown>)[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  // paginate
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, page, pageSize])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      onSelectionChange?.(Array.from(next))
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === paged.length) {
      setSelected(new Set())
      onSelectionChange?.([])
    } else {
      const all = new Set(paged.map((r) => r.id))
      setSelected(all)
      onSelectionChange?.(Array.from(all))
    }
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="text-[#64748B]" />
    return sortDir === 'asc' ? (
      <ArrowUp size={12} className="text-[#2DD4BF]" />
    ) : (
      <ArrowDown size={12} className="text-[#2DD4BF]" />
    )
  }

  // loading
  if (loading) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  // empty
  if (data.length === 0) {
    return <>{emptyState || <div className="py-12 text-center text-sm text-[#64748B]">No data</div>}</>
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Mobile cards */}
      {mobileCardRender && (
        <div className="flex flex-col gap-3 md:hidden">
          {paged.map((row) => (
            <div key={row.id}>{mobileCardRender(row)}</div>
          ))}
        </div>
      )}

      {/* Desktop table */}
      <div className={cn('overflow-x-auto rounded-xl border border-white/[0.06]', mobileCardRender && 'hidden md:block')}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {selectable && (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === paged.length && paged.length > 0}
                    onChange={toggleAll}
                    className="accent-[#2DD4BF]"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]',
                    col.sortable && 'cursor-pointer select-none hover:text-slate-300',
                    col.className
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && <SortIcon col={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-white/[0.03] transition-colors hover:bg-white/[0.03]',
                  selected.has(row.id) && 'bg-[#2DD4BF]/5'
                )}
              >
                {selectable && (
                  <td className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      className="accent-[#2DD4BF]"
                      aria-label={`Select row ${row.id}`}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-slate-300">
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.length > pageSize && (
        <Pagination
          totalItems={data.length}
          pageSize={pageSize}
          currentPage={page}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
