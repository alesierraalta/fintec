'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  CreditCard,
  ArrowUpDown,
  ArrowRightLeft,
  Target,
  HandCoins,
} from 'lucide-react';
import { useSidebar } from '@/contexts/sidebar-context';

const mobileNavigation = [
  { name: 'Inicio', href: '/', icon: Home },
  { name: 'Cuentas', href: '/accounts', icon: CreditCard },
  { name: 'Gastos', href: '/transactions', icon: ArrowUpDown },
  { name: 'Transferir', href: '/transfers', icon: ArrowRightLeft },
  { name: 'Deudas', href: '/debts', icon: HandCoins },
  { name: 'Metas', href: '/goals', icon: Target },
];

export function MobileNav() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const overlayHost = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return document.getElementById('modal-root') ?? document.body;
  }, []);

  if (!isMobile || !overlayHost) return null;

  return createPortal(
    <nav
      aria-label="Navegación móvil principal"
      data-testid="mobile-nav"
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-[45] border-t border-border-primary/30 bg-background-primary/95 backdrop-blur-lg will-change-transform lg:hidden"
      style={{
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="px-1.5 pt-2">
        <div className="flex w-full items-stretch justify-between gap-1.5">
          {mobileNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'focus-ring relative flex min-h-[52px] min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl px-1 py-1.5 text-center transition-all duration-200',
                  isActive
                    ? 'text-primary'
                    : 'text-text-muted active:scale-95 active:text-text-primary'
                )}
              >
                {/* iOS-like active indicator */}
                {isActive && (
                  <div className="absolute inset-0 rounded-2xl bg-primary/15" />
                )}
                <item.icon
                  className={cn(
                    'relative z-10 h-[18px] w-[18px] sm:h-5 sm:w-5',
                    isActive && 'drop-shadow-sm'
                  )}
                />
                <span
                  className={cn(
                    'nav-label-mobile relative z-10 mt-1 w-full truncate px-0.5 text-center text-[10px] font-medium leading-[1.1] tracking-tighter sm:text-xs',
                    isActive && 'font-semibold'
                  )}
                >
                  {item.name}
                </span>
                <style dangerouslySetInnerHTML={{ __html: `
                  @media (max-width: 350px) {
                    .nav-label-mobile { display: none !important; }
                  }
                `}} />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>,
    overlayHost
  );
}
