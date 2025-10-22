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
  className 
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
    <div className={cn(
      'bg-card/60 backdrop-blur-xl border border-border/20 rounded-3xl p-6 hover:bg-card/80 transition-ios hover:scale-[1.02] hover:shadow-ios-lg group cursor-pointer shadow-ios-sm',
      className
    )}>
      <div className="space-y-4">
        {/* iOS-style Header with icon */}
        <div className="flex items-center justify-between">
          <div className={cn(
            'p-3 rounded-2xl border backdrop-blur-sm group-hover:scale-105 transition-ios',
            getIconBg()
          )}>
            <Icon className={cn('h-6 w-6', getIconColor())} />
          </div>
          <div className={cn(
            'text-ios-caption font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm transition-ios',
            changeType === 'positive' && 'text-white bg-gradient-to-r from-primary to-primary/80 shadow-elegant',
            changeType === 'negative' && 'text-neutral-600 dark:text-neutral-400 bg-neutral-500/10 dark:bg-neutral-400/10 border border-neutral-500/20 dark:border-neutral-400/20',
            changeType === 'neutral' && 'text-white bg-gradient-to-r from-primary to-primary/80 shadow-elegant'
          )}>
            {change}
          </div>
        </div>

        {/* iOS-style Content */}
        <div>
          <p className="text-ios-caption text-muted-foreground font-medium mb-1 uppercase tracking-wide">{title}</p>
          <p className="text-ios-title font-bold text-foreground tracking-tight">{value}</p>
          {description && (
            <p className="text-ios-caption text-muted-foreground mt-2">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
