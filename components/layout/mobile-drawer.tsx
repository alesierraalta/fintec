'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
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

  // Lightweight state machine for 60fps GPU-composited CSS transitions
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  const host = useMemo(
    () =>
      typeof document === 'undefined'
        ? null
        : (document.getElementById('modal-root') ?? document.body),
    []
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      setMounted(true);
      // Give the browser 1 frame to mount with off-screen position before transitioning in
      timer = setTimeout(() => {
        setVisible(true);
      }, 16);
    } else {
      setVisible(false);
      // Wait for the 200ms transition to complete before unmounting to free memory
      timer = setTimeout(() => {
        setMounted(false);
      }, 220);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
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

  if (!isMobile || !host || !mounted) return null;
  const items = [
    ...mobileSecondaryNavigation,
    ...(isAdmin ? [mobileAdminNavigation] : []),
  ].filter((item) => !item.premium || isPremium);

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[60] transition-opacity duration-200 ease-out lg:hidden',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}
      data-testid="mobile-drawer-root"
    >
      {/* Backdrop: solid dark overlay without blur for zero GPU overhead */}
      <button
        type="button"
        data-testid="mobile-drawer-backdrop"
        aria-label="Cerrar menú al tocar fuera"
        className="absolute inset-0 bg-black/60 transition-opacity duration-200"
        onClick={onClose}
      />
      {/* Drawer panel: hardware-accelerated transform with native iOS/Android deceleration */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-drawer-title"
        tabIndex={-1}
        className={cn(
          'relative flex h-full w-[min(20rem,calc(100vw-1rem))] transform-gpu flex-col border-r border-border bg-card pb-safe-bottom pl-safe-left pt-safe-top shadow-2xl transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform',
          visible ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex min-h-[60px] items-center justify-between border-b border-border/50 px-4">
          <h2
            id="mobile-drawer-title"
            className="text-ios-headline font-semibold"
          >
            Más opciones
          </h2>
          <button
            type="button"
            data-testid="mobile-drawer-close"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="focus-ring flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-foreground hover:bg-foreground/10"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav
          aria-label="Navegación móvil secundaria"
          className="no-scrollbar flex-1 space-y-1 overflow-y-auto p-4"
        >
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'focus-ring transition-ios flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-ios-body',
                  active
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>{item.mobileLabel}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>,
    host
  );
}
