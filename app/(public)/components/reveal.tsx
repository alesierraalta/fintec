'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface RevealProps {
  children: ReactNode;
  className?: string;
}

/**
 * Shared scroll-reveal leaf for the landing page.
 *
 * SSR/no-JS renders the content fully visible (no hidden initial state);
 * once the IntersectionObserver fires near the viewport, the existing
 * `animate-fade-in-up` utility plays once (transform + opacity only).
 * Skipped entirely under prefers-reduced-motion; globals.css also maps
 * `.animate-fade-in-up` to `animation: none` in that media query.
 */
export function Reveal({ children, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn(className, revealed && 'animate-fade-in-up')}>
      {children}
    </div>
  );
}
