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
    <div className={cn('mb-8 space-y-4', className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {icon && <div className="text-primary">{icon}</div>}
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              {title}
            </h1>
            <div className="mt-1.5 hidden h-2 w-2 rounded-full bg-primary md:block" />
          </div>
          {subtitle && (
            <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
          {metadata && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground/60">
              {metadata}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 pt-2 md:pt-0">{actions}</div>
        )}
      </div>
    </div>
  );
}
