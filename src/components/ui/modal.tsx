'use client'

import { useEffect, useRef, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ModalProps {
  open: boolean
  onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: ReactNode
  className?: string
}

interface ModalHeaderProps {
  children: ReactNode
  icon?: ReactNode
  onClose?: () => void
  className?: string
}

interface ModalSectionProps {
  children: ReactNode
  className?: string
}

/* ------------------------------------------------------------------ */
/*  Size map                                                           */
/* ------------------------------------------------------------------ */

const sizeMap: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-4xl',
}

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

export function Modal({ open, onClose, size = 'md', children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  // trap focus
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onClose]
  )

  // manage focus + body scroll
  useEffect(() => {
    if (!open) return

    previousFocus.current = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    // auto-focus first focusable
    requestAnimationFrame(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      el?.focus()
    })

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus.current?.focus()
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full rounded-2xl border border-white/[0.06] bg-[#111827]/95 backdrop-blur-xl shadow-2xl',
          'animate-[slideInTop_0.2s_ease-out]',
          'max-h-[85vh] flex flex-col',
          sizeMap[size],
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */

export function ModalHeader({ children, icon, onClose, className }: ModalHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b border-white/[0.06] px-6 py-4',
        className
      )}
    >
      {icon}
      <h2 className="flex-1 text-base font-semibold text-[#F8FAFC]">{children}</h2>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
        >
          <X size={18} />
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Body                                                               */
/* ------------------------------------------------------------------ */

export function ModalBody({ children, className }: ModalSectionProps) {
  return (
    <div className={cn('flex-1 overflow-y-auto px-6 py-4', className)}>{children}</div>
  )
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */

export function ModalFooter({ children, className }: ModalSectionProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 border-t border-white/[0.06] px-6 py-4',
        className
      )}
    >
      {children}
    </div>
  )
}

// compound namespace
export const ModalNS = Object.assign(Modal, {
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
})
