'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/sidebar-context';
import { useSubscription } from '@/hooks/use-subscription';
import { ThemeToggle } from '@/components/theme-toggle';
import { FinTecLogo } from '@/components/branding/fintec-logo';
import { FeatureBadge } from '@/components/subscription/feature-badge';
import { UpgradeButton } from '@/components/subscription/upgrade-button';
import { PremiumStatusCard } from '@/components/subscription/premium-status-card';
import {
  Home,
  CreditCard,
  ArrowUpDown,
  ArrowRightLeft,
  PieChart,
  Target,
  Settings,
  TrendingUp,
  HandCoins,
  Wallet,
  Plus,
  DollarSign,
  BarChart3,
  Shield,
  Crown,
  Repeat,
  MessageSquare,
} from 'lucide-react';

const navigation = [
  { name: 'Inicio', href: '/', icon: Home },
  { name: 'Cuentas', href: '/accounts', icon: Wallet },
  { name: 'Gastos', href: '/transactions', icon: ArrowUpDown },
  { name: 'Recurrentes', href: '/recurring', icon: Repeat },
  { name: 'Transferir', href: '/transfers', icon: ArrowRightLeft },
  { name: 'Categorías', href: '/categories', icon: PieChart },
  { name: 'Presupuestos', href: '/budgets', icon: CreditCard },
  { name: 'Metas', href: '/goals', icon: Target },
  { name: 'Reportes', href: '/reports', icon: TrendingUp },
  { name: 'Deudas', href: '/debts', icon: HandCoins },
  { name: 'Respaldos', href: '/backups', icon: Shield },
  { name: 'Chats', href: '/chat', icon: MessageSquare, premium: true },
  { name: 'Ajustes', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { closeSidebar, isMobile, isOpen } = useSidebar();
  const { tier, isPremium, isBase } = useSubscription();
  const handleLinkClick = () => {
    if (isMobile) {
      closeSidebar();
    }
  };

  const isMinimized = !isMobile && !isOpen;

  return (
    <div
      className={`flex h-full ${isMinimized ? 'w-16' : 'w-64'} ios-sidebar transition-ios flex-col`}
      suppressHydrationWarning
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-4 lg:px-6">
        <div className="flex w-full items-center justify-center">
          <div className="relative">
            <FinTecLogo
              containerClassName={cn(
                'transition-all duration-300',
                isMinimized ? 'h-10 w-10' : 'h-10 w-32'
              )}
              priority
              sizes="(max-width: 768px) 128px, 128px"
            />
          </div>
        </div>
      </div>

      {/* Quick Action - More casual */}
      {!isMinimized && (
        <div className="p-4">
          <button
            onClick={() => router.push('/transactions/add')}
            className="transition-ios flex w-full items-center justify-center space-x-2 rounded-2xl bg-primary px-4 py-3 text-ios-body font-semibold text-primary-foreground shadow-ios-lg backdrop-blur-sm hover:scale-105 hover:bg-primary/90 active:scale-95"
            style={{ zIndex: 9999 }}
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Transacción</span>
          </button>
        </div>
      )}

      {/* Minimized Quick Action */}
      {isMinimized && (
        <div className="flex flex-col items-center gap-2 p-2">
          <ThemeToggle isMinimized={true} />
          <button
            onClick={() => router.push('/transactions/add')}
            className="transition-ios flex h-12 w-full items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-ios-md backdrop-blur-sm hover:scale-105 hover:bg-primary/90 active:scale-95"
            title="Agregar Transacción"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Navigation - More friendly spacing */}
      <nav className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-4">
        {navigation.map((item) => {
          // Solo mostrar items premium si el usuario es premium
          if (item.premium && !isPremium) {
            return null;
          }

          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'transition-ios focus-ring group flex items-center rounded-xl text-ios-body font-medium lg:rounded-2xl',
                isMinimized ? 'justify-center px-3 py-3' : 'px-4 py-3',
                isActive
                  ? 'border border-primary/30 bg-primary/20 text-primary shadow-ios-sm backdrop-blur-sm'
                  : 'text-muted-foreground hover:scale-[1.02] hover:bg-secondary hover:text-foreground hover:shadow-ios-sm'
              )}
              title={isMinimized ? item.name : undefined}
            >
              <item.icon
                className={cn(
                  'transition-ios h-5 w-5 flex-shrink-0',
                  isMinimized ? '' : 'mr-3',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              {!isMinimized && item.name}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade Button - Only for free users */}
      <UpgradeButton isMinimized={isMinimized} />

      {/* Premium Status Card - Only for premium users */}
      <PremiumStatusCard isMinimized={isMinimized} />

      {/* User Profile & Theme Toggle */}
      <div className="mt-auto space-y-4 border-t border-border/10 p-4">
        {!isMinimized && (
          <div className="flex items-center justify-between px-2">
            <p className="text-ios-caption font-medium uppercase tracking-wider text-muted-foreground">
              Preferencias
            </p>
            <ThemeToggle isMinimized={true} />
          </div>
        )}

        <div
          className={cn(
            'ios-card flex items-center rounded-2xl p-3',
            isMinimized ? 'justify-center' : 'space-x-3'
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-ios-md">
            {isPremium ? (
              <Crown className="h-5 w-5 text-primary-foreground" />
            ) : (
              <DollarSign className="h-5 w-5 text-primary-foreground" />
            )}
          </div>
          {!isMinimized && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-ios-body font-semibold text-foreground">
                ¡FinTec! 💼
              </p>
              <p className="min-w-0 truncate text-ios-caption text-muted-foreground">
                Plan{' '}
                {tier === 'free'
                  ? 'Gratis'
                  : tier === 'base'
                    ? 'Base'
                    : 'Premium'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
