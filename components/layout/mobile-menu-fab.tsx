'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/sidebar-context';
import {
  MoreHorizontal,
  Tags,
  BarChart3,
  Wallet,
  Target,
  Repeat,
  Settings,
  Sparkles,
  X
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
    description: 'Mejora tu suscripción'
  },
  {
    name: 'Categorías',
    href: '/categories',
    icon: Tags,
    description: 'Gestiona tus categorías'
  },
  {
    name: 'Reportes',
    href: '/reports',
    icon: BarChart3,
    description: 'Visualiza tus reportes financieros'
  },
  {
    name: 'Presupuestos',
    href: '/budgets',
    icon: Wallet,
    description: 'Administra tus presupuestos'
  },
  {
    name: 'Metas',
    href: '/goals',
    icon: Target,
    description: 'Define y sigue tus metas'
  },
  {
    name: 'Recurrentes',
    href: '/recurring',
    icon: Repeat,
    description: 'Gestiona transacciones recurrentes'
  },
  {
    name: 'Configuración',
    href: '/settings',
    icon: Settings,
    description: 'Ajusta tu aplicación'
  }
];

export function MobileMenuFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { isMobile } = useSidebar();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const handleNavigate = (href: string) => {
    router.push(href);
    closeMenu();
  };

  // Only show on mobile
  if (!isMobile) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-fade-in lg:hidden"
          onClick={closeMenu}
          aria-label="Cerrar menú"
        />
      )}

      {/* Bottom Sheet */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 transition-all duration-300 ease-out lg:hidden',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="bg-background-primary/95 backdrop-blur-lg border-t border-border-primary/30 rounded-t-3xl shadow-2xl">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-text-muted/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-3">
            <h3 className="text-lg font-semibold text-text-primary">Más opciones</h3>
            <button
              onClick={closeMenu}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-background-tertiary rounded-xl transition-ios"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => handleNavigate(item.href)}
                  className={cn('w-full flex items-center space-x-4 p-4 rounded-2xl transition-ios active:scale-95', item.href === '/pricing' ? 'bg-purple-500/90 hover:bg-purple-600 text-white border border-purple-400/30 hover:border-purple-500/50' : 'bg-background-secondary/50 hover:bg-background-secondary border border-border-primary/20 hover:border-border-primary/40')}
                >
                  <div className={cn('p-3 rounded-xl', item.href === '/pricing' ? 'bg-purple-400/20 border border-purple-400/40' : 'bg-accent-primary/10 border border-accent-primary/20')}>
                    <item.icon className="h-5 w-5 text-accent-primary" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="text-sm font-semibold text-text-primary">
                      {item.name}
                    </h4>
                    <p className="text-xs text-text-muted truncate">
                      {item.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Safe area for iOS */}
          <div className="pb-safe" />
        </div>
      </div>

      {/* FAB Button */}
      <div className="fixed bottom-24 left-6 z-[45] lg:hidden">
        <button
          onClick={toggleMenu}
          className={cn(
            'w-14 h-14 rounded-full shadow-ios-lg transition-ios flex items-center justify-center backdrop-blur-sm focus:outline-none overflow-hidden',
            isOpen
              ? 'bg-accent-primary hover:bg-accent-primary/90 rotate-90'
              : 'bg-gray-900 hover:bg-gray-800 active:scale-95'
          )}
          title="Más opciones"
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isOpen}
        >


          {isOpen ? (
            <X className="h-6 w-6 text-text-primary" />
          ) : (
            <Image
              src="/fintecminilogodark.png"
              alt="FinTec Menu"
              width={44}
              height={44}
              className="object-contain"
              style={{ width: 44, height: 'auto' }}
              unoptimized
            />
          )}
        </button>
      </div>
    </>
  );
}
