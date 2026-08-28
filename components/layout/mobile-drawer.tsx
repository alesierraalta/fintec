'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/contexts/sidebar-context';
import { useAdminAccess } from '@/contexts/admin-access-context';
import { useSubscription } from '@/hooks/use-subscription';
import { useNativeBackNavigation } from '@/components/providers/native-back-navigation';
import { mobileAdminNavigation, mobileSecondaryNavigation } from './navigation';

export type MobileDrawerProps = { open: boolean; onClose: () => void };

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const isAdmin = useAdminAccess();
  const { isPremium } = useSubscription();
  const registerBack = useNativeBackNavigation();
  const openerRef = useRef<HTMLElement | null>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const host = useMemo(() => typeof document === 'undefined' ? null : document.getElementById('modal-root') ?? document.body, []);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    drawerRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) return;
    if (openerRef.current) {
      openerRef.current.focus();
      openerRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    return registerBack({ id: 'mobile-drawer', priority: 95, close: onClose });
  }, [open, onClose, registerBack]);

  if (!isMobile || !open || !host) return null;
  const items = [...mobileSecondaryNavigation, ...(isAdmin ? [mobileAdminNavigation] : [])]
    .filter((item) => !item.premium || isPremium);

  return createPortal(
    <div className="fixed inset-0 z-[60] lg:hidden" data-testid="mobile-drawer-root">
      <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-background/40 backdrop-blur-sm" onClick={onClose} />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-drawer-title"
        tabIndex={-1}
        className="glass-card relative flex h-full w-[min(20rem,calc(100vw-1rem))] flex-col border-l-0 border-border pt-safe-top pb-safe-bottom pl-safe-left shadow-ios-lg"
      >
        <div className="flex min-h-[60px] items-center justify-between border-b border-border/50 px-4">
          <h2 id="mobile-drawer-title" className="text-ios-headline font-semibold">Más opciones</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar menú" className="focus-ring flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-foreground hover:bg-foreground/10">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Navegación móvil secundaria" className="no-scrollbar flex-1 space-y-1 overflow-y-auto p-4">
          {items.map((item) => {
            const active = pathname === item.href;
            return <Link key={item.href} href={item.href} onClick={onClose} aria-current={active ? 'page' : undefined} className={cn('focus-ring flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-ios-body transition-ios', active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground')}>
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" /><span>{item.mobileLabel}</span>
            </Link>;
          })}
        </nav>
      </aside>
    </div>, host
  );
}
