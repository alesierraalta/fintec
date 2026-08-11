'use client';

import { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex min-h-[400px] flex-col items-center justify-center p-12 text-center',
        className
      )}
    >
      <div className="relative mb-6 rounded-full bg-muted/10 p-6">
        <div className="absolute inset-0 animate-pulse rounded-full bg-primary/5" />
        {icon || <span className="text-4xl">📭</span>}
      </div>

      <h3 className="mb-3 max-w-lg text-balance text-xl font-semibold text-foreground sm:text-2xl">
        {title}
      </h3>

      <p className="mx-auto mb-8 max-w-sm text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
        {description}
      </p>

      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="focus-ring min-h-[44px] rounded-2xl bg-primary px-8 py-3.5 font-medium text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 active:scale-[0.98]"
        >
          <div className="relative flex items-center space-x-2">
            <Plus className="h-5 w-5" aria-hidden="true" />
            <span>{actionLabel}</span>
          </div>
        </button>
      )}
    </motion.div>
  );
}
