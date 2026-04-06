'use client'

import { DashboardError } from '@/components/ui/error-boundary'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <DashboardError error={error} reset={reset} />
}
