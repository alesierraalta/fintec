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
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-[45] border-t border-border-primary/30 bg-background-primary/95 backdrop-blur-lg will-change-transform lg:hidden">
      {/* Safe area for iOS */}
      <div className="pb-safe-bottom">
        {/* Usamos overflow-x-auto nativo y snap para deslizar items en pantallas muy finas sin romper flex */}
        <div className="no-scrollbar flex w-full snap-x snap-mandatory items-center gap-1 overflow-x-auto overscroll-x-contain px-2 py-1 sm:justify-between">
          {mobileNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'focus-ring relative flex min-h-[48px] min-w-[4.25rem] flex-shrink-0 snap-center flex-col items-center justify-center gap-0.5 rounded-2xl p-1 transition-all duration-200 sm:min-w-0 sm:flex-1',
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
                    'relative z-10 h-5 w-5 sm:h-6 sm:w-6',
                    isActive && 'drop-shadow-sm'
                  )}
                />
                <span
                  className={cn(
                    'relative z-10 truncate text-center text-[10px] font-medium leading-tight sm:text-xs',
                    isActive && 'font-semibold'
                  )}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>,
    overlayHost
  );
}
