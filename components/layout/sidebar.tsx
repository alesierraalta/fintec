'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/sidebar-context';
import { useSubscription } from '@/hooks/use-subscription';
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
  { name: 'Respaldos', href: '/backups', icon: Shield },
  { name: 'Chats', href: '/chat', icon: MessageSquare, premium: true },
  { name: 'Ajustes', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { closeSidebar, isMobile, isOpen } = useSidebar();
  const { tier, isPremium, isBase } = useSubscription();
  const [logoError, setLogoError] = useState(false);

  const handleLinkClick = () => {
    if (isMobile) {
      closeSidebar();
    }
  };

  const isMinimized = !isMobile && !isOpen;

  return (
    <div
      className={`flex h-full ${isMinimized ? 'w-16' : 'w-64'} black-theme-sidebar transition-ios flex-col`}
      suppressHydrationWarning
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-white/10 px-4 lg:px-6">
        <div className="flex w-full items-center justify-center">
          <div className="relative">
            {logoError ? (
              <div className="px-4 text-xl font-bold text-white">FinTec</div>
            ) : (
              <Image
                src="/finteclogodark.jpg"
                alt="FinTec Logo"
                width={isMinimized ? 40 : 120}
                height={40}
                className="object-contain transition-all duration-300"
                style={{ width: isMinimized ? 40 : 'auto', height: 40 }}
                priority
                sizes="(max-width: 768px) 120px, 120px"
                loading="eager"
                onError={(e) => {
                  setLogoError(true);
                }}
              />
            )}
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
        <div className="p-2">
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
      <nav className="flex-1 space-y-2 px-4">
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
                  : 'text-white/70 hover:scale-[1.02] hover:bg-white/10 hover:text-white hover:shadow-ios-sm'
              )}
              title={isMinimized ? item.name : undefined}
            >
              <item.icon
                className={cn(
                  'transition-ios h-5 w-5 flex-shrink-0',
                  isMinimized ? '' : 'mr-3',
                  isActive
                    ? 'text-primary'
                    : 'text-white/70 group-hover:text-white'
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

      {/* User Profile - More friendly */}
      <div className="border-t border-white/10 p-4">
        <div
          className={`black-theme-card flex items-center rounded-2xl p-3 shadow-ios-sm ${isMinimized ? 'justify-center' : 'space-x-3'}`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-ios-md">
            {isPremium ? (
              <Crown className="h-5 w-5 text-white" />
            ) : (
              <DollarSign className="h-5 w-5 text-white" />
            )}
          </div>
          {!isMinimized && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-ios-body font-semibold text-white">
                ¡FinTec! 💼
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-ios-caption text-white/70">
                  Plan{' '}
                  {tier === 'free'
                    ? 'Gratis'
                    : tier === 'base'
                      ? 'Base'
                      : 'Premium'}
                </p>
                {(isPremium || isBase) && (
                  <FeatureBadge
                    tier={isPremium ? 'premium' : 'base'}
                    variant="compact"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
