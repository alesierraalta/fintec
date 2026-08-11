'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';
import { cn } from '@/lib/utils';

interface UpgradeButtonProps {
  isMinimized?: boolean;
}

/**
 * Upgrade CTA shown only for verified free-tier, non-owner users.
 * Hidden for owner/admin users (canonical `isOwnerAdmin` from the server
 * payload), paid (base/premium) users, while the tier is still loading, and
 * while eligibility is unresolved (error). The free-tier default is never
 * enough to render it, so it can never flash for an unconfirmed identity.
 */
export function UpgradeButton({ isMinimized = false }: UpgradeButtonProps) {
  const { isFree, isOwnerAdmin, loading, error } = useSubscription();

  // Show only for verified free-tier users: hide for owner/admin, paid
  // (base/premium) users, while loading, and on unresolved (error)
  // eligibility — the free-tier default is never enough to show it.
  if (!isFree || isOwnerAdmin || loading || error) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="p-2">
        <Link
          href="/pricing"
          aria-label="Mejorar a Premium"
          title="Mejorar a Premium"
          className={cn(
            'flex min-h-[44px] w-full items-center justify-center rounded-xl',
            'bg-primary text-primary-foreground shadow-ios-sm',
            'transition-ios hover:bg-primary/90 active:scale-[0.98]',
            'focus-ring'
          )}
        >
          <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Link
        href="/pricing"
        className={cn(
          'flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-3',
          'bg-primary text-ios-body font-semibold text-primary-foreground shadow-ios-sm',
          'transition-ios hover:bg-primary/90 active:scale-[0.98]',
          'focus-ring'
        )}
      >
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        <span>Mejorar a Premium</span>
      </Link>
    </div>
  );
}
