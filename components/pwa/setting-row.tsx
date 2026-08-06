'use client';

import type { ReactNode } from 'react';

export interface SettingRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * Shared row layout for `install-app-setting.tsx`'s three states (already
 * installed, iOS instructions, native install action). Previously the same
 * `className="flex items-center justify-between rounded-2xl bg-muted/20
 * p-4"` markup, icon wrapper, and title/description structure was written
 * verbatim three times.
 */
export function SettingRow({
  icon,
  title,
  description,
  action,
}: SettingRowProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-muted/20 p-4">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-ios-body font-medium text-foreground">{title}</p>
          <p className="mt-1 text-ios-caption text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}
