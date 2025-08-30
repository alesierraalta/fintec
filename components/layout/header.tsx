'use client';

import { Bell, Search, Sparkles, Heart, Menu, X, User, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/contexts/sidebar-context';
import { useAuth } from '@/hooks/use-auth';
import { useRepository } from '@/providers/repository-provider';
import type { Notification } from '@/types/notifications';
import { fromMinorUnits } from '@/lib/money';
import { useBCVRates } from '@/hooks/use-bcv-rates';

export function Header() {
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const { isOpen, isMobile, toggleSidebar } = useSidebar();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const repository = useRepository();
  const bcvRates = useBCVRates();

  // Load notifications and balance when user is available
  useEffect(() => {
    if (user) {
      loadNotifications();
      loadTotalBalance();
    }
  }, [user]);

  // Reload balance when BCV rates change
  useEffect(() => {
    if (user) {
      loadTotalBalance();
    }
  }, [bcvRates]);

  const loadTotalBalance = async () => {
    if (!user) return;
    try {
      const accounts = await repository.accounts.findByUserId(user.id);
      const total = accounts.reduce((sum, acc) => {
        const balanceMinor = Number(acc.balance) || 0;
        const balanceMajor = fromMinorUnits(balanceMinor, acc.currencyCode);
        
        // Apply BCV conversion for VES currency
        if (acc.currencyCode === 'VES') {
          return sum + (balanceMajor / bcvRates.usd);
        }
        return sum + balanceMajor;
      }, 0);
      setTotalBalance(total);
    } catch (error) {
      setTotalBalance(0);
    }
  };

  const loadNotifications = async () => {
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
  };

  const handleNotificationClick = async () => {
    if (!showNotifications) {
      // Load latest notifications when opening
      await loadNotifications();
    }
    setShowNotifications(!showNotifications);
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await repository.notifications.markAsRead(notificationId);
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setNotificationCount(prev => Math.max(0, prev - 1));
    } catch (error) {
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      await repository.notifications.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setNotificationCount(0);
    } catch (error) {
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/login');
  };

  const handleProfile = () => {
    router.push('/profile');
    setShowUserMenu(false);
  };

  if (isMobile) {
    // Mobile App Header - Native-like
    return (
      <header className="h-14 bg-background-primary flex items-center justify-between px-4 border-b border-border-primary/50">
        {/* Left - Profile/Menu */}
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-lg">
            <Heart className="h-4 w-4 text-background-primary" />
          </div>
        </div>

        {/* Center - App Title */}
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold text-text-primary tracking-tight">Cashew</h1>
        </div>

        {/* Right - Notifications */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <button 
              onClick={handleNotificationClick}
              className="relative p-2 text-text-muted hover:text-accent-primary rounded-xl transition-all duration-200"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-accent-warm text-xs font-bold text-background-primary rounded-full flex items-center justify-center shadow-lg">
                  {notificationCount}
                </span>
              )}
            </button>

            {/* Mobile Notifications Dropdown */}
            {showNotifications && (
              <>
                <div className="absolute right-0 top-full mt-2 w-80 bg-background-elevated border border-border-secondary rounded-2xl shadow-2xl z-50 animate-scale-in">
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
                            className={`p-3 rounded-xl cursor-pointer transition-colors ${
                              notification.is_read 
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
        </div>
      </header>
    );
  }

  // Desktop Header
  return (
    <header className="h-16 bg-background-primary border-b border-border-primary flex items-center justify-between px-6">
      {/* Left side - Menu + Search */}
      <div className="flex items-center flex-1">
        {/* Sidebar Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="p-2 text-text-muted hover:text-accent-primary hover:bg-background-tertiary rounded-xl transition-all duration-200 mr-3"
          title={isOpen ? "Ocultar sidebar" : "Mostrar sidebar"}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Search */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              placeholder="Busca lo que necesites... 🔍"
              className="w-full pl-12 pr-4 py-3 bg-background-tertiary border border-border-primary rounded-2xl text-text-primary placeholder-text-muted focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {/* Actions - Responsive */}
      <div className="flex items-center space-x-2 lg:space-x-4">


        {/* Notifications - iOS-like */}
        <div className="relative">
          <button 
            onClick={handleNotificationClick}
            className="relative p-2 lg:p-3 text-text-muted hover:text-accent-primary hover:bg-background-tertiary rounded-xl lg:rounded-2xl transition-all duration-200 hover:scale-105"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-accent-warm text-xs font-bold text-background-primary rounded-full flex items-center justify-center shadow-lg">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div className="absolute right-0 top-full mt-2 w-80 bg-background-elevated border border-border-secondary rounded-2xl shadow-2xl z-50 animate-scale-in">
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
                          className={`p-3 rounded-xl cursor-pointer transition-colors ${
                            notification.is_read 
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

        {/* Balance Display - Responsive */}
        <div className="hidden sm:flex items-center space-x-2 lg:space-x-3 bg-background-tertiary rounded-xl lg:rounded-2xl px-3 lg:px-4 py-2 border border-border-primary">
          <div className="text-right">
            <div className="flex items-center space-x-1">
              <Sparkles className="h-3 w-3 text-accent-primary" />
              <p className="text-sm lg:text-lg font-bold text-text-primary">${totalBalance.toFixed(2)}</p>
            </div>
            <p className="text-xs text-text-muted hidden lg:block">Tu dinero total</p>
          </div>
        </div>

        {/* Profile - iOS-like */}
        <div className="relative">
          <div 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 lg:space-x-3 bg-background-tertiary rounded-xl lg:rounded-2xl p-2 border border-border-primary hover:bg-background-elevated transition-all duration-200 cursor-pointer"
          >
            <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-lg">
              <User className="h-4 w-4 lg:h-5 lg:w-5 text-background-primary" />
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-semibold text-text-primary">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
              </p>
              <p className="text-xs text-text-muted">Ver perfil</p>
            </div>
          </div>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <>
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user?.user_metadata?.full_name || 'Usuario'}
                      </p>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="py-2">
                  <button
                    onClick={handleProfile}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Mi Perfil</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
