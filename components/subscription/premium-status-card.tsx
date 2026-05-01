'use client';

import { Crown, Sparkles } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { cn } from '@/lib/utils';

interface PremiumStatusCardProps {
  isMinimized?: boolean;
}

/**
 * * Premium status card component that displays for premium users only.
 * * Shows a premium badge or AI credits summary.
 * * Adapts to sidebar state (expanded/minimized).
 */
export function PremiumStatusCard({
  isMinimized = false,
}: PremiumStatusCardProps) {
  const { isPremium, tier, loading } = useSubscription();

  // * Only show for premium users
  if (!isPremium || loading) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="p-2">
        <div
          className={cn(
            'relative h-12 w-full overflow-hidden rounded-xl',
            'flex items-center justify-center',
            'shadow-ios-sm'
          )}
          title="Premium Active"
        >
          {/* * Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-yellow-500/20 to-amber-600/20" />

          {/* * Border glow */}
          <div className="absolute inset-0 rounded-xl border border-amber-400/30" />

          {/* * Icon */}
          <Crown className="relative z-10 h-5 w-5 text-amber-400 drop-shadow-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div
        className={cn(
          'relative flex items-center justify-between',
          'w-full overflow-hidden rounded-2xl px-4 py-3',
          'shadow-ios-sm backdrop-blur-sm'
        )}
      >
        {/* * Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-600/10" />

        {/* * Border glow effect */}
        <div className="absolute inset-0 rounded-2xl border border-amber-400/20" />

        {/* * Content */}
        <div className="relative z-10 flex items-center space-x-2">
          <Crown className="h-4 w-4 text-amber-400 drop-shadow-md" />
          <span className="text-ios-caption font-medium text-foreground">
            Premium Activo
          </span>
        </div>

        <Sparkles className="relative z-10 h-4 w-4 text-amber-300/70" />
      </div>
    </div>
  );
}
