'use client';

import { BadgeCheck } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { cn } from '@/lib/utils';

interface PremiumStatusCardProps {
  isMinimized?: boolean;
  isCompact?: boolean;
}

/**
 * Premium status card that displays for premium users only.
 * Shows a restrained badge using the shared token language.
 * Adapts to sidebar state (expanded/minimized).
 */
export function PremiumStatusCard({
  isMinimized = false,
  isCompact = false,
}: PremiumStatusCardProps) {
  const { isPremium, loading } = useSubscription();

  // Only show for premium users
  if (!isPremium || loading) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="p-2">
        <div
          className={cn(
            'flex min-h-[44px] w-full items-center justify-center rounded-xl',
            'border border-primary/20 bg-primary/10 shadow-ios-sm'
          )}
          title="Premium Activo"
        >
          <BadgeCheck className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (isCompact) {
    return (
      <div className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 shadow-ios-sm" aria-label="Premium Activo">
        <BadgeCheck className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-xs font-semibold text-foreground">Premium Activo</span>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div
        className={cn(
          'flex items-center justify-between',
          'w-full rounded-2xl border border-primary/20 px-4 py-3',
          'bg-primary/10 shadow-ios-sm'
        )}
      >
        <div className="flex items-center space-x-2">
          <BadgeCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-ios-caption font-medium text-foreground">
            Premium Activo
          </span>
        </div>
      </div>
    </div>
  );
}
