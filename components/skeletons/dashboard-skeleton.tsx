import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonStatCard } from '@/components/ui/skeleton-stat-card';

export function DashboardSkeleton() {
  return (
    <div className="w-full animate-fade-in space-y-6 sm:space-y-8">
      {/* Header Skeleton */}
      <div className="py-6 text-center sm:py-8 md:py-10">
        <div className="mx-auto mb-4 inline-flex items-center space-x-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="mb-4 flex justify-center sm:mb-6">
          <Skeleton className="h-10 w-3/4 max-w-lg rounded-xl sm:h-12 md:h-16" />
        </div>

        <div className="mb-6 flex justify-center">
          <Skeleton className="h-4 w-1/2 max-w-sm" />
        </div>

        <div className="flex justify-center">
          <Skeleton className="h-12 w-40 rounded-xl" />
        </div>
      </div>

      {/* Balance Card Skeleton */}
      <div className="rounded-3xl border border-border/20 bg-card/60 p-6 shadow-ios-sm">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="flex flex-col items-center space-y-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-6 w-32" />
        </div>
      </div>

      {/* Summary Cards Grid Skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Recent Transactions Skeleton */}
        <div className="h-full min-h-[400px] rounded-3xl border border-border/20 bg-card/60 p-6 shadow-ios-sm lg:col-span-2 xl:col-span-2">
          <div className="mb-6 flex items-center space-x-2">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-border/10 p-3"
              >
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="h-full rounded-3xl border border-border/20 bg-card/60 p-6 shadow-ios-sm lg:col-span-1 xl:col-span-1">
          <div className="mb-6 flex items-center space-x-2">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
