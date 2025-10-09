'use client';

import { AlertTriangle, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { formatLimit } from '@/lib/subscriptions/limits';

interface UsageIndicatorProps {
  label: string;
  current: number;
  limit: number | 'unlimited';
  unit?: string;
  className?: string;
}

export function UsageIndicator({ 
  label, 
  current, 
  limit, 
  unit = '',
  className = '' 
}: UsageIndicatorProps) {
  const isUnlimited = limit === 'unlimited';
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isApproaching = percentage >= 80 && percentage < 100;
  const isAtLimit = percentage >= 100;

  const getColor = () => {
    if (isUnlimited) return 'bg-primary';
    if (isAtLimit) return 'bg-destructive';
    if (isApproaching) return 'bg-orange-500';
    return 'bg-primary';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${isAtLimit ? 'text-destructive' : isApproaching ? 'text-orange-500' : ''}`}>
            {current} {unit}
          </span>
          <span className="text-muted-foreground">
            / {formatLimit(limit)} {unit}
          </span>
          {(isApproaching || isAtLimit) && (
            <AlertTriangle className={`h-4 w-4 ${isAtLimit ? 'text-destructive' : 'text-orange-500'}`} />
          )}
        </div>
      </div>

      {!isUnlimited && (
        <div className="space-y-1">
          <Progress value={percentage} className="h-2" indicatorClassName={getColor()} />
          <p className="text-xs text-muted-foreground">
            {isAtLimit ? (
              'Has alcanzado tu límite mensual'
            ) : isApproaching ? (
              `${Math.round(percentage)}% utilizado - Considera actualizar tu plan`
            ) : (
              `${Math.round(percentage)}% utilizado`
            )}
          </p>
        </div>
      )}

      {isUnlimited && (
        <div className="flex items-center gap-1 text-xs text-primary">
          <TrendingUp className="h-3 w-3" />
          <span>Ilimitado</span>
        </div>
      )}
    </div>
  );
}

