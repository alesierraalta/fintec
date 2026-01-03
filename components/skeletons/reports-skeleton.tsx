import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonStatCard } from "@/components/ui/skeleton-stat-card";

export function ReportsSkeleton() {
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

                <div className="flex justify-center gap-2">
                    <Skeleton className="h-10 w-32 rounded-lg" />
                    <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
            </div>

            {/* Metrics Row Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-card/60 backdrop-blur-xl border border-border/20 rounded-2xl p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </div>
                        <Skeleton className="h-8 w-32 mb-2" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                ))}
            </div>

            {/* Main Chart Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-card/60 backdrop-blur-xl border border-border/20 rounded-3xl p-6 shadow-ios-sm min-h-[400px]">
                    <div className="flex justify-between items-center mb-8">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-8 w-32 rounded-lg" />
                    </div>
                    {/* Chart area */}
                    <div className="flex items-end justify-between h-[300px] gap-2">
                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <Skeleton key={i} className={`w-full rounded-t-lg h-[${Math.floor(Math.random() * 80) + 20}%]`} />
                        ))}
                    </div>
                </div>

                {/* Side Panel Skeleton (Categories/Donut) */}
                <div className="lg:col-span-1 bg-card/60 backdrop-blur-xl border border-border/20 rounded-3xl p-6 shadow-ios-sm">
                    <Skeleton className="h-8 w-40 mb-6" />
                    <div className="flex justify-center py-8">
                        <Skeleton className="h-48 w-48 rounded-full" />
                    </div>
                    <div className="space-y-4 mt-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex justify-between items-center">
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
