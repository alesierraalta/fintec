'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/sidebar-context';
import {
  Tags,
  BarChart3,
  Wallet,
  Target,
  Repeat,
  Settings,
  Sparkles,
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
    icon: Sparkles,
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
  const overlayHost = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return document.getElementById('modal-root') ?? document.body;
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

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
          className="fixed inset-0 z-40 animate-fade-in bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={closeMenu}
          aria-label="Cerrar menú"
        />
      )}

      {/* Bottom Sheet */}
      <div
        aria-hidden={!isOpen}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 transition-all duration-300 ease-out lg:hidden',
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
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="max-h-[60vh] overflow-y-auto px-4 pb-6">
            <div className="space-y-2">
              {menuItems.map((item) => (
                <button
                  type="button"
                  key={item.name}
                  onClick={() => handleNavigate(item.href)}
                  className={cn(
                    'transition-ios focus-ring flex w-full items-center space-x-4 rounded-2xl p-4 active:scale-95',
                    item.href === '/pricing'
                      ? 'border border-purple-400/30 bg-purple-500/90 text-white hover:border-purple-500/50 hover:bg-purple-600'
                      : 'border border-border-primary/20 bg-background-secondary/50 hover:border-border-primary/40 hover:bg-background-secondary'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-xl p-3',
                      item.href === '/pricing'
                        ? 'border border-purple-400/40 bg-purple-400/20'
                        : 'border border-primary/20 bg-primary/10'
                    )}
                  >
                    <item.icon className="h-5 w-5 text-primary" />
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
      {!isOpen && (
        <div className="fixed bottom-[120px] left-6 z-50 lg:hidden">
          <button
            type="button"
            onClick={toggleMenu}
            className={cn(
              'transition-ios focus-ring flex h-14 min-h-[44px] w-14 min-w-[44px] items-center justify-center rounded-full shadow-ios-lg backdrop-blur-sm',
              isOpen
                ? 'rotate-90 bg-black text-white hover:bg-black/95 active:scale-95'
                : 'bg-black text-white hover:bg-black/95 active:scale-95'
            )}
            title="Más opciones"
            aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-controls="mobile-menu-dialog"
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <span className="relative h-8 w-8" aria-hidden="true">
                <Image
                  src="/fintecminilogodark.png"
                  alt="FinTec Menu"
                  fill
                  sizes="32px"
                  className="object-contain"
                  priority
                />
              </span>
            )}
          </button>
        </div>
      )}
    </>,
    overlayHost
  );
}
