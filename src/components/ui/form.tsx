'use client'

import { type ReactNode } from 'react'
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form'
import { Label } from './input'

/* ------------------------------------------------------------------ */
/*  FormField                                                          */
/* ------------------------------------------------------------------ */

interface FormFieldProps<T extends FieldValues> {
  name: Path<T>
  label?: string
  required?: boolean
  control: Control<T>
  render: (props: {
    value: T[Path<T>]
    onChange: (...event: unknown[]) => void
    onBlur: () => void
    error?: string
    ref: React.Ref<HTMLElement>
  }) => ReactNode
  className?: string
}

export function FormField<T extends FieldValues>({
  name,
  label,
  required,
  control,
  render,
  className,
}: FormFieldProps<T>) {
  const {
    field,
    fieldState: { error },
  } = useController({ name, control })

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={name} required={required}>
          {label}
        </Label>
      )}
      {render({
        value: field.value,
        onChange: field.onChange,
        onBlur: field.onBlur,
        error: error?.message,
        ref: field.ref as React.Ref<HTMLElement>,
      })}
      {error?.message && <FormError>{error.message}</FormError>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  FormError                                                          */
/* ------------------------------------------------------------------ */

export function FormError({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-red-400">{children}</p>
}
