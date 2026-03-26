// Phase Delta: ContextMenu component
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface ContextMenuItem {
  id: string
  label: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  divider?: boolean
}

interface ContextMenuPosition {
  x: number
  y: number
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  children: React.ReactNode
  className?: string
}

interface MenuState {
  position: ContextMenuPosition
  visible: boolean
}

export function ContextMenu({ items, children, className = '' }: ContextMenuProps) {
  const [menu, setMenu] = useState<MenuState>({ position: { x: 0, y: 0 }, visible: false })
  const [focusIdx, setFocusIdx] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    setMenu(prev => ({ ...prev, visible: false }))
    setFocusIdx(0)
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Calculate position, clamped to viewport
    const x = Math.min(e.clientX, window.innerWidth - 220)
    const y = Math.min(e.clientY, window.innerHeight - (items.length * 40 + 20))

    setMenu({ position: { x, y }, visible: true })
    setFocusIdx(0)
  }, [items.length])

  // Close on outside click
  useEffect(() => {
    if (!menu.visible) return

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close()
      }
    }
    const handleScroll = () => close()
    const handleContextClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close()
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('scroll', handleScroll, true)
    document.addEventListener('contextmenu', handleContextClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('scroll', handleScroll, true)
      document.removeEventListener('contextmenu', handleContextClick)
    }
  }, [menu.visible, close])

  // Keyboard nav
  useEffect(() => {
    if (!menu.visible) return

    const activeItems = items.filter(i => !i.divider && !i.disabled)

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusIdx(i => {
          let next = i + 1
          while (next < items.length && (items[next].divider || items[next].disabled)) next++
          return next < items.length ? next : i
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusIdx(i => {
          let prev = i - 1
          while (prev >= 0 && (items[prev].divider || items[prev].disabled)) prev--
          return prev >= 0 ? prev : i
        })
      } else if (e.key === 'Enter') {
        const item = items[focusIdx]
        if (item && !item.divider && !item.disabled) {
          item.onClick()
          close()
        }
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [menu.visible, focusIdx, items, close])

  // Focus menu on open
  useEffect(() => {
    if (menu.visible) {
      menuRef.current?.focus()
    }
  }, [menu.visible])

  return (
    <div ref={containerRef} className={`relative ${className}`} onContextMenu={handleContextMenu}>
      {children}

      {menu.visible && (
        <div
          ref={menuRef}
          tabIndex={-1}
          className="context-menu fixed z-[400] min-w-[200px] overflow-hidden rounded-xl border border-[rgba(148,163,184,0.12)] bg-black/[0.8] shadow-2xl shadow-black/60 backdrop-blur-xl outline-none"
          style={{ left: menu.position.x, top: menu.position.y }}
        >
          <div className="py-1.5">
            {items.map((item, idx) => {
              if (item.divider) {
                return (
                  <div
                    key={`divider-${idx}`}
                    className="my-1 border-t border-[rgba(148,163,184,0.08)]"
                  />
                )
              }

              const Icon = item.icon
              const isFocused = idx === focusIdx

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!item.disabled) {
                      item.onClick()
                      close()
                    }
                  }}
                  onMouseEnter={() => setFocusIdx(idx)}
                  disabled={item.disabled}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    item.danger
                      ? isFocused
                        ? 'bg-red-500/15 text-red-400'
                        : 'text-red-400 hover:bg-red-500/10'
                      : isFocused
                        ? 'bg-[rgba(255,255,255,0.05)] text-[#F8FAFC]'
                        : 'text-slate-300 hover:bg-[rgba(255,255,255,0.03)]'
                  }`}
                >
                  {Icon && (
                    <Icon
                      size={14}
                      className={item.danger ? 'text-red-400' : isFocused ? 'text-white' : 'text-slate-400'}
                    />
                  )}
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
