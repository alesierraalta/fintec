'use client';

import { Crown, Zap, Lock } from 'lucide-react';
import { SubscriptionTier } from '@/types/subscription';

interface FeatureBadgeProps {
  tier: 'base' | 'premium';
  variant?: 'default' | 'compact' | 'icon-only';
  showLock?: boolean;
}

export function FeatureBadge({ tier, variant = 'default', showLock = false }: FeatureBadgeProps) {
  const config = {
    base: {
      label: 'Base',
      icon: Zap,
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    },
    premium: {
      label: 'Premium',
      icon: Crown,
      color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    },
  };

  const { label, icon: Icon, color } = config[tier];

  if (variant === 'icon-only') {
    return (
      <div className={`inline-flex items-center justify-center p-1 rounded-full border ${color}`}>
        {showLock ? <Lock className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${color}`}>
      {showLock ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

