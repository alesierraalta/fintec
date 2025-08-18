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
  return (
    <div className={cn(
      'bg-background-tertiary border border-border-primary rounded-3xl p-6 hover:bg-background-elevated transition-all duration-200 hover:scale-105 hover:shadow-lg group cursor-pointer',
      className
    )}>
      <div className="space-y-4">
        {/* Header with icon */}
        <div className="flex items-center justify-between">
          <div className="p-3 bg-accent-primary/10 rounded-2xl group-hover:bg-accent-primary/20 transition-colors">
            <Icon className="h-6 w-6 text-accent-primary" />
          </div>
          <div className={cn(
            'text-sm font-semibold px-3 py-1 rounded-full',
            changeType === 'positive' && 'text-success bg-success/10',
            changeType === 'negative' && 'text-danger bg-danger/10',
            changeType === 'neutral' && 'text-info bg-info/10'
          )}>
            {change}
          </div>
        </div>

        {/* Content */}
        <div>
          <p className="text-sm text-text-muted font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold text-text-primary tracking-tight">{value}</p>
          {description && (
            <p className="text-xs text-text-muted mt-2">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}