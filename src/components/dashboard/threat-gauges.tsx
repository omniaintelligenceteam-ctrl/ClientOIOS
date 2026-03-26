// Phase Beta: Threat Level Monitors
'use client'

interface GaugeProps {
  label: string
  value: number // 0-100
}

function getGaugeColor(value: number): string {
  if (value < 40) return '#22c55e'
  if (value < 60) return '#eab308'
  if (value < 80) return '#f97316'
  return '#ef4444'
}

function ThreatGauge({ label, value }: GaugeProps) {
  const color = getGaugeColor(value)
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const arc = circumference * 0.75 // 270 degree arc
  const offset = arc - (arc * value) / 100

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-[135deg]">
          {/* Background arc */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="rgba(148,163,184,0.1)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
          />
          {/* Value arc */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono-numbers text-lg font-bold" style={{ color }}>{value}</span>
        </div>
      </div>
      <span className="text-xs text-slate-400 font-medium">{label}</span>
    </div>
  )
}

interface ThreatGaugesProps {
  pipelineRisk?: number
  revenueRisk?: number
  operationalRisk?: number
}

export function ThreatGauges({ pipelineRisk = 35, revenueRisk = 22, operationalRisk = 15 }: ThreatGaugesProps) {
  return (
    <div className="panel p-4 panel-glow">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4 text-center">Threat Monitors</p>
      <div className="flex items-center justify-around">
        <ThreatGauge label="Pipeline" value={pipelineRisk} />
        <ThreatGauge label="Revenue" value={revenueRisk} />
        <ThreatGauge label="Operations" value={operationalRisk} />
      </div>
    </div>
  )
}
