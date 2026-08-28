'use client';

import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/sidebar-context';
import { useSubscription } from '@/hooks/use-subscription';
import { useNativeBackNavigation } from '@/components/providers/native-back-navigation';
import {
  Tags,
  BarChart3,
  Wallet,
  Target,
  Repeat,
  Settings,
  ArrowUpRight,
  Calculator,
  HandCoins,
  DollarSign,
  X,
} from 'lucide-react';

/**
 * Floating Action Button with Menu for Mobile
 * Displays additional navigation options that don't fit in the bottom navigation bar
 * Only visible on mobile devices
 */

interface MenuItem {
  name: string;
  href: string;
  icon: any;
  description: string;
}

const menuItems: MenuItem[] = [
  {
    name: 'Actualizar Plan',
    href: '/pricing',
    icon: ArrowUpRight,
    description: 'Mejora tu suscripción',
  },
  {
    name: 'Categorías',
    href: '/categories',
    icon: Tags,
    description: 'Gestiona tus categorías',
  },
  {
    name: 'Reportes',
    href: '/reports',
    icon: BarChart3,
    description: 'Visualiza tus reportes financieros',
  },
  {
    name: 'Calculadora',
    href: '/calculator',
    icon: Calculator,
    description: 'Convierte VES con BCV y Binance',
  },
  {
    name: 'Deudas',
    href: '/debts',
    icon: HandCoins,
    description: 'Controla lo que debes y te deben',
  },
  {
    name: 'Ofertas P2P',
    href: '/p2p-offers',
    icon: DollarSign,
    description: 'Explora ofertas de intercambio P2P',
  },
  {
    name: 'Presupuestos',
    href: '/budgets',
    icon: Wallet,
    description: 'Administra tus presupuestos',
  },
  {
    name: 'Metas',
    href: '/goals',
    icon: Target,
    description: 'Define y sigue tus metas',
  },
  {
    name: 'Recurrentes',
    href: '/recurring',
    icon: Repeat,
    description: 'Gestiona transacciones recurrentes',
  },
  {
    name: 'Configuración',
    href: '/settings',
    icon: Settings,
    description: 'Ajusta tu aplicación',
  },
];

export function MobileMenuFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { isMobile } = useSidebar();
  const registerBack = useNativeBackNavigation();
  const { isFree, isOwnerAdmin, loading, error } = useSubscription();
  const overlayHost = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return document.getElementById('modal-root') ?? document.body;
  }, []);

  // Owners/admins and paid (base/premium) users have nothing to upgrade to.
  // While eligibility is loading or unresolved (error), hide the upgrade item
  // so the CTA never flashes for an unresolved identity.
  const canUpgrade = isFree && !isOwnerAdmin && !loading && !error;
  const items = canUpgrade
    ? menuItems
    : menuItems.filter((item) => item.href !== '/pricing');

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    return registerBack({ id: 'mobile-menu', priority: 95, close: closeMenu });
  }, [isOpen, registerBack]);

  const handleNavigate = (href: string) => {
    router.push(href);
    closeMenu();
  };

  // Only show on mobile
  if (!isMobile || !overlayHost) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[55] animate-fade-in bg-background/30 backdrop-blur-sm lg:hidden"
          onClick={closeMenu}
          aria-label="Cerrar menú"
        />
      )}

      {/* Bottom Sheet */}
      <div
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        className={cn(
          'fixed inset-x-0 bottom-0 z-[60] pb-safe-bottom transition-transform duration-300 ease-out lg:hidden',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div
          id="mobile-menu-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-menu-title"
          className="rounded-t-3xl border-t border-border-primary/30 bg-background-primary/95 shadow-2xl backdrop-blur-lg"
        >
          {/* Handle bar */}
          <div className="flex justify-center pb-2 pt-3">
            <div className="h-1 w-12 rounded-full bg-text-muted/30" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-3">
            <h3
              id="mobile-menu-title"
              className="text-lg font-semibold text-text-primary"
            >
              Más opciones
            </h3>
            <button
              type="button"
              onClick={closeMenu}
              className="transition-ios focus-ring rounded-xl p-2 text-text-muted hover:bg-background-tertiary hover:text-text-primary"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="max-h-[60vh] overflow-y-auto px-4 pb-6">
            <div className="space-y-2">
              {items.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  onClick={() => handleNavigate(item.href)}
                  className={cn(
                    'transition-ios focus-ring flex w-full items-center space-x-4 rounded-2xl p-4 active:scale-95',
                    item.href === '/pricing'
                      ? 'border border-primary/30 bg-primary text-white hover:border-primary/50 hover:bg-primary/90'
                      : 'border border-border-primary/20 bg-background-secondary/50 hover:border-border-primary/40 hover:bg-background-secondary'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-xl p-3',
                      item.href === '/pricing'
                        ? 'border border-primary/40 bg-primary/20'
                        : 'border border-primary/20 bg-primary/10'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-5 w-5',
                        item.href === '/pricing' ? 'text-white' : 'text-primary'
                      )}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <h4 className="text-sm font-semibold text-text-primary">
                      {item.name}
                    </h4>
                    <p className="truncate text-xs text-text-muted">
                      {item.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Safe area for iOS */}
          <div className="pb-safe-bottom" />
        </div>
      </div>

      {/* FAB Button */}
      <div className="fixed bottom-mobile-chrome left-6 z-[40] mb-4 lg:hidden">
        <button
          type="button"
          onClick={toggleMenu}
          className={cn(
            'transition-ios focus-ring flex h-14 min-h-[44px] w-14 min-w-[44px] items-center justify-center rounded-full shadow-ios-lg backdrop-blur-sm',
            isOpen
              ? 'rotate-90 bg-foreground text-white hover:bg-foreground/95 active:scale-95'
              : 'bg-foreground text-white hover:bg-foreground/95 active:scale-95'
          )}
          title="Más opciones"
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-controls="mobile-menu-dialog"
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white" aria-hidden="true" />
          ) : (
            <span className="relative h-8 w-8" aria-hidden="true">
              <Image
                src="/fintecminilogodark.png"
                alt="FinTec Menu"
                fill
                sizes="32px"
                className="object-contain invert dark:invert-0"
                priority
              />
            </span>
          )}
        </button>
      </div>
    </>,
    overlayHost
  );
}
