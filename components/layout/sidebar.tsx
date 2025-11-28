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
  MessageSquare
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
  { name: 'Chats', href: '/chats', icon: MessageSquare, premium: true },
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
      className={`flex h-full ${isMinimized ? 'w-16' : 'w-64'} flex-col black-theme-sidebar transition-ios`}
      suppressHydrationWarning
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-4 lg:px-6 border-b border-white/10">
        <div className="flex items-center justify-center w-full">
          <div className="relative">
            {logoError ? (
              <div className="text-white font-bold text-xl px-4">FinTec</div>
            ) : (
              <Image
                src="/finteclogodark.jpg"
                alt="FinTec Logo"
                width={isMinimized ? 40 : 120}
                height={isMinimized ? 40 : 40}
                className="object-contain transition-all duration-300"
                priority
                unoptimized
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
            onClick={() => window.location.href = '/transactions/add'}
            className="flex w-full items-center justify-center space-x-2 rounded-2xl bg-primary px-4 py-3 text-ios-body font-semibold text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 transition-ios shadow-ios-lg backdrop-blur-sm"
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
            onClick={() => window.location.href = '/transactions/add'}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 active:scale-95 transition-ios flex items-center justify-center shadow-ios-md backdrop-blur-sm"
            title="Agregar Transacción"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Navigation - More friendly spacing */}
      <nav className="flex-1 px-4 space-y-2">
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
              className={cn(
                'group flex items-center text-ios-body font-medium rounded-xl lg:rounded-2xl transition-ios',
                isMinimized ? 'px-3 py-3 justify-center' : 'px-4 py-3',
                isActive
                  ? 'bg-primary/20 text-primary border border-primary/30 shadow-ios-sm backdrop-blur-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white hover:scale-[1.02] hover:shadow-ios-sm'
              )}
              title={isMinimized ? item.name : undefined}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 flex-shrink-0 transition-ios',
                  isMinimized ? '' : 'mr-3',
                  isActive ? 'text-primary' : 'text-white/70 group-hover:text-white'
                )}
              />
              {!isMinimized && item.name}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade Button - Only for free users */}
      <UpgradeButton isMinimized={isMinimized} />

      {/* User Profile - More friendly */}
      <div className="p-4 border-t border-white/10">
        <div className={`flex items-center p-3 rounded-2xl black-theme-card shadow-ios-sm ${isMinimized ? 'justify-center' : 'space-x-3'}`}>
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-ios-md">
            {isPremium ? (
              <Crown className="h-5 w-5 text-white" />
            ) : (
              <DollarSign className="h-5 w-5 text-white" />
            )}
          </div>
          {!isMinimized && (
            <div className="flex-1 min-w-0">
              <p className="text-ios-body font-semibold text-white truncate">¡FinTec! 💼</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-ios-caption text-white/70">Plan {tier === 'free' ? 'Gratis' : tier === 'base' ? 'Base' : 'Premium'}</p>
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
