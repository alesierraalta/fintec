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
          <div className="p-3 rounded-2xl group-hover:opacity-90 transition-all"
               style={{ background: 'linear-gradient(135deg, rgba(16, 6, 159, 0.1), rgba(6, 182, 212, 0.1))' }}>
            <Icon className="h-6 w-6" style={{ color: '#06b6d4' }} />
          </div>
          <div className={cn(
            'text-sm font-semibold px-3 py-1 rounded-full',
            changeType === 'positive' && 'text-white',
            changeType === 'negative' && 'text-red-600 bg-red-50',
            changeType === 'neutral' && 'text-blue-600 bg-blue-50'
          )}
          style={changeType === 'positive' ? { background: 'linear-gradient(to right, #4ade80, #10b981)' } : 
                changeType === 'neutral' ? { background: 'linear-gradient(to right, #06b6d4, #0891b2)' } : {}}>
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
