import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonStatCard } from '@/components/ui/skeleton-stat-card';

export function ReportsSkeleton() {
  const chartBarHeights = [24, 42, 61, 79, 53, 68, 37];

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

        <div className="flex justify-center gap-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/20 bg-card/60 p-4 shadow-sm backdrop-blur-xl"
          >
            <div className="mb-2 flex items-start justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="mb-2 h-8 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Main Chart Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-h-[400px] rounded-3xl border border-border/20 bg-card/60 p-6 shadow-ios-sm backdrop-blur-xl lg:col-span-2">
          <div className="mb-8 flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
          {/* Chart area */}
          <div className="flex h-[300px] items-end justify-between gap-2">
            {chartBarHeights.map((height, i) => (
              <Skeleton
                key={i}
                className={`w-full rounded-t-lg h-[${height}%]`}
              />
            ))}
          </div>
        </div>

        {/* Side Panel Skeleton (Categories/Donut) */}
        <div className="rounded-3xl border border-border/20 bg-card/60 p-6 shadow-ios-sm backdrop-blur-xl lg:col-span-1">
          <Skeleton className="mb-6 h-8 w-40" />
          <div className="flex justify-center py-8">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
          <div className="mt-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
