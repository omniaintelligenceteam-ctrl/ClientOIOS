'use client'

import { useEffect, useState } from 'react'
import { HardHat } from 'lucide-react'

const STORAGE_KEY = 'oios_field_mode'

interface FieldModeToggleProps {
  onToggle?: (active: boolean) => void
}

export function FieldModeToggle({ onToggle }: FieldModeToggleProps) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const val = stored === 'true'
      setActive(val)
      onToggle?.(val)
    } catch {}
  }, [])  

  function toggle() {
    const next = !active
    setActive(next)
    try { localStorage.setItem(STORAGE_KEY, String(next)) } catch {}
    onToggle?.(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      aria-label={active ? 'Disable Field Mode' : 'Enable Field Mode'}
      className={`flex items-center gap-1.5 h-11 px-3 rounded-xl text-xs font-semibold transition-all select-none ${
        active
          ? 'bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/40 shadow-[0_0_12px_rgba(45,212,191,0.2)]'
          : 'bg-white/[0.05] text-[#64748B] border border-white/[0.06] hover:text-[#94A3B8] hover:bg-white/[0.08]'
      }`}
    >
      <HardHat size={16} strokeWidth={active ? 2.5 : 2} />
      <span className="hidden xs:inline">Field</span>
    </button>
  )
}

/** Hook to read/subscribe to field mode state */
export function useFieldMode(): [boolean, (v: boolean) => void] {
  const [active, setActive] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      setActive(stored === 'true')
    } catch {}

    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setActive(e.newValue === 'true')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  function set(val: boolean) {
    setActive(val)
    try { localStorage.setItem(STORAGE_KEY, String(val)) } catch {}
  }

  return [active, set]
}
