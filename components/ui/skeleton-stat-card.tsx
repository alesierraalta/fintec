import { cn } from '@/lib/utils';

interface SkeletonStatCardProps {
  className?: string;
}

export function SkeletonStatCard({ className }: SkeletonStatCardProps) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-border/20 bg-card/60 p-6 shadow-ios-sm',
        className
      )}
    >
      <div className="space-y-4">
        {/* iOS-style Header with skeleton */}
        <div className="flex items-center justify-between">
          <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3">
            <div className="h-6 w-6 animate-pulse rounded bg-primary/20"></div>
          </div>
          <div className="h-8 w-16 animate-pulse rounded-full bg-gradient-to-r from-primary/20 to-primary/10"></div>
        </div>

        {/* iOS-style Content */}
        <div>
          <div className="mb-2 h-4 w-24 animate-pulse rounded bg-muted-foreground/20"></div>
          <div className="h-8 w-32 animate-pulse rounded bg-muted-foreground/30"></div>
        </div>
      </div>
    </div>
  );
}
