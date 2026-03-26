// Phase Gamma: "Target Acquired" Effect
'use client'

import { useState, useEffect } from 'react'

interface TargetAcquiredEffectProps {
  trigger: boolean
  onComplete?: () => void
}

export function TargetAcquiredEffect({ trigger, onComplete }: TargetAcquiredEffectProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (trigger) {
      setShow(true)
      const timer = setTimeout(() => {
        setShow(false)
        onComplete?.()
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [trigger, onComplete])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Teal flash */}
      <div className="absolute inset-0 bg-teal-500/10 animate-target-flash" />

      {/* Particle burst */}
      <div className="absolute inset-0 flex items-center justify-center">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 bg-teal-400 animate-particle-burst"
            style={{
              transform: `rotate(${i * 45}deg) translateX(20px)`,
              animationDelay: `${i * 50}ms`,
              opacity: 0,
            }}
          />
        ))}
      </div>
    </div>
  )
}
