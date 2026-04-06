'use client'

import { DashboardError } from '@/components/ui/error-boundary'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="bg-[#0B1120]">
        <DashboardError error={error} reset={reset} />
      </body>
    </html>
  )
}
