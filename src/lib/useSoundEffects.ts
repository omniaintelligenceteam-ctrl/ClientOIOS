// Phase Theta: Sound Effects Hook via Web Audio API
'use client'

import { useRef, useCallback, useState } from 'react'

type SoundType = 'lead-acquired' | 'deal-closed' | 'alert-critical' | 'message-sent'

export function useSoundEffects() {
  const ctxRef = useRef<AudioContext | null>(null)
  const [muted, setMuted] = useState(true)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return ctxRef.current
  }, [])

  const play = useCallback((type: SoundType) => {
    if (muted) return
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    const now = ctx.currentTime

    switch (type) {
      case 'lead-acquired':
        osc.frequency.setValueAtTime(880, now)
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.1)
        gain.gain.setValueAtTime(0.15, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
        osc.start(now); osc.stop(now + 0.25)
        break

      case 'deal-closed':
        osc.type = 'sine'
        osc.frequency.setValueAtTime(523, now)
        osc.frequency.setValueAtTime(659, now + 0.1)
        osc.frequency.setValueAtTime(784, now + 0.2)
        gain.gain.setValueAtTime(0.12, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
        osc.start(now); osc.stop(now + 0.45)
        break

      case 'alert-critical':
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(220, now)
        osc.frequency.setValueAtTime(180, now + 0.15)
        gain.gain.setValueAtTime(0.1, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
        osc.start(now); osc.stop(now + 0.3)
        break

      case 'message-sent':
        osc.type = 'sine'
        osc.frequency.setValueAtTime(660, now)
        gain.gain.setValueAtTime(0.08, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
        osc.start(now); osc.stop(now + 0.08)
        break
    }
  }, [muted, getCtx])

  const toggle = useCallback(() => setMuted((m) => !m), [])

  return { play, muted, toggle }
}
