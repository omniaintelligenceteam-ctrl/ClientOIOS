'use client'

import { forwardRef } from 'react'
import { Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: LucideIcon
  iconRight?: LucideIcon
}

/* ------------------------------------------------------------------ */
/*  Style maps                                                         */
/* ------------------------------------------------------------------ */

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'rounded-xl bg-[#2DD4BF] hover:bg-[#5EEAD4] font-semibold text-[#0B1120] shadow-lg shadow-[#2DD4BF]/20 transition-all active:scale-95',
  secondary:
    'rounded-xl border border-[rgba(148,163,184,0.1)] bg-[#0B1120] font-medium text-slate-300 hover:border-[#2DD4BF]/40 hover:text-[#2DD4BF] transition-colors',
  ghost:
    'rounded-lg font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors',
  danger:
    'rounded-xl bg-red-500/90 hover:bg-red-400 font-semibold text-white transition-colors active:scale-95',
}

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-base gap-2.5',
}

const iconSizes: Record<NonNullable<ButtonProps['size']>, number> = {
  sm: 14,
  md: 16,
  lg: 18,
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon: Icon,
      iconRight: IconRight,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading
    const iconSize = iconSizes[size]

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap',
          variantStyles[variant],
          sizeStyles[size],
          isDisabled && 'pointer-events-none opacity-50',
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 size={iconSize} className="animate-spin" />
        ) : Icon ? (
          <Icon size={iconSize} />
        ) : null}
        {children}
        {!loading && IconRight && <IconRight size={iconSize} />}
      </button>
    )
  }
)

Button.displayName = 'Button'
