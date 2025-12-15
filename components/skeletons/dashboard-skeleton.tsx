import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonStatCard } from "@/components/ui/skeleton-stat-card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in w-full">
      {/* Header Skeleton */}
      <div className="text-center py-6 sm:py-8 md:py-10">
        <div className="inline-flex items-center space-x-2 mb-4 mx-auto">
          <Skeleton className="w-3 h-3 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        
        <div className="flex justify-center mb-4 sm:mb-6">
          <Skeleton className="h-10 sm:h-12 md:h-16 w-3/4 max-w-lg rounded-xl" />
        </div>
        
        <div className="flex justify-center mb-6">
          <Skeleton className="h-4 w-1/2 max-w-sm" />
        </div>
        
        <div className="flex justify-center">
          <Skeleton className="h-12 w-40 rounded-xl" />
        </div>
      </div>

      {/* Balance Card Skeleton */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/20 rounded-3xl p-6 shadow-ios-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <Skeleton className="w-2 h-2 rounded-full" />
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Recent Transactions Skeleton */}
        <div className="lg:col-span-2 xl:col-span-2 bg-card/60 backdrop-blur-xl border border-border/20 rounded-3xl p-6 shadow-ios-sm h-full min-h-[400px]">
          <div className="flex items-center space-x-2 mb-6">
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border/10">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="lg:col-span-1 xl:col-span-1 bg-card/60 backdrop-blur-xl border border-border/20 rounded-3xl p-6 shadow-ios-sm h-full">
          <div className="flex items-center space-x-2 mb-6">
            <Skeleton className="w-2 h-2 rounded-full" />
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
