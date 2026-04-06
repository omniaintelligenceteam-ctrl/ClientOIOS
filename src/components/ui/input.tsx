'use client'

import { forwardRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Input                                                              */
/* ------------------------------------------------------------------ */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon: Icon, error, className, ...props }, ref) => (
    <div className="relative">
      {Icon && (
        <Icon
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]"
        />
      )}
      <input
        ref={ref}
        className={cn(
          'h-9 w-full rounded-lg border bg-[#0B1120] px-3 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors',
          'border-[rgba(148,163,184,0.1)] focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20',
          Icon && 'pl-9',
          error && 'border-red-500/60 focus:border-red-400 focus:ring-red-400/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    </div>
  )
)

Input.displayName = 'Input'

/* ------------------------------------------------------------------ */
/*  Textarea                                                           */
/* ------------------------------------------------------------------ */

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[80px] w-full resize-y rounded-lg border bg-[#0B1120] px-3 py-2 text-sm text-[#F8FAFC] placeholder-[#64748B] outline-none transition-colors',
        'border-[rgba(148,163,184,0.1)] focus:border-[#2DD4BF]/40 focus:ring-1 focus:ring-[#2DD4BF]/20',
        error && 'border-red-500/60 focus:border-red-400 focus:ring-red-400/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
)

Textarea.displayName = 'Textarea'

/* ------------------------------------------------------------------ */
/*  Label                                                              */
/* ------------------------------------------------------------------ */

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ required, children, className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('mb-1.5 block text-xs font-medium text-[#94A3B8]', className)}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-red-400">*</span>}
    </label>
  )
)

Label.displayName = 'Label'
