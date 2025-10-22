import { cn } from '@/lib/utils';

interface SkeletonStatCardProps {
  className?: string;
}

export function SkeletonStatCard({ className }: SkeletonStatCardProps) {
  return (
    <div className={cn(
      'bg-card/60 backdrop-blur-xl border border-border/20 rounded-3xl p-6 shadow-ios-sm',
      className
    )}>
      <div className="space-y-4">
        {/* iOS-style Header with skeleton */}
        <div className="flex items-center justify-between">
          <div className="p-3 rounded-2xl border backdrop-blur-sm bg-primary/10 border-primary/20">
            <div className="h-6 w-6 bg-primary/20 rounded animate-pulse"></div>
          </div>
          <div className="h-8 w-16 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full animate-pulse"></div>
        </div>

        {/* iOS-style Content */}
        <div>
          <div className="h-4 w-24 bg-muted-foreground/20 rounded animate-pulse mb-2"></div>
          <div className="h-8 w-32 bg-muted-foreground/30 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
