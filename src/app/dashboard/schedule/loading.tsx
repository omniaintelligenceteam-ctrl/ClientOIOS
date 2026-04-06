import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>
      <Skeleton className="h-28 rounded-2xl" />
      <div className="space-y-2">
        {[0,1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
      </div>
    </div>
  )
}
