'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  CreditCard,
  ArrowUpDown,
  ArrowRightLeft,
  PieChart,
  Target,
  Plus
} from 'lucide-react';
import { useSidebar } from '@/contexts/sidebar-context';

const mobileNavigation = [
  { name: 'Inicio', href: '/', icon: Home },
  { name: 'Cuentas', href: '/accounts', icon: CreditCard },
  { name: 'Gastos', href: '/transactions', icon: ArrowUpDown },
  { name: 'Transferir', href: '/transfers', icon: ArrowRightLeft },
  { name: 'Metas', href: '/goals', icon: Target },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile } = useSidebar();

  if (!isMobile) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-background-primary/95 backdrop-blur-lg border-t border-border-primary/30 lg:hidden">
      {/* Safe area for iOS */}
      <div className="pb-safe">
        <div className="flex items-center justify-around px-1 py-1 overflow-hidden">
          {mobileNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center px-1 py-3 rounded-2xl transition-all duration-200 min-w-0 flex-1 mx-0.5 relative',
                  isActive
                    ? 'text-accent-primary'
                    : 'text-text-muted active:text-text-primary active:scale-95'
                )}
              >
                {/* iOS-like active indicator */}
                {isActive && (
                  <div className="absolute inset-0 bg-accent-primary/15 rounded-2xl" />
                )}
                <item.icon className={cn(
                  "h-6 w-6 mb-1 relative z-10",
                  isActive && "drop-shadow-sm"
                )} />
                <span className={cn(
                  "text-xs font-medium truncate relative z-10 text-center",
                  isActive && "font-semibold"
                )}>
                  {item.name}
                </span>
              </Link>
            );
          })}
          
          {/* Quick Add Button - iOS-like floating action */}
          <button 
            className="flex flex-col items-center px-1 py-3 rounded-2xl transition-all duration-200 min-w-0 flex-1 mx-0.5 relative active:scale-95"
            onClick={() => {
              console.log('Mobile nav button clicked - navigating to /transactions/add');
              router.push('/transactions/add');
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-accent-primary to-accent-secondary rounded-2xl shadow-lg" />
            <Plus className="h-6 w-6 mb-1 text-background-primary relative z-10 drop-shadow-sm" />
            <span className="text-xs font-semibold text-background-primary relative z-10 drop-shadow-sm truncate text-center">
              Agregar
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
