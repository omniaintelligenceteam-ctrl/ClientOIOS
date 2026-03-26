'use client'

import { useRef, useState, type ReactNode } from 'react'

interface SwipeAction {
  label: string
  color: string // bg color class e.g. 'bg-teal-500'
  icon?: ReactNode
  onAction: () => void
}

interface SwipeableCardProps {
  children: ReactNode
  leftAction?: SwipeAction  // swipe right reveals left action (call / primary)
  rightAction?: SwipeAction // swipe left reveals right action (dismiss/snooze)
  className?: string
  threshold?: number // px before action triggers
}

export function SwipeableCard({
  children,
  leftAction,
  rightAction,
  className = '',
  threshold = 80,
}: SwipeableCardProps) {
  const startXRef = useRef<number | null>(null)
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [triggered, setTriggered] = useState<'left' | 'right' | null>(null)

  const MAX_DRAG = 120

  function onTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX
    setIsDragging(true)
    setTriggered(null)
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startXRef.current === null) return
    const delta = e.touches[0].clientX - startXRef.current
    const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, delta))

    // Only allow direction if action exists
    if (clamped > 0 && !leftAction) return
    if (clamped < 0 && !rightAction) return

    setTranslateX(clamped)

    if (clamped >= threshold) setTriggered('left')
    else if (clamped <= -threshold) setTriggered('right')
    else setTriggered(null)
  }

  function onTouchEnd() {
    setIsDragging(false)
    if (triggered === 'left' && leftAction) {
      leftAction.onAction()
    } else if (triggered === 'right' && rightAction) {
      rightAction.onAction()
    }
    // Snap back
    setTranslateX(0)
    setTriggered(null)
    startXRef.current = null
  }

  const showLeft = translateX > 0 && leftAction
  const showRight = translateX < 0 && rightAction
  const progress = Math.abs(translateX) / MAX_DRAG

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* Left action background (swipe right) */}
      {leftAction && (
        <div
          className={`absolute inset-0 flex items-center justify-start pl-6 ${leftAction.color} transition-opacity`}
          style={{ opacity: showLeft ? Math.min(progress * 1.5, 1) : 0 }}
        >
          {leftAction.icon && <span className="text-white mr-2">{leftAction.icon}</span>}
          <span className="text-white font-semibold text-sm">{leftAction.label}</span>
        </div>
      )}

      {/* Right action background (swipe left) */}
      {rightAction && (
        <div
          className={`absolute inset-0 flex items-center justify-end pr-6 ${rightAction.color} transition-opacity`}
          style={{ opacity: showRight ? Math.min(progress * 1.5, 1) : 0 }}
        >
          <span className="text-white font-semibold text-sm">{rightAction.label}</span>
          {rightAction.icon && <span className="text-white ml-2">{rightAction.icon}</span>}
        </div>
      )}

      {/* Card content */}
      <div
        className={`relative ${isDragging ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
