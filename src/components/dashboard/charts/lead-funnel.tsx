'use client'

interface FunnelStage {
  stage: string
  count: number
  rate: number
  value?: number
}

interface LeadFunnelProps {
  data: FunnelStage[]
}

const STAGE_COLORS = [
  '#2DD4BF', // teal
  '#34d399', // emerald
  '#60a5fa', // blue
  '#a78bfa', // violet
  '#f59e0b', // amber
]

function formatStageName(stage: string): string {
  return stage
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`
  return `$${value.toLocaleString()}`
}

export function LeadFunnel({ data }: LeadFunnelProps) {
  if (!data || data.length === 0) return null

  const maxCount = data[0]?.count || 1

  return (
    <div className="space-y-3">
      {data.map((item, idx) => {
        const widthPct = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0
        const color = STAGE_COLORS[idx % STAGE_COLORS.length]

        return (
          <div key={item.stage} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300 font-medium">{formatStageName(item.stage)}</span>
              <div className="flex items-center gap-3 text-right">
                <span className="text-slate-200 font-semibold tabular-nums w-8 text-right">
                  {item.count.toLocaleString()}
                </span>
                {item.value !== undefined && item.value > 0 && (
                  <span className="text-teal-400 tabular-nums text-xs w-20 text-right font-medium">
                    {formatCurrency(item.value)}
                  </span>
                )}
                {item.value === undefined && <span className="w-20" />}
                {idx > 0 && (
                  <span className="text-slate-500 tabular-nums w-14 text-right">
                    {item.rate.toFixed(1)}%
                  </span>
                )}
                {idx === 0 && <span className="w-14" />}
              </div>
            </div>
            <div className="h-2 bg-[rgba(148,163,184,0.08)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${widthPct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
