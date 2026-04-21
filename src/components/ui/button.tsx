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
    'premium-button border border-[rgba(23,207,178,0.34)] bg-[linear-gradient(180deg,rgba(23,207,178,0.94)_0%,rgba(18,179,154,0.92)_100%)] text-[#05111f] shadow-[0_14px_30px_rgba(23,207,178,0.28)] hover:shadow-[0_18px_38px_rgba(23,207,178,0.34)]',
  secondary:
    'rounded-xl border border-[rgba(147,162,190,0.24)] bg-[rgba(12,19,33,0.82)] font-medium text-[#c7d4ef] hover:border-[rgba(23,207,178,0.4)] hover:text-[#ebf5ff] transition-colors',
  ghost:
    'rounded-lg font-medium text-[#9fb0cf] hover:text-[#ebf5ff] hover:bg-white/[0.08] transition-colors',
  danger:
    'rounded-xl border border-red-500/50 bg-[linear-gradient(180deg,rgba(239,68,68,0.95)_0%,rgba(220,38,38,0.92)_100%)] font-semibold text-white transition-all active:scale-95',
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
          'inline-flex items-center justify-center whitespace-nowrap outline-none transition-[transform,filter,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-[rgba(23,207,178,0.34)] focus-visible:ring-offset-0',
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
