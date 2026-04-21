// Phase Delta: Global keyboard shortcuts hook
'use client'

import { useEffect, useCallback } from 'react'

export interface KeyboardShortcut {
  key: string
  label: string
  description: string
}

export const SHORTCUTS: KeyboardShortcut[] = [
  { key: 'N', label: 'N', description: 'New Lead' },
  { key: 'C', label: 'C', description: 'Log Call' },
  { key: 'S', label: 'S', description: 'Schedule' },
  { key: '/', label: '/', description: 'Focus Search' },
  { key: '?', label: '?', description: 'Show Shortcuts' },
  { key: 'Cmd+K', label: 'Cmd+K / Ctrl+K', description: 'Command Palette' },
]

interface UseKeyboardShortcutsOptions {
  onNewLead?: () => void
  onLogCall?: () => void
  onSchedule?: () => void
  onFocusSearch?: () => void
  onShowHelp?: () => void
}

function isInInput(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    (el as HTMLElement).isContentEditable
  )
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  const { onNewLead, onLogCall, onSchedule, onFocusSearch, onShowHelp } = options

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if modifier keys (except for /, ? which need shift)
    if (e.metaKey || e.ctrlKey || e.altKey) return

    // Skip if typing in an input/textarea
    if (isInInput(document.activeElement)) return

    switch (e.key) {
      case 'n':
      case 'N':
        e.preventDefault()
        onNewLead?.()
        break
      case 'c':
      case 'C':
        e.preventDefault()
        onLogCall?.()
        break
      case 's':
      case 'S':
        e.preventDefault()
        onSchedule?.()
        break
      case '/':
        e.preventDefault()
        onFocusSearch?.()
        break
      case '?':
        e.preventDefault()
        onShowHelp?.()
        break
    }
  }, [onNewLead, onLogCall, onSchedule, onFocusSearch, onShowHelp])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

