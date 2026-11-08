'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Standalone card in the chat thread (design 01: "Conversación con tarjetas"). */
export function ChatCard({
  label,
  tone = 'default',
  muted = false,
  children,
}: {
  label: string;
  tone?: 'default' | 'warning';
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        'w-full max-w-[86%] rounded-xl bg-card p-3.5 shadow-soft sm:max-w-md',
        tone === 'warning' && 'border-l-4 border-warning',
        muted && 'opacity-70'
      )}
    >
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      {children}
    </section>
  );
}

export function ChatChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[13px] text-foreground">
      {children}
    </span>
  );
}

export function ChatCardActions({ children }: { children: ReactNode }) {
  return <div className="mt-3 flex gap-2">{children}</div>;
}

export function ChatCardButton({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'focus-ring transition-ios min-h-[40px] rounded-xl px-3.5 text-sm font-semibold disabled:opacity-60',
        variant === 'primary'
          ? 'flex-1 bg-primary text-primary-foreground hover:bg-primary/90'
          : 'bg-secondary text-foreground hover:bg-muted',
        className
      )}
    />
  );
}
