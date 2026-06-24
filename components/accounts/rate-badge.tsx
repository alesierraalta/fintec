'use client';

import { getRateName, type RateSource } from '@/lib/rate-display';

export interface RateBadgeProps {
  source: RateSource;
  value: number;
  currency?: string;
}

export function RateBadge({ source, value, currency = 'VES' }: RateBadgeProps) {
  return (
    <span
      data-testid="rate-badge"
      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
    >
      {getRateName(source)}: {value.toFixed(2)} {currency}
    </span>
  );
}
