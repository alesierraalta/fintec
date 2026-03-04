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
        <div className="flex items-center justify-around overflow-hidden px-1 py-1">
          {mobileNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'focus-ring relative mx-0.5 flex min-h-[48px] min-w-0 flex-1 flex-col items-center rounded-2xl px-1 py-3 transition-all duration-200',
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
                    'relative z-10 mb-1 h-6 w-6',
                    isActive && 'drop-shadow-sm'
                  )}
                />
                <span
                  className={cn(
                    'relative z-10 truncate text-center text-xs font-medium',
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
