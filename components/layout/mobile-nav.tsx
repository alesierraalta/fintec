'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/sidebar-context';
import { useMobileChromeGeometry } from '@/hooks/use-mobile-chrome-geometry';
import { mobilePrimaryNavigation } from './navigation';

export function MobileNav() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  useMobileChromeGeometry();
  const overlayHost = useMemo(() => typeof document === 'undefined' ? null : document.getElementById('modal-root') ?? document.body, []);
  if (!isMobile || !overlayHost) return null;
  return createPortal(
    <nav aria-label="Navegación móvil principal" data-testid="mobile-nav" className="pointer-events-auto fixed inset-x-0 bottom-0 z-[45] border-t border-border-primary/30 bg-background-primary/95 pb-safe-bottom backdrop-blur-lg lg:hidden" style={{ paddingLeft: 'max(0.5rem, env(safe-area-inset-left))', paddingRight: 'max(0.5rem, env(safe-area-inset-right))' }}>
      <div className="px-1.5 pt-2" data-mobile-nav-row>
        <div className="flex w-full items-stretch justify-between gap-1">
          {mobilePrimaryNavigation.map((item) => {
            const isActive = pathname === item.href;
            return <Link key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined} className={cn('focus-ring relative flex min-h-[52px] min-w-[44px] flex-1 basis-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-center transition-all duration-200', isActive ? 'text-primary' : 'text-text-muted active:scale-95 active:text-text-primary')}>
              {isActive && <div className="absolute inset-0 rounded-2xl bg-primary/15" />}
              <item.icon className={cn('relative z-10 h-[18px] w-[18px] sm:h-5 sm:w-5', isActive && 'drop-shadow-sm')} />
              <span className={cn('relative z-10 mt-1 w-full whitespace-normal break-words px-0.5 text-center text-[10px] font-medium leading-[1.1] tracking-tighter sm:text-xs', isActive && 'font-semibold')}>{item.mobileLabel}</span>
            </Link>;
          })}
        </div>
      </div>
    </nav>, overlayHost
  );
}
