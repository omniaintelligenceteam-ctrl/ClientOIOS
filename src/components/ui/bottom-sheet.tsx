'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  /** Max height as a tailwind/CSS value, default '90vh' */
  maxHeight?: string
  className?: string
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  maxHeight = '90vh',
  className = '',
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number | null>(null)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setDragY(0)
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  function onTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY
    setIsDragging(true)
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startYRef.current === null) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta < 0) return // no pull up past start
    setDragY(delta)
  }

  function onTouchEnd() {
    setIsDragging(false)
    if (dragY > 100) {
      onClose()
    } else {
      setDragY(0)
    }
    startYRef.current = null
  }

  if (!isOpen) return null

  const translateY = dragY > 0 ? dragY : 0
  const backdropOpacity = dragY > 0 ? Math.max(0, 1 - dragY / 300) : 1

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        style={{ opacity: backdropOpacity }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 bg-[#111827] border-t border-[rgba(148,163,184,0.15)] rounded-t-3xl overflow-hidden ${isDragging ? '' : 'transition-transform duration-300 ease-out'} ${className}`}
        style={{
          maxHeight,
          transform: `translateY(${translateY}px)`,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Drag handle */}
        <div
          className="flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-10 h-1 rounded-full bg-[rgba(148,163,184,0.3)]" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pb-3 border-b border-[rgba(148,163,184,0.1)]">
            <h3 className="text-[#F8FAFC] font-semibold text-base">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-[#64748B] hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: `calc(${maxHeight} - 80px)` }}>
          {children}
        </div>
      </div>
    </div>
  )
}
