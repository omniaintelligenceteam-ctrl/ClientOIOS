// Phase Beta: Revenue Breathing Widget
'use client'

interface RevenueBreathingWidgetProps {
  revenue: number
  mrrTarget?: number
  mrrCurrent?: number
}

export function RevenueBreathingWidget({ revenue, mrrTarget = 50000, mrrCurrent = 0 }: RevenueBreathingWidgetProps) {
  const progress = mrrTarget > 0 ? Math.min((mrrCurrent / mrrTarget) * 100, 100) : 0

  return (
    <div className="panel p-6 relative overflow-hidden group panel-glow">
      {/* Orbit particles */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-2 h-2 rounded-full bg-teal-400/30" style={{ animation: 'orbit-1 8s linear infinite' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-orange-400/20" style={{ animation: 'orbit-2 12s linear infinite' }} />
        <div className="w-1 h-1 rounded-full bg-teal-300/25" style={{ animation: 'orbit-3 6s linear infinite' }} />
      </div>

      <p className="text-sm text-slate-400 mb-2">Monthly Revenue</p>
      <div className="animate-revenue-breathe inline-block">
        <span className="gradient-text text-4xl font-bold font-mono-numbers">
          ${revenue.toLocaleString()}
        </span>
      </div>

      {/* MRR Progress */}
      {mrrTarget > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>MRR Progress</span>
            <span className="font-mono-numbers">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-[rgba(148,163,184,0.06)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-300 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
