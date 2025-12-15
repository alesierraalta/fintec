'use client';

import { Bell, Sparkles, Menu, X, User, LogOut, Crown } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/contexts/sidebar-context';
import { useAuth } from '@/hooks/use-auth';
import { useSubscription } from '@/hooks/use-subscription';
import { useRepository } from '@/providers/repository-provider';
import type { Notification } from '@/types/notifications';
import { fromMinorUnits } from '@/lib/money';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useActiveUsdVesRate } from '@/lib/rates';
import { RateSelector } from '@/components/currency/rate-selector';

export function Header() {
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const { isOpen, isMobile, toggleSidebar } = useSidebar();
  const { user, signOut } = useAuth();
  const { tier, isPremium } = useSubscription();
  const router = useRouter();
  const repository = useRepository();
  const bcvRates = useBCVRates();
  const activeUsdVes = useActiveUsdVesRate();

  // Estado local sincronizado para evitar problemas de hidratación
  // Se inicializa como false (consistente con SSR) y se sincroniza después del mount
  const [clientIsMobile, setClientIsMobile] = useState(false);

  const memoizedLoadTotalBalance = useCallback(async () => {
    if (!user) return;
    try {
      const accounts = await repository.accounts.findByUserId(user.id);
      const total = accounts.reduce((sum, acc) => {
        const balanceMinor = Number(acc.balance) || 0;
        const balanceMajor = fromMinorUnits(balanceMinor, acc.currencyCode);

        if (acc.currencyCode === 'VES') {
          const rate = activeUsdVes || bcvRates.usd || 1;
          return sum + balanceMajor / rate;
        }
        return sum + balanceMajor;
      }, 0);
      setTotalBalance(total);
    } catch (error) {
      setTotalBalance(0);
    }
  }, [user, repository, bcvRates, activeUsdVes]);

  const memoizedLoadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingNotifications(true);
      const [unreadNotifications, count] = await Promise.all([
        repository.notifications.findUnreadByUserId(user.id),
        repository.notifications.countUnreadByUserId(user.id)
      ]);

      setNotifications(unreadNotifications);
      setNotificationCount(count);
    } catch (error) {
    } finally {
      setLoadingNotifications(false);
    }
  }, [user, repository]);

  useEffect(() => {
    if (user) {
      memoizedLoadNotifications();
      memoizedLoadTotalBalance();
    }
  }, [user, memoizedLoadNotifications, memoizedLoadTotalBalance]);

  // Sincronizar clientIsMobile con isMobile después del mount
  // Esto asegura consistencia durante la hidratación inicial
  useEffect(() => {
    setClientIsMobile(isMobile);
  }, [isMobile]);

  const handleNotificationClick = useCallback(async () => {
    if (!showNotifications) {
      await memoizedLoadNotifications();
    }
    setShowNotifications(!showNotifications);
  }, [showNotifications, memoizedLoadNotifications]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await repository.notifications.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setNotificationCount(prev => Math.max(0, prev - 1));
    } catch (error) {
    }
  }, [repository]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      await repository.notifications.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setNotificationCount(0);
    } catch (error) {
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

  const formattedBalance = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(totalBalance);
  }, [totalBalance]);

  // * Format tier name for display
  const tierName = useMemo(() => {
    if (tier === 'free') return 'Gratis';
    if (tier === 'base') return 'Base';
    if (tier === 'premium') return 'Premium';
    return 'Gratis';
  }, [tier]);

  if (clientIsMobile) {
    return (
      <header className="h-16 black-theme-header flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center">
          <RateSelector />
        </div>
        <Image
          src="/finteclogodark.jpg"
          alt="FinTec Logo"
          fill
          className="object-contain h-full w-auto"
          unoptimized
        />
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center black-theme-card rounded-xl p-2 hover:bg-white/5 transition-all duration-200 cursor-pointer focus:outline-none"
          >
            <div className={`h-8 w-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-lg ${isPremium ? 'ring-2 ring-amber-400' : ''
              }`}>
              {isPremium ? (
                <Crown className="h-4 w-4 text-white" />
              ) : (
                <User className="h-4 w-4 text-white" />
              )}
            </div>
          </button>

          {showUserMenu && (
            <>
              <div className="absolute right-0 top-full mt-2 w-64 black-theme-card rounded-xl shadow-xl py-2 z-50">
                <div className="px-4 py-3 border-b border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className={`h-10 w-10 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center ${isPremium ? 'ring-2 ring-amber-400' : ''
                      }`}>
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
                      <div className="flex items-center gap-1.5 mt-1">
                        <p className="text-xs text-white/60">Plan:</p>
                        <p className={`text-xs font-semibold ${isPremium ? 'text-amber-400' : 'text-white/80'
                          }`}>
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
                    onClick={handleProfile}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Mi Perfil</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
            </>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="h-16 black-theme-header flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <RateSelector />
        <button
          onClick={toggleSidebar}
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-ios mr-3"
          title={isOpen ? 'Ocultar sidebar' : 'Mostrar sidebar'}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div className="flex items-center space-x-2 lg:space-x-4">
        <div className="relative">
          <button
            onClick={handleNotificationClick}
            className="relative p-2 lg:p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl lg:rounded-2xl transition-ios hover:scale-105"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-xs font-bold text-destructive-foreground rounded-full flex items-center justify-center shadow-ios">
                {notificationCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="absolute right-0 top-full mt-2 w-80 black-theme-card rounded-2xl shadow-2xl z-50 animate-scale-in">
                <div className="p-4">
                  <h4 className="font-semibold text-text-primary mb-3">Notificaciones</h4>

                  {loadingNotifications ? (
                    <div className="text-center py-6">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm text-text-muted">Cargando notificaciones...</p>
                    </div>
                  ) : notifications.length > 0 ? (
                    <div className="space-y-3">
                      {notifications.slice(0, 5).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-xl cursor-pointer transition-colors ${notification.is_read
                            ? 'bg-background-tertiary'
                            : 'bg-blue-50 border border-blue-200'
                            }`}
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-text-primary">{notification.title}</p>
                              <p className="text-xs text-text-muted mt-1">{notification.message}</p>
                              <p className="text-xs text-text-muted mt-1">
                                {new Date(notification.created_at).toLocaleDateString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full mt-1 ml-2" />
                            )}
                          </div>
                        </div>
                      ))}
                      {notificationCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="w-full text-center text-xs text-blue-600 hover:text-blue-700 py-2"
                        >
                          Marcar todas como leídas
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Bell className="h-8 w-8 text-text-muted mx-auto mb-2" />
                      <p className="text-sm text-text-muted">No hay notificaciones nuevas</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
            </>
          )}
        </div>

        <div className="hidden sm:flex items-center space-x-2 lg:space-x-3 black-theme-card rounded-xl lg:rounded-2xl px-3 lg:px-4 py-2">
          <div className="text-right">
            <div className="flex items-center space-x-1">
              <Sparkles className="h-3 w-3 text-accent-primary" />
              <p className="text-sm lg:text-lg font-bold text-text-primary">{formattedBalance}</p>
            </div>
            <p className="text-xs text-text-muted hidden lg:block">Tu dinero total</p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 lg:space-x-3 black-theme-card rounded-xl lg:rounded-2xl p-2 hover:bg-white/5 transition-all duration-200 cursor-pointer focus:outline-none"
          >
            <div className={`h-8 w-8 lg:h-10 lg:w-10 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-lg ${isPremium ? 'ring-2 ring-amber-400' : ''
              }`}>
              {isPremium ? (
                <Crown className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              ) : (
                <User className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              )}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-semibold text-text-primary">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
              </p>
              <div className="flex items-center gap-1">
                <p className="text-xs text-text-muted">Plan: {tierName}</p>
                {isPremium && (
                  <Crown className="h-3 w-3 text-amber-400" />
                )}
              </div>
            </div>
          </button>


          {showUserMenu && (
            <>
              <div className="absolute right-0 top-full mt-2 w-64 black-theme-card rounded-xl shadow-xl py-2 z-50">
                <div className="px-4 py-3 border-b border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className={`h-10 w-10 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center ${isPremium ? 'ring-2 ring-amber-400' : ''
                      }`}>
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
                      <div className="flex items-center gap-1.5 mt-1">
                        <p className="text-xs text-white/60">Plan:</p>
                        <p className={`text-xs font-semibold ${isPremium ? 'text-amber-400' : 'text-white/80'
                          }`}>
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
                    onClick={handleProfile}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Mi Perfil</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
