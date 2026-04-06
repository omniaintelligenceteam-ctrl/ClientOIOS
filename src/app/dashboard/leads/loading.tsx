import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[0,1,2,3,4,5].map(i => <Skeleton key={i} className="h-96 rounded-2xl" />)}
      </div>
    </div>
  )
}
