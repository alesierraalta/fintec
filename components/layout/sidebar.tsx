'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/sidebar-context';
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
  BarChart3
} from 'lucide-react';

const navigation = [
  { name: 'Inicio', href: '/', icon: Home },
  { name: 'Cuentas', href: '/accounts', icon: Wallet },
  { name: 'Gastos', href: '/transactions', icon: ArrowUpDown },
  { name: 'Transferir', href: '/transfers', icon: ArrowRightLeft },
  { name: 'Categorías', href: '/categories', icon: PieChart },
  { name: 'Presupuestos', href: '/budgets', icon: CreditCard },
  { name: 'Metas', href: '/goals', icon: Target },
  { name: 'Reportes', href: '/reports', icon: TrendingUp },
  { name: 'Ajustes', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { closeSidebar, isMobile, isOpen } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      closeSidebar();
    }
  };

  const isMinimized = !isMobile && !isOpen;

  return (
    <div className={`flex h-full ${isMinimized ? 'w-16' : 'w-64'} flex-col bg-background-primary border-r border-border-primary`}>
      {/* Logo - iOS-like with rounded corners */}
      <div className="flex h-16 items-center px-4 lg:px-6 border-b border-border-primary">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 shadow-lg">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          {!isMinimized && (
            <div className="hidden sm:block">
              <span className="text-xl font-bold text-text-primary tracking-tight">FinTec</span>
              <p className="text-xs text-text-muted -mt-1">Finanzas inteligentes</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action - More casual */}
      {!isMinimized && (
        <div className="p-4">
          <button 
            onClick={() => {
              console.log('Sidebar button clicked - navigating to /transactions/add');
              alert('Sidebar button clicked!');
              window.location.href = '/transactions/add';
            }}
            className="flex w-full items-center justify-center space-x-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg"
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
            onClick={() => {
              console.log('Minimized sidebar button clicked - navigating to /transactions/add');
              window.location.href = '/transactions/add';
            }}
            className="w-full h-12 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-background-primary hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-lg"
            title="Agregar Transacción"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Navigation - More friendly spacing */}
      <nav className="flex-1 px-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                'group flex items-center text-sm font-medium rounded-xl lg:rounded-2xl transition-all duration-200',
                isMinimized ? 'px-3 py-3 justify-center' : 'px-4 py-3',
                isActive
                  ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20 shadow-sm'
                  : 'text-text-secondary hover:bg-background-tertiary hover:text-text-primary hover:scale-[1.02]'
              )}
              title={isMinimized ? item.name : undefined}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 flex-shrink-0 transition-colors',
                  isMinimized ? '' : 'mr-3',
                  isActive ? 'text-accent-primary' : 'text-text-muted group-hover:text-text-primary'
                )}
              />
              {!isMinimized && item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Profile - More friendly */}
      <div className="p-4 border-t border-border-primary">
        <div className={`flex items-center p-3 rounded-2xl bg-background-tertiary ${isMinimized ? 'justify-center' : 'space-x-3'}`}>
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center shadow-lg">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          {!isMinimized && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">¡FinTec! 💼</p>
              <p className="text-xs text-text-muted truncate">Finanzas inteligentes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}