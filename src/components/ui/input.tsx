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
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7f9d]"
        />
      )}
      <input
        ref={ref}
        className={cn(
          'premium-input h-9 w-full rounded-lg px-3 text-sm outline-none',
          'border-[rgba(147,162,190,0.2)] focus:border-[rgba(23,207,178,0.5)] focus:ring-1 focus:ring-[rgba(23,207,178,0.3)]',
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
        'premium-textarea min-h-[80px] w-full resize-y rounded-lg px-3 py-2 text-sm outline-none',
        'border-[rgba(147,162,190,0.2)] focus:border-[rgba(23,207,178,0.5)] focus:ring-1 focus:ring-[rgba(23,207,178,0.3)]',
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
      className={cn('mb-1.5 block text-xs font-medium text-[#a6b4cf]', className)}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-red-400">*</span>}
    </label>
  )
)

Label.displayName = 'Label'
