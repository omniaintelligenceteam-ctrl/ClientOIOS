'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Phone, Mail, X } from 'lucide-react'
import type { InsightType } from '@/lib/ai/insight-engine'

export interface ActionableAlertData {
  id: string
  icon?: 'alert' | 'phone' | 'mail'
  title: string
  description: string
  type?: InsightType
  onCallNow?: () => void
  onFollowUp?: () => void
}

interface ActionableAlertCardProps {
  alert: ActionableAlertData
  onDismiss?: (id: string) => void
}

const DISMISSED_KEY = 'oios_dismissed_alerts'

function getDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function saveDismissed(ids: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]))
  } catch { /* noop */ }
}

export function isDismissed(id: string): boolean {
  return getDismissed().has(id)
}

const borderColorMap: Record<string, string> = {
  positive: 'border-l-green-500',
  warning:  'border-l-amber-500',
  neutral:  'border-l-slate-500',
  info:     'border-l-teal-500',
}

const IconMap = {
  alert: AlertTriangle,
  phone: Phone,
  mail:  Mail,
}

const iconColorMap: Record<string, string> = {
  positive: 'text-green-400',
  warning:  'text-amber-400',
  neutral:  'text-slate-400',
  info:     'text-teal-400',
}

export function ActionableAlertCard({ alert, onDismiss }: ActionableAlertCardProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isDismissed(alert.id)) {
      setDismissed(true)
      return
    }
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [alert.id])

  function handleDismiss() {
    setVisible(false)
    const ids = getDismissed()
    ids.add(alert.id)
    saveDismissed(ids)
    setTimeout(() => {
      setDismissed(true)
      onDismiss?.(alert.id)
    }, 300)
  }

  if (dismissed) return null

  const AlertIcon = IconMap[alert.icon ?? 'alert']
  const type = alert.type ?? 'warning'
  const borderColor = borderColorMap[type] ?? borderColorMap.warning
  const iconColor   = iconColorMap[type]   ?? iconColorMap.warning

  return (
    <div
      className={`
        bg-white/[0.03] border border-[rgba(148,163,184,0.1)] border-l-2 ${borderColor}
        rounded-xl px-4 py-3.5 flex items-start gap-3
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <AlertIcon className={`h-4 w-4 ${iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-200">{alert.title}</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{alert.description}</p>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-2.5">
          {alert.onCallNow && (
            <button
              onClick={alert.onCallNow}
              className="flex items-center gap-1.5 rounded-lg bg-teal-500/15 border border-teal-500/25 px-3 py-1 text-xs font-medium text-teal-400 hover:bg-teal-500/25 transition-colors"
            >
              <Phone className="h-3 w-3" />
              Call Now
            </button>
          )}
          {alert.onFollowUp && (
            <button
              onClick={alert.onFollowUp}
              className="flex items-center gap-1.5 rounded-lg bg-slate-500/15 border border-slate-500/25 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-slate-500/25 transition-colors"
            >
              <Mail className="h-3 w-3" />
              Follow-up
            </button>
          )}
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 rounded-md p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
        aria-label="Dismiss alert"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
