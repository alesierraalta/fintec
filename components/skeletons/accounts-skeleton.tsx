import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonStatCard } from '@/components/ui/skeleton-stat-card';

export function AccountsSkeleton() {
  return (
    <div className="w-full animate-fade-in space-y-8">
      {/* Header Skeleton */}
      <div className="py-6 text-center sm:py-8 md:py-10">
        <div className="mb-4 inline-flex items-center justify-center space-x-3 sm:mb-6">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="mb-6 flex justify-center sm:mb-8">
          <Skeleton className="h-10 w-64 rounded-xl sm:h-12 md:h-14" />
        </div>

        <div className="mb-6 flex flex-col items-center space-y-3">
          <Skeleton className="h-4 w-full max-w-lg" />

          {/* Quick Stats Badges */}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-32 rounded-full" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-4 flex justify-center gap-4">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:gap-8">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Accounts List Skeleton */}
      <div className="w-full overflow-hidden rounded-3xl border border-border/20 bg-card/60 shadow-ios-sm">
        <div className="border-b border-border/20 p-6">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-8 w-48" />
          </div>
        </div>

        <div className="divide-y divide-border/20">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-1 items-center space-x-3 md:space-x-4">
                  <Skeleton className="h-10 w-10 rounded-2xl sm:h-12 sm:w-12" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32 sm:w-48" />
                    <div className="flex gap-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="space-y-1 text-right">
                    <Skeleton className="ml-auto h-5 w-24" />
                    <Skeleton className="ml-auto h-3 w-20" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Exchange Rates Skeleton */}
      <div className="w-full rounded-3xl border border-border/20 bg-card/60 p-6 shadow-ios-sm">
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-6 w-24 rounded-xl" />
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <div className="flex justify-center">
            <Skeleton className="h-12 w-full rounded-2xl md:w-64" />
          </div>
        </div>
      </div>
    </div>
  );
}
