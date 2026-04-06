import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <Skeleton className="h-10 w-48 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="space-y-2">
        {[0,1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    </div>
  )
}
