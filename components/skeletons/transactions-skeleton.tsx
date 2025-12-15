import { Skeleton } from "@/components/ui/skeleton";

export function TransactionsSkeleton() {
  return (
    <div className="space-y-6 w-full animate-fade-in">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Skeleton className="h-9 w-32 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>

      {/* Stats Summary Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card/60 border border-border/20 rounded-2xl p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>

      {/* Transactions List Skeleton */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/20 rounded-3xl overflow-hidden shadow-ios-sm">
        <div className="p-4 border-b border-border/20 flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        
        <div className="divide-y divide-border/20">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between group hover:bg-muted/5">
              <div className="flex items-center gap-4 flex-1">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1 max-w-[200px]">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              
              <div className="flex items-center gap-6 hidden md:flex">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>

              <div className="text-right ml-4">
                <Skeleton className="h-5 w-24 ml-auto mb-1" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
