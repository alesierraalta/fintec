'use client';

import Link from 'next/link';
import { Crown, Sparkles } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { cn } from '@/lib/utils';

interface UpgradeButtonProps {
  isMinimized?: boolean;
}

/**
 * Upgrade button component that displays for free-tier users only.
 * Links to the pricing page and adapts to sidebar state (expanded/minimized).
 */
export function UpgradeButton({ isMinimized = false }: UpgradeButtonProps) {
  const { isPremium, loading } = useSubscription();

  // Only hide for premium users
  if (isPremium || loading) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="p-2">
        <Link
          href="/pricing"
          className={cn(
            'group relative h-12 w-full overflow-hidden rounded-xl',
            'flex items-center justify-center',
            'transition-ios hover:scale-105 active:scale-95',
            'shadow-ios-md hover:shadow-ios-lg'
          )}
          title="Upgrade to Premium"
        >
          {/* Gradient background with animation */}
          <div className="absolute inset-0 animate-gradient bg-gradient-to-br from-purple-600 via-primary to-purple-500 [background-size:200%_200%]" />

          {/* Glow effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/0 via-foreground/5 to-purple-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-20" />

          {/* Icon */}
          <Crown className="relative z-10 h-5 w-5 text-white" />
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Link
        href="/pricing"
        className={cn(
          'group relative flex items-center justify-center space-x-2',
          'w-full overflow-hidden rounded-2xl px-4 py-3',
          'transition-ios hover:scale-105 active:scale-95',
          'shadow-ios-md backdrop-blur-sm hover:shadow-ios-lg'
        )}
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 animate-gradient bg-gradient-to-r from-purple-600 via-primary to-purple-500 [background-size:200%_200%]" />

        {/* Shimmer effect */}
        <div className="absolute inset-0 translate-x-[-200%] bg-gradient-to-r from-transparent via-foreground/10 to-transparent transition-transform duration-1000 group-hover:translate-x-[200%]" />

        {/* Glow border effect on hover */}
        <div className="absolute inset-0 rounded-2xl border-2 border-white/20 transition-colors group-hover:border-white/40" />

        {/* Content */}
        <Sparkles className="relative z-10 h-4 w-4 text-white transition-transform duration-300 group-hover:rotate-12" />
        <span className="relative z-10 text-ios-body font-semibold text-white">
          Upgrade to Premium
        </span>
        <Crown className="relative z-10 h-4 w-4 text-yellow-300 transition-transform duration-300 group-hover:scale-110" />
      </Link>
    </div>
  );
}
