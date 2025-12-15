import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonStatCard } from "@/components/ui/skeleton-stat-card";

export function AccountsSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in w-full">
      {/* Header Skeleton */}
      <div className="text-center py-6 sm:py-8 md:py-10">
        <div className="inline-flex items-center space-x-3 mb-4 sm:mb-6 justify-center">
          <Skeleton className="w-3 h-3 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        
        <div className="flex justify-center mb-6 sm:mb-8">
          <Skeleton className="h-10 sm:h-12 md:h-14 w-64 rounded-xl" />
        </div>
        
        <div className="space-y-3 mb-6 flex flex-col items-center">
          <Skeleton className="h-4 w-full max-w-lg" />
          
          {/* Quick Stats Badges */}
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-32 rounded-full" />
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex justify-center gap-4 mb-4">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:gap-8 w-full">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Accounts List Skeleton */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/20 rounded-3xl overflow-hidden shadow-ios-sm w-full">
        <div className="p-6 border-b border-border/20">
          <div className="flex items-center space-x-2">
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
        
        <div className="divide-y divide-border/20">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 md:space-x-4 flex-1">
                  <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32 sm:w-48" />
                    <div className="flex gap-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right space-y-1">
                    <Skeleton className="h-5 w-24 ml-auto" />
                    <Skeleton className="h-3 w-20 ml-auto" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Exchange Rates Skeleton */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/20 rounded-3xl p-6 shadow-ios-sm w-full">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="h-8 w-48" />
          </div>
          <Skeleton className="h-6 w-24 rounded-xl" />
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Skeleton className="h-24 rounded-2xl" />
             <Skeleton className="h-24 rounded-2xl" />
          </div>
          <div className="flex justify-center">
            <Skeleton className="h-12 w-full md:w-64 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
