// Phase Zeta: Intent Keyword Cloud
'use client'

interface IntentWord {
  word: string
  count: number
  sentiment: 'positive' | 'neutral' | 'negative'
}

interface IntentCloudProps {
  intents: IntentWord[]
}

const SENTIMENT_COLORS = {
  positive: '#22c55e',
  neutral: '#94a3b8',
  negative: '#ef4444',
}

export function IntentCloud({ intents }: IntentCloudProps) {
  if (!intents || intents.length === 0) {
    return <p className="text-xs text-slate-500 text-center py-4">No intent data yet.</p>
  }

  const max = Math.max(...intents.map((i) => i.count))
  const min = Math.min(...intents.map((i) => i.count))

  const getSize = (count: number) => {
    const norm = max === min ? 0.5 : (count - min) / (max - min)
    return 10 + norm * 18 // 10px to 28px
  }

  return (
    <div className="flex flex-wrap gap-2 items-center justify-center py-2">
      {intents.map((intent, i) => {
        const size = getSize(intent.count)
        const color = SENTIMENT_COLORS[intent.sentiment]
        return (
          <span
            key={i}
            className="font-mono transition-transform hover:scale-110 cursor-default"
            style={{
              fontSize: `${size}px`,
              color,
              opacity: 0.7 + (size / 28) * 0.3,
              fontWeight: size > 20 ? 700 : 400,
            }}
            title={`${intent.count} occurrences · ${intent.sentiment}`}
          >
            {intent.word}
          </span>
        )
      })}
    </div>
  )
}
