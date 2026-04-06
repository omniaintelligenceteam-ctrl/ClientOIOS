'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

/* ------------------------------------------------------------------ */
/*  Style map                                                          */
/* ------------------------------------------------------------------ */

const variantConfig: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; iconClass: string; borderClass: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-green-400',
    borderClass: 'border-green-500/20',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-red-400',
    borderClass: 'border-red-500/20',
  },
  info: {
    icon: Info,
    iconClass: 'text-[#2DD4BF]',
    borderClass: 'border-[#2DD4BF]/20',
  },
}

/* ------------------------------------------------------------------ */
/*  Single toast                                                       */
/* ------------------------------------------------------------------ */

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast
  onDismiss: (id: string) => void
}) {
  const { icon: Icon, iconClass, borderClass } = variantConfig[toast.variant]
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(timerRef.current)
  }, [toast.id, onDismiss])

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border bg-[#111827]/95 backdrop-blur-xl px-4 py-3 shadow-lg',
        'animate-[slideInTop_0.25s_ease-out]',
        borderClass
      )}
    >
      <Icon size={18} className={cn('mt-0.5 shrink-0', iconClass)} />
      <p className="flex-1 text-sm text-slate-200">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="shrink-0 rounded p-0.5 text-slate-500 transition-colors hover:text-slate-300"
      >
        <X size={14} />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((message: string, variant: ToastVariant) => {
    const id = String(++toastId)
    setToasts((prev) => [...prev.slice(-4), { id, message, variant }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value: ToastContextValue = {
    success: useCallback((m: string) => push(m, 'success'), [push]),
    error: useCallback((m: string) => push(m, 'error'), [push]),
    info: useCallback((m: string) => push(m, 'info'), [push]),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div className="pointer-events-auto fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-80">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
