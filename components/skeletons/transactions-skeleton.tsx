import { Skeleton } from '@/components/ui/skeleton';

export function TransactionsSkeleton() {
  return (
    <div className="w-full animate-fade-in space-y-6">
      {/* Header Skeleton */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex w-full gap-2 md:w-auto">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Skeleton className="h-9 w-32 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>

      {/* Stats Summary Skeleton */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/20 bg-card/60 p-4"
          >
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>

      {/* Transactions List Skeleton */}
      <div className="overflow-hidden rounded-3xl border border-border/20 bg-card/60 shadow-ios-sm">
        <div className="flex items-center justify-between border-b border-border/20 p-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>

        <div className="divide-y divide-border/20">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="group flex items-center justify-between p-4 hover:bg-muted/5"
            >
              <div className="flex flex-1 items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="max-w-[200px] flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>

              <div className="flex hidden items-center gap-6 md:flex">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>

              <div className="ml-4 text-right">
                <Skeleton className="mb-1 ml-auto h-5 w-24" />
                <Skeleton className="ml-auto h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
