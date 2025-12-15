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
            'group relative w-full h-12 rounded-xl overflow-hidden',
            'flex items-center justify-center',
            'transition-ios hover:scale-105 active:scale-95',
            'shadow-ios-md hover:shadow-ios-lg'
          )}
          title="Upgrade to Premium"
        >
          {/* Gradient background with animation */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-primary to-purple-500 animate-gradient [background-size:200%_200%]" />
          
          {/* Glow effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/0 via-white/0 to-purple-400/0 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
          
          {/* Icon */}
          <Crown className="relative h-5 w-5 text-white z-10" />
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
          'w-full px-4 py-3 rounded-2xl overflow-hidden',
          'transition-ios hover:scale-105 active:scale-95',
          'shadow-ios-md hover:shadow-ios-lg backdrop-blur-sm'
        )}
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-primary to-purple-500 animate-gradient [background-size:200%_200%]" />
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
        
        {/* Glow border effect on hover */}
        <div className="absolute inset-0 rounded-2xl border-2 border-white/20 group-hover:border-white/40 transition-colors" />
        
        {/* Content */}
        <Sparkles className="relative h-4 w-4 text-white z-10 group-hover:rotate-12 transition-transform duration-300" />
        <span className="relative text-ios-body font-semibold text-white z-10">
          Upgrade to Premium
        </span>
        <Crown className="relative h-4 w-4 text-yellow-300 z-10 group-hover:scale-110 transition-transform duration-300" />
      </Link>
    </div>
  );
}
