import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Trend {
  percentage: number;
  direction: 'up' | 'down' | 'stable';
  period: string;
}

interface TrendIndicatorProps {
  trend?: Trend;
  label: string;
  className?: string;
}

export function TrendIndicator({ trend, label, className }: TrendIndicatorProps) {
  // Skeleton / Loading state
  if (!trend) {
    return (
      <div className={cn("flex flex-col items-center p-2 rounded-lg bg-secondary/30 animate-pulse", className)}>
        <div className="h-3 w-6 bg-muted rounded mb-1"></div>
        <div className="h-4 w-12 bg-muted rounded"></div>
      </div>
    );
  }

  const isUp = trend.direction === 'up';
  const isDown = trend.direction === 'down';
  const isStable = trend.direction === 'stable';

  return (
    <div className={cn("flex flex-col items-center p-2 rounded-lg bg-secondary/50", className)}>
      <span className="text-xs text-muted-foreground font-medium mb-1">{label}</span>
      <div className="flex items-center gap-1">
        {isUp && <ArrowUp className="w-3 h-3 text-green-500" />}
        {isDown && <ArrowDown className="w-3 h-3 text-red-500" />}
        {isStable && <Minus className="w-3 h-3 text-muted-foreground" />}
        
        <span className={cn(
          "text-sm font-bold",
          isUp && "text-green-500",
          isDown && "text-red-500",
          isStable && "text-muted-foreground"
        )}>
          {trend.percentage.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}
