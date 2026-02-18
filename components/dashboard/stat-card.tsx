import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  description?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  description,
  className,
}: StatCardProps) {
  const getIconColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-primary';
      case 'negative':
        return 'text-neutral-600 dark:text-neutral-400';
      default:
        return 'text-primary';
    }
  };

  const getIconBg = () => {
    switch (changeType) {
      case 'positive':
        return 'bg-primary/10 border-primary/20';
      case 'negative':
        return 'bg-neutral-500/10 border-neutral-500/20 dark:bg-neutral-400/10 dark:border-neutral-400/20';
      default:
        return 'bg-primary/10 border-primary/20';
    }
  };

  return (
    <div
      className={cn(
        'transition-ios group cursor-pointer rounded-3xl border border-border/20 bg-card/60 p-6 shadow-ios-sm backdrop-blur-xl hover:scale-[1.02] hover:bg-card/80 hover:shadow-ios-lg',
        className
      )}
    >
      <div className="space-y-4">
        {/* iOS-style Header with icon */}
        <div className="flex items-center justify-between">
          <div
            className={cn(
              'transition-ios rounded-2xl border p-3 backdrop-blur-sm group-hover:scale-105',
              getIconBg()
            )}
          >
            <Icon className={cn('h-6 w-6', getIconColor())} />
          </div>
          <div
            className={cn(
              'transition-ios rounded-full px-3 py-1.5 text-ios-caption font-semibold backdrop-blur-sm',
              changeType === 'positive' &&
                'bg-gradient-to-r from-primary to-primary/80 text-white shadow-ios-sm',
              changeType === 'negative' &&
                'border border-neutral-500/20 bg-neutral-500/10 text-neutral-600 dark:border-neutral-400/20 dark:bg-neutral-400/10 dark:text-neutral-400',
              changeType === 'neutral' &&
                'bg-gradient-to-r from-primary to-primary/80 text-white shadow-ios-sm'
            )}
          >
            {change}
          </div>
        </div>

        {/* iOS-style Content */}
        <div>
          <p className="mb-1 text-ios-caption font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="text-ios-title font-bold tracking-tight text-foreground">
            {value}
          </p>
          {description && (
            <p className="mt-2 text-ios-caption text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
