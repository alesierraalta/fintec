'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  metadata?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  metadata,
  className,
  icon,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-8 space-y-3', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-start gap-3">
            {icon && <div className="mt-1 shrink-0 text-primary">{icon}</div>}
            <h1 className="min-w-0 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {subtitle}
            </p>
          )}
          {metadata && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground/70">
              {metadata}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-xl p-1 pt-0 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
