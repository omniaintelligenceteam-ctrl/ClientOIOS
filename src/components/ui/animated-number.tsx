'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

type Format = 'plain' | 'currency' | 'percent' | 'compact'

interface AnimatedNumberProps {
  value: number
  format?: Format
  duration?: number
  className?: string
  /** Currency symbol for format='currency' */
  symbol?: string
  /** Decimal places */
  decimals?: number
  /** Play animation on every value change (not just mount) */
  animate?: boolean
}

function formatValue(val: number, format: Format, symbol: string, decimals: number): string {
  switch (format) {
    case 'currency': {
      if (val >= 1_000_000) {
        return `${symbol}${(val / 1_000_000).toFixed(decimals)}M`
      }
      if (val >= 1_000) {
        return `${symbol}${val.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}`
      }
      return `${symbol}${val.toFixed(decimals)}`
    }
    case 'percent':
      return `${val.toFixed(decimals)}%`
    case 'compact': {
      if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
      if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`
      return String(Math.round(val))
    }
    default:
      return val.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function AnimatedNumber({
  value,
  format = 'plain',
  duration = 1000,
  className,
  symbol = '$',
  decimals = 0,
  animate = true,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0)
  const prevValue = useRef(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  const runAnimation = useCallback(
    (from: number, to: number) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      startRef.current = null

      const step = (timestamp: number) => {
        if (!startRef.current) startRef.current = timestamp
        const elapsed = timestamp - startRef.current
        const progress = Math.min(elapsed / duration, 1)
        const eased = easeOutCubic(progress)
        const current = from + (to - from) * eased
        setDisplay(current)
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          setDisplay(to)
          prevValue.current = to
        }
      }
      rafRef.current = requestAnimationFrame(step)
    },
    [duration]
  )

  useEffect(() => {
    if (animate) {
      runAnimation(prevValue.current, value)
    } else {
      setDisplay(value)
      prevValue.current = value
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, animate, runAnimation])

  return (
    <span className={cn('tabular-nums', className)}>
      {formatValue(display, format, symbol, decimals)}
    </span>
  )
}

/**
 * Animated stat number with optional prefix/suffix
 */
export function AnimatedStat({
  value,
  format = 'plain',
  className,
  ...props
}: AnimatedNumberProps) {
  return (
    <AnimatedNumber
      value={value}
      format={format}
      className={cn(
        'text-3xl font-bold transition-all duration-700 ease-out',
        className
      )}
      {...props}
    />
  )
}

export default AnimatedNumber
