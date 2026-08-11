'use client';

import { BadgeCheck, Zap, Lock } from 'lucide-react';
import { SubscriptionTier } from '@/types/subscription';

interface FeatureBadgeProps {
  tier: 'base' | 'premium';
  variant?: 'default' | 'compact' | 'icon-only';
  showLock?: boolean;
}

export function FeatureBadge({
  tier,
  variant = 'default',
  showLock = false,
}: FeatureBadgeProps) {
  const config = {
    base: {
      label: 'Base',
      icon: Zap,
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    },
    premium: {
      label: 'Premium',
      icon: BadgeCheck,
      color: 'bg-primary/10 text-primary border-primary/20',
    },
  };

  const { label, icon: Icon, color } = config[tier];

  if (variant === 'icon-only') {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full border p-1 ${color}`}
      >
        {showLock ? <Lock className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}
      >
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 ${color}`}
    >
      {showLock ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
