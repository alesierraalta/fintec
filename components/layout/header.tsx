'use client';

import { Bell, Search, Sparkles, Heart, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useSidebar } from '@/contexts/sidebar-context';

export function Header() {
  const [notifications, setNotifications] = useState(2);
  const [showNotifications, setShowNotifications] = useState(false);
  const { isOpen, isMobile, toggleSidebar } = useSidebar();

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    // Mark notifications as read when opened
    if (!showNotifications && notifications > 0) {
      setTimeout(() => setNotifications(0), 1000);
    }
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
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-accent-warm text-xs font-bold text-background-primary rounded-full flex items-center justify-center shadow-lg">
                  {notifications}
                </span>
              )}
            </button>

            {/* Mobile Notifications Dropdown */}
            {showNotifications && (
              <>
                <div className="absolute right-0 top-full mt-2 w-80 bg-background-elevated border border-border-secondary rounded-2xl shadow-2xl z-50 animate-scale-in">
                  <div className="p-4">
                    <h4 className="font-semibold text-text-primary mb-3">Notificaciones</h4>
                    
                    {notifications > 0 ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-background-tertiary rounded-xl">
                          <p className="text-sm font-medium text-text-primary">¡Bienvenido a Cashew!</p>
                          <p className="text-xs text-text-muted mt-1">Tu aplicación de finanzas personales está lista para usar.</p>
                        </div>
                        <div className="p-3 bg-background-tertiary rounded-xl">
                          <p className="text-sm font-medium text-text-primary">Tutorial disponible</p>
                          <p className="text-xs text-text-muted mt-1">Aprende a usar todas las funciones con nuestro tutorial interactivo.</p>
                        </div>
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
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-accent-warm text-xs font-bold text-background-primary rounded-full flex items-center justify-center shadow-lg">
                {notifications}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div className="absolute right-0 top-full mt-2 w-80 bg-background-elevated border border-border-secondary rounded-2xl shadow-2xl z-50 animate-scale-in">
                <div className="p-4">
                  <h4 className="font-semibold text-text-primary mb-3">Notificaciones</h4>
                  
                  {notifications > 0 ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-background-tertiary rounded-xl">
                        <p className="text-sm font-medium text-text-primary">¡Bienvenido a Cashew!</p>
                        <p className="text-xs text-text-muted mt-1">Tu aplicación de finanzas personales está lista para usar.</p>
                      </div>
                      <div className="p-3 bg-background-tertiary rounded-xl">
                        <p className="text-sm font-medium text-text-primary">Tutorial disponible</p>
                        <p className="text-xs text-text-muted mt-1">Aprende a usar todas las funciones con nuestro tutorial interactivo.</p>
                      </div>
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
              <p className="text-sm lg:text-lg font-bold text-text-primary">$12,450.50</p>
            </div>
            <p className="text-xs text-text-muted hidden lg:block">Tu dinero total</p>
          </div>
        </div>

        {/* Profile - iOS-like */}
        <div className="flex items-center space-x-2 lg:space-x-3 bg-background-tertiary rounded-xl lg:rounded-2xl p-2 border border-border-primary hover:bg-background-elevated transition-all duration-200 cursor-pointer">
          <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-lg">
            <Heart className="h-4 w-4 lg:h-5 lg:w-5 text-background-primary" />
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-sm font-semibold text-text-primary">Mi Perfil</p>
            <p className="text-xs text-text-muted">Ver configuración</p>
          </div>
        </div>
      </div>
    </header>
  );
}