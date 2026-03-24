'use client';

import { Bell, Sparkles, Menu, X, User, LogOut, Crown } from 'lucide-react';
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/contexts/sidebar-context';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { useRepository } from '@/providers/repository-provider';
import type { Notification } from '@/types/notifications';
import { fromMinorUnits } from '@/lib/money';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useActiveUsdVesRate } from '@/lib/rates';
import { RateSelector } from '@/components/currency/rate-selector';
import { FinTecLogo } from '@/components/branding/fintec-logo';

export function Header() {
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const { isOpen, isMobile, toggleSidebar } = useSidebar();
  const { user, signOut } = useAuth();
  const { tier, isPremium } = useSubscription();
  const router = useRouter();
  const repository = useRepository();
  const bcvRates = useBCVRates();
  const activeUsdVes = useActiveUsdVesRate();

  const { accounts } = useOptimizedData();
  const mobileUserButtonRef = useRef<HTMLButtonElement | null>(null);
  const desktopUserButtonRef = useRef<HTMLButtonElement | null>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement | null>(null);
  const [mobileUserMenuStyle, setMobileUserMenuStyle] =
    useState<CSSProperties | null>(null);
  const [desktopUserMenuStyle, setDesktopUserMenuStyle] =
    useState<CSSProperties | null>(null);
  const [notificationsPanelStyle, setNotificationsPanelStyle] =
    useState<CSSProperties | null>(null);

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => {
      const balanceMinor = Number(acc.balance) || 0;
      const balanceMajor = fromMinorUnits(balanceMinor, acc.currencyCode);

      if (acc.currencyCode === 'VES') {
        const rate = activeUsdVes || bcvRates.usd || 1;
        return sum + balanceMajor / rate;
      }
      return sum + balanceMajor;
    }, 0);
  }, [accounts, activeUsdVes, bcvRates.usd]);

  const memoizedLoadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingNotifications(true);
      const [unreadNotifications, count] = await Promise.all([
        repository.notifications.findUnreadByUserId(user.id),
        repository.notifications.countUnreadByUserId(user.id),
      ]);

      setNotifications(unreadNotifications);
      setNotificationCount(count);
    } catch (error) {
      console.error('Failed to load notifications', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [user, repository]);

  useEffect(() => {
    if (user) {
      memoizedLoadNotifications();
    }
  }, [user, memoizedLoadNotifications]);

  const handleNotificationClick = useCallback(async () => {
    if (!showNotifications) {
      await memoizedLoadNotifications();
    }
    setShowNotifications(!showNotifications);
  }, [showNotifications, memoizedLoadNotifications]);

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await repository.notifications.markAsRead(notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        setNotificationCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark notification as read', error);
      }
    },
    [repository]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      await repository.notifications.markAllAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setNotificationCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    }
  }, [user, repository]);

  const handleLogout = useCallback(async () => {
    await signOut();
    router.push('/auth/login');
  }, [signOut, router]);

  const handleProfile = useCallback(() => {
    router.push('/profile');
    setShowUserMenu(false);
  }, [router]);

  const overlayHost = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return document.getElementById('modal-root') ?? document.body;
  }, []);

  const getViewportMetrics = useCallback(() => {
    const visualViewport = window.visualViewport;

    return {
      offsetLeft: visualViewport?.offsetLeft ?? 0,
      offsetTop: visualViewport?.offsetTop ?? 0,
      width: visualViewport?.width ?? window.innerWidth,
    };
  }, []);

  const getOverlayStyle = useCallback(
    (button: HTMLButtonElement | null, widthPx: number) => {
      if (!button) return null;

      const rect = button.getBoundingClientRect();
      const sideMargin = 12;
      const {
        offsetLeft,
        offsetTop,
        width: viewportWidth,
      } = getViewportMetrics();

      const clampedWidth = Math.min(
        widthPx,
        Math.max(160, viewportWidth - sideMargin * 2)
      );
      const preferredLeft = rect.right - clampedWidth + offsetLeft;
      const minLeft = offsetLeft + sideMargin;
      const maxLeft = offsetLeft + viewportWidth - clampedWidth - sideMargin;
      const safeMaxLeft = Math.max(minLeft, maxLeft);

      return {
        top: rect.bottom + 8 + offsetTop,
        left: Math.min(Math.max(preferredLeft, minLeft), safeMaxLeft),
        width: clampedWidth,
      } satisfies CSSProperties;
    },
    [getViewportMetrics]
  );

  const syncOverlayPositions = useCallback(() => {
    setMobileUserMenuStyle(getOverlayStyle(mobileUserButtonRef.current, 256));
    setDesktopUserMenuStyle(getOverlayStyle(desktopUserButtonRef.current, 256));
    setNotificationsPanelStyle(
      getOverlayStyle(notificationsButtonRef.current, 320)
    );
  }, [getOverlayStyle]);

  useEffect(() => {
    if (!showUserMenu && !showNotifications) return;

    syncOverlayPositions();
    const visualViewport = window.visualViewport;

    window.addEventListener('resize', syncOverlayPositions);
    window.addEventListener('scroll', syncOverlayPositions, true);
    visualViewport?.addEventListener('resize', syncOverlayPositions);
    visualViewport?.addEventListener('scroll', syncOverlayPositions);

    return () => {
      window.removeEventListener('resize', syncOverlayPositions);
      window.removeEventListener('scroll', syncOverlayPositions, true);
      visualViewport?.removeEventListener('resize', syncOverlayPositions);
      visualViewport?.removeEventListener('scroll', syncOverlayPositions);
    };
  }, [showUserMenu, showNotifications, syncOverlayPositions]);

  const formattedBalance = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(totalBalance);
  }, [totalBalance]);

  // * Format tier name for display
  const tierName = useMemo(() => {
    if (tier === 'free') return 'Gratis';
    if (tier === 'base') return 'Base';
    if (tier === 'premium') return 'Premium';
    return 'Gratis';
  }, [tier]);

  if (isMobile) {
    return (
      <header className="black-theme-header sticky top-0 z-50 flex w-full max-w-full flex-col overflow-x-hidden shadow-sm">
        <div
          aria-hidden="true"
          className="w-full shrink-0"
          style={{ height: 'env(safe-area-inset-top)' }}
        />
        <div
          className="grid min-h-[4rem] w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-2"
          style={{
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <div className="flex min-w-0 items-center justify-start">
            <div className="min-w-0 max-w-full">
              <RateSelector />
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-center px-1">
            <FinTecLogo
              containerClassName="h-8 w-20 shrink-0 sm:h-10 sm:w-24"
              priority
              sizes="(max-width: 768px) 100px, 100px"
            />
          </div>
          <div className="relative flex items-center justify-end">
            <button
              ref={mobileUserButtonRef}
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-expanded={showUserMenu}
              aria-controls="user-menu-mobile"
              aria-label={
                showUserMenu
                  ? 'Cerrar menú de usuario'
                  : 'Abrir menú de usuario'
              }
              className="black-theme-card focus-ring flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center rounded-xl p-2 transition-all duration-200 hover:bg-white/5"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg ${
                  isPremium ? 'ring-2 ring-amber-400' : ''
                }`}
              >
                {isPremium ? (
                  <Crown className="h-4 w-4 text-white" />
                ) : (
                  <User className="h-4 w-4 text-white" />
                )}
              </div>
            </button>

            {showUserMenu &&
              overlayHost &&
              createPortal(
                <>
                  <div
                    id="user-menu-mobile"
                    className="black-theme-card fixed z-[55] rounded-xl py-2 shadow-xl"
                    style={
                      mobileUserMenuStyle ?? {
                        top: 'calc(env(safe-area-inset-top) + 4.5rem)',
                        right: '1rem',
                        width: '16rem',
                      }
                    }
                  >
                    <div className="border-b border-white/10 px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 ${
                            isPremium ? 'ring-2 ring-amber-400' : ''
                          }`}
                        >
                          {isPremium ? (
                            <Crown className="h-5 w-5 text-white" />
                          ) : (
                            <User className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">
                            {user?.user_metadata?.full_name || 'Usuario'}
                          </p>
                          <p className="text-sm text-white/70">{user?.email}</p>
                          {/* * Display tier name */}
                          <div className="mt-1 flex items-center gap-1.5">
                            <p className="text-xs text-white/60">Plan:</p>
                            <p
                              className={`text-xs font-semibold ${
                                isPremium ? 'text-amber-400' : 'text-white/80'
                              }`}
                            >
                              {tierName}
                            </p>
                            {isPremium && (
                              <Crown className="h-3 w-3 text-amber-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="py-2">
                      <button
                        type="button"
                        onClick={handleProfile}
                        className="flex w-full items-center space-x-3 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
                      >
                        <User className="h-4 w-4" />
                        <span>Mi Perfil</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center space-x-3 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                  <div
                    data-overlay-backdrop="mobile-user-menu"
                    className="fixed inset-0 z-[54]"
                    onClick={() => setShowUserMenu(false)}
                  />
                </>,
                overlayHost
              )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="black-theme-header sticky top-0 z-50 flex h-16 items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <RateSelector />
        <button
          type="button"
          onClick={toggleSidebar}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Ocultar sidebar' : 'Mostrar sidebar'}
          className="transition-ios focus-ring mr-3 min-h-[44px] min-w-[44px] rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white"
          title={isOpen ? 'Ocultar sidebar' : 'Mostrar sidebar'}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div className="flex items-center space-x-2 lg:space-x-4">
        <div className="relative">
          <button
            ref={notificationsButtonRef}
            type="button"
            onClick={handleNotificationClick}
            aria-expanded={showNotifications}
            aria-controls="notifications-panel"
            aria-label="Notificaciones"
            className="transition-ios focus-ring relative min-h-[44px] min-w-[44px] rounded-xl p-2 text-white/80 hover:scale-105 hover:bg-white/10 hover:text-white lg:rounded-2xl lg:p-3"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground shadow-ios">
                {notificationCount}
              </span>
            )}
          </button>

          {showNotifications &&
            overlayHost &&
            createPortal(
              <>
                <div
                  id="notifications-panel"
                  className="black-theme-card fixed z-[55] w-80 animate-scale-in rounded-2xl shadow-2xl"
                  style={
                    notificationsPanelStyle ?? {
                      top: '4.5rem',
                      right: '1.5rem',
                    }
                  }
                >
                  <div className="p-4">
                    <h4 className="mb-3 font-semibold text-text-primary">
                      Notificaciones
                    </h4>

                    {loadingNotifications ? (
                      <div className="py-6 text-center">
                        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        <p className="text-sm text-text-muted">
                          Cargando notificaciones...
                        </p>
                      </div>
                    ) : notifications.length > 0 ? (
                      <div className="space-y-3">
                        {notifications.slice(0, 5).map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            className={`focus-ring w-full rounded-xl p-3 text-left transition-colors ${
                              notification.is_read
                                ? 'bg-background-tertiary'
                                : 'border border-blue-200 bg-blue-50'
                            }`}
                            onClick={() =>
                              markNotificationAsRead(notification.id)
                            }
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-text-primary">
                                  {notification.title}
                                </p>
                                <p className="mt-1 text-xs text-text-muted">
                                  {notification.message}
                                </p>
                                <p className="mt-1 text-xs text-text-muted">
                                  {new Date(
                                    notification.created_at
                                  ).toLocaleDateString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              {!notification.is_read && (
                                <div className="ml-2 mt-1 h-2 w-2 rounded-full bg-blue-600" />
                              )}
                            </div>
                          </button>
                        ))}
                        {notificationCount > 0 && (
                          <button
                            type="button"
                            onClick={markAllAsRead}
                            className="w-full py-2 text-center text-xs text-blue-600 hover:text-blue-700"
                          >
                            Marcar todas como leídas
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <Bell className="mx-auto mb-2 h-8 w-8 text-text-muted" />
                        <p className="text-sm text-text-muted">
                          No hay notificaciones nuevas
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div
                  data-overlay-backdrop="notifications"
                  className="fixed inset-0 z-[54]"
                  onClick={() => setShowNotifications(false)}
                />
              </>,
              overlayHost
            )}
        </div>

        <div className="black-theme-card hidden items-center space-x-2 rounded-xl px-3 py-2 sm:flex lg:space-x-3 lg:rounded-2xl lg:px-4">
          <div className="text-right">
            <div className="flex items-center space-x-1">
              <Sparkles className="h-3 w-3 text-primary" />
              <p className="text-sm font-bold text-text-primary lg:text-lg">
                {formattedBalance}
              </p>
            </div>
            <p className="hidden text-xs text-text-muted lg:block">
              Tu dinero total
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            ref={desktopUserButtonRef}
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-expanded={showUserMenu}
            aria-controls="user-menu-desktop"
            aria-label={
              showUserMenu ? 'Cerrar menú de usuario' : 'Abrir menú de usuario'
            }
            className="black-theme-card focus-ring flex min-h-[44px] cursor-pointer items-center space-x-2 rounded-xl p-2 transition-all duration-200 hover:bg-white/5 lg:space-x-3 lg:rounded-2xl"
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg lg:h-10 lg:w-10 ${
                isPremium ? 'ring-2 ring-amber-400' : ''
              }`}
            >
              {isPremium ? (
                <Crown className="h-4 w-4 text-white lg:h-5 lg:w-5" />
              ) : (
                <User className="h-4 w-4 text-white lg:h-5 lg:w-5" />
              )}
            </div>
            <div className="hidden text-left lg:block">
              <p className="text-sm font-semibold text-text-primary">
                {user?.user_metadata?.full_name ||
                  user?.email?.split('@')[0] ||
                  'Usuario'}
              </p>
              <div className="flex items-center gap-1">
                <p className="text-xs text-text-muted">Plan: {tierName}</p>
                {isPremium && <Crown className="h-3 w-3 text-amber-400" />}
              </div>
            </div>
          </button>

          {showUserMenu &&
            overlayHost &&
            createPortal(
              <>
                <div
                  id="user-menu-desktop"
                  className="black-theme-card fixed z-[55] rounded-xl py-2 shadow-xl"
                  style={
                    desktopUserMenuStyle ?? {
                      top: '4.5rem',
                      right: '1.5rem',
                      width: '16rem',
                    }
                  }
                >
                  <div className="border-b border-white/10 px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 ${
                          isPremium ? 'ring-2 ring-amber-400' : ''
                        }`}
                      >
                        {isPremium ? (
                          <Crown className="h-5 w-5 text-white" />
                        ) : (
                          <User className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">
                          {user?.user_metadata?.full_name || 'Usuario'}
                        </p>
                        <p className="text-sm text-white/70">{user?.email}</p>
                        {/* * Display tier name */}
                        <div className="mt-1 flex items-center gap-1.5">
                          <p className="text-xs text-white/60">Plan:</p>
                          <p
                            className={`text-xs font-semibold ${
                              isPremium ? 'text-amber-400' : 'text-white/80'
                            }`}
                          >
                            {tierName}
                          </p>
                          {isPremium && (
                            <Crown className="h-3 w-3 text-amber-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <button
                      type="button"
                      onClick={handleProfile}
                      className="flex w-full items-center space-x-3 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
                    >
                      <User className="h-4 w-4" />
                      <span>Mi Perfil</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center space-x-3 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
                <div
                  data-overlay-backdrop="desktop-user-menu"
                  className="fixed inset-0 z-[54]"
                  onClick={() => setShowUserMenu(false)}
                />
              </>,
              overlayHost
            )}
        </div>
      </div>
    </header>
  );
}
