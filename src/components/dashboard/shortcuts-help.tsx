// Phase Delta: Shortcuts help overlay
'use client'

import { useEffect } from 'react'
import { X, Keyboard } from 'lucide-react'
import { SHORTCUTS } from '@/hooks/useKeyboardShortcuts'

interface ShortcutsHelpProps {
  onClose: () => void
}

export function ShortcutsHelp({ onClose }: ShortcutsHelpProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[300]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-2xl border border-[rgba(148,163,184,0.15)] bg-black/[0.8] shadow-2xl shadow-black/60 backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.08)] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
                <Keyboard className="h-4 w-4 text-teal-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#F8FAFC]">Keyboard Shortcuts</h2>
                <p className="text-xs text-slate-500">Power user mode activated</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Shortcuts list */}
          <div className="p-5">
            <div className="space-y-1">
              {SHORTCUTS.map(shortcut => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.03]"
                >
                  <span className="text-sm text-slate-300">{shortcut.description}</span>
                  <kbd className="flex items-center gap-1 rounded-lg border border-[rgba(148,163,184,0.15)] bg-[rgba(148,163,184,0.06)] px-2.5 py-1 text-xs font-mono font-semibold text-slate-300">
                    {shortcut.label}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-[rgba(45,212,191,0.05)] border border-[rgba(45,212,191,0.1)] px-4 py-3">
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-teal-400">Tip:</span> Shortcuts only fire when you&apos;re not typing in an input field.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[rgba(148,163,184,0.08)] px-5 py-3">
            <p className="text-center text-[10px] text-slate-600">Press <kbd className="font-mono">?</kbd> or <kbd className="font-mono">Esc</kbd> to close</p>
          </div>
        </div>
      </div>
    </div>
  )
}
