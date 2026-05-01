import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bell,
  Search,
  Menu,
  X,
  User,
  Settings,
  LogOut,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { createPortal } from 'react-dom';
import RateSelector from '@/components/currency/rate-selector';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

interface HeaderProps {
  onMenuClick: () => void;
  isMobileMenuOpen: boolean;
}

export default function Header({ onMenuClick, isMobileMenuOpen }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [overlayHost, setOverlayHost] = useState<HTMLElement | null>(null);
  const [desktopUserMenuStyle, setDesktopUserMenuStyle] = useState<any>(null);
  const [desktopAddMenuStyle, setDesktopAddMenuStyle] = useState<any>(null);
  const userMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const addMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const initialSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  // Sync search query with URL changes
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(
        `/transactions?search=${encodeURIComponent(searchQuery.trim())}`
      );
    }
  };

  useEffect(() => {
    setMounted(true);
    setOverlayHost(document.body);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    handleResize();
    handleScroll();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (showUserMenu && userMenuTriggerRef.current) {
      const rect = userMenuTriggerRef.current.getBoundingClientRect();
      setDesktopUserMenuStyle({
        top: `${rect.bottom + 8}px`,
        right: `${window.innerWidth - rect.right}px`,
        width: '260px',
      });
    }
  }, [showUserMenu]);

  useEffect(() => {
    if (showAddMenu && addMenuTriggerRef.current) {
      const rect = addMenuTriggerRef.current.getBoundingClientRect();
      setDesktopAddMenuStyle({
        top: `${rect.bottom + 8}px`,
        left: `${rect.left}px`,
        width: '220px',
      });
    }
  }, [showAddMenu]);

  const handleProfile = () => {
    setShowUserMenu(false);
    router.push('/profile');
  };

  const handleSettings = () => {
    setShowUserMenu(false);
    router.push('/settings');
  };

  const handleSecurity = () => {
    setShowUserMenu(false);
    router.push('/security');
  };

  const handleSupport = () => {
    setShowUserMenu(false);
    router.push('/support');
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    await signOut();
    router.push('/login');
  };

  const getPageTitle = () => {
    const path = pathname.split('/')[1];
    switch (path) {
      case '':
        return 'Dashboard';
      case 'accounts':
        return 'Mis Cuentas';
      case 'transactions':
        return 'Transacciones';
      case 'budget':
        return 'Presupuestos';
      case 'savings':
        return 'Ahorros';
      case 'crypto':
        return 'Cripto';
      case 'cards':
        return 'Tarjetas';
      case 'transfers':
        return 'Transferencias';
      case 'settings':
        return 'Configuración';
      case 'profile':
        return 'Perfil';
      case 'security':
        return 'Seguridad';
      case 'support':
        return 'Soporte';
      default:
        return 'FinTec';
    }
  };

  const notifications = [
    {
      id: 1,
      title: 'Transferencia recibida',
      description: 'Has recibido $120.00 de Juan Pérez',
      time: 'Hace 5 min',
      read: false,
      type: 'transfer',
    },
    {
      id: 2,
      title: 'Límite de presupuesto',
      description: 'Has alcanzado el 80% de tu presupuesto de Alimentación',
      time: 'Hace 2 horas',
      read: false,
      type: 'budget',
    },
    {
      id: 3,
      title: 'Nueva función disponible',
      description: 'Ya puedes conectar tus cuentas de Binance',
      time: 'Hace 1 día',
      read: true,
      type: 'feature',
    },
  ];

  if (!mounted) return null;

  if (isMobile) {
    return (
      <header className="ios-header sticky top-0 z-50 flex w-full max-w-full shrink-0 flex-col overflow-x-hidden shadow-sm">
        <div
          aria-hidden="true"
          className="w-full shrink-0"
          style={{ height: 'env(safe-area-inset-top)' }}
        ></div>
        <div className="flex h-14 w-full shrink-0 items-center justify-between px-4">
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={onMenuClick}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5 text-foreground transition-all hover:scale-95 active:scale-90"
              aria-label={isMobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isMobileMenuOpen ? 'close' : 'open'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isMobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </motion.div>
              </AnimatePresence>
            </button>
            <h1 className="text-ios-title font-bold tracking-tight text-foreground">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              ref={userMenuTriggerRef}
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-expanded={showUserMenu}
              aria-haspopup="true"
              aria-label={
                showUserMenu
                  ? 'Cerrar menú de usuario'
                  : 'Abrir menú de usuario'
              }
              className="ios-card focus-ring flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center rounded-xl p-2 transition-all duration-200 hover:bg-foreground/5"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg ${
                  showUserMenu
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                    : ''
                }`}
              >
                <User className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile User Menu Portal */}
        {showUserMenu &&
          overlayHost &&
          createPortal(
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="ios-card fixed bottom-0 left-0 right-0 z-[60] rounded-t-3xl p-6 shadow-2xl"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">
                        {user?.user_metadata?.name ||
                          user?.email?.split('@')[0] ||
                          'Usuario'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user?.email || 'usuario@ejemplo.com'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUserMenu(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                  <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Tema
                  </p>
                  <ThemeToggle isMinimized={true} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleProfile}
                    className="flex flex-col items-center justify-center space-y-2 rounded-2xl bg-foreground/5 p-4 text-foreground transition-all active:scale-95"
                  >
                    <User className="h-6 w-6" />
                    <span className="text-xs font-medium">Perfil</span>
                  </button>
                  <button
                    onClick={handleSecurity}
                    className="flex flex-col items-center justify-center space-y-2 rounded-2xl bg-foreground/5 p-4 text-foreground transition-all active:scale-95"
                  >
                    <ShieldCheck className="h-6 w-6" />
                    <span className="text-xs font-medium">Seguridad</span>
                  </button>
                  <button
                    onClick={handleSettings}
                    className="flex flex-col items-center justify-center space-y-2 rounded-2xl bg-foreground/5 p-4 text-foreground transition-all active:scale-95"
                  >
                    <Settings className="h-6 w-6" />
                    <span className="text-xs font-medium">Ajustes</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex flex-col items-center justify-center space-y-2 rounded-2xl bg-red-500/10 p-4 text-red-400 transition-all active:scale-95"
                  >
                    <LogOut className="h-6 w-6" />
                    <span className="text-xs font-medium">Salir</span>
                  </button>
                </div>
              </motion.div>
              <div
                className="fixed inset-0 z-[59] bg-black/40 backdrop-blur-sm"
                onClick={() => setShowUserMenu(false)}
              />
            </>,
            overlayHost
          )}
      </header>
    );
  }

  return (
    <header className="ios-header sticky top-0 z-50 flex h-16 items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <RateSelector />

        <div className="relative">
          <button
            type="button"
            ref={addMenuTriggerRef}
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:scale-105 active:scale-95"
            title="Añadir nuevo"
            aria-expanded={showAddMenu}
            aria-haspopup="true"
          >
            <Plus className="h-5 w-5" />
          </button>

          {/* Add Menu Dropdown Portal */}
          {showAddMenu &&
            overlayHost &&
            createPortal(
              <>
                <div
                  className="ios-card fixed z-[55] rounded-xl py-2 shadow-xl"
                  style={
                    desktopAddMenuStyle ?? {
                      top: '4.5rem',
                      left: '8rem',
                      width: '220px',
                    }
                  }
                >
                  <div className="flex flex-col py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMenu(false);
                        router.push('/transactions?action=add');
                      }}
                      className="flex w-full items-center px-4 py-3 text-sm text-foreground transition-colors hover:bg-foreground/5"
                    >
                      <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Plus className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="font-medium">Nueva Transacción</span>
                        <span className="text-[10px] text-muted-foreground">
                          Ingreso o Gasto
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMenu(false);
                        router.push('/transfers');
                      }}
                      className="flex w-full items-center px-4 py-3 text-sm text-foreground transition-colors hover:bg-foreground/5"
                    >
                      <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                        <RefreshCw className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="font-medium">Transferencia</span>
                        <span className="text-[10px] text-muted-foreground">
                          Mover entre cuentas
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
                <div
                  className="fixed inset-0 z-[54]"
                  onClick={() => setShowAddMenu(false)}
                />
              </>,
              overlayHost
            )}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-8">
        <div
          className={`relative flex w-full max-w-md items-center transition-all duration-300 ${
            searchFocused ? 'max-w-xl' : 'max-w-md'
          }`}
        >
          <div className="absolute left-3 text-muted-foreground">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Buscar transacciones (Presiona Enter)..."
            className="h-10 w-full rounded-full bg-foreground/5 pl-10 pr-4 text-sm outline-none transition-all focus:bg-foreground/10 focus:ring-2 focus:ring-primary/20"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch(e);
              }
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            type="button"
            aria-label="Notificaciones"
            onClick={() => setShowNotifications(!showNotifications)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5 text-foreground transition-all hover:scale-105 active:scale-95"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500"></span>
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="ios-card absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5"
              >
                <div className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">
                      Notificaciones
                    </h3>
                  </div>
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="mb-3 rounded-full bg-foreground/5 p-3">
                      <Bell className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Sin notificaciones nuevas
                    </p>
                    <p className="mx-auto mt-1 max-w-[200px] text-xs text-muted-foreground">
                      El centro de notificaciones estará disponible
                      próximamente.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            type="button"
            ref={userMenuTriggerRef}
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-expanded={showUserMenu}
            aria-haspopup="true"
            aria-label={
              showUserMenu ? 'Cerrar menú de usuario' : 'Abrir menú de usuario'
            }
            className="ios-card focus-ring flex min-h-[44px] cursor-pointer items-center space-x-2 rounded-xl p-2 transition-all duration-200 hover:bg-foreground/5 lg:space-x-3 lg:rounded-2xl"
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg lg:h-10 lg:w-10 ${
                showUserMenu
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  : ''
              }`}
            >
              <User className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden flex-col items-start lg:flex">
              <p className="max-w-[120px] truncate text-xs font-bold tracking-tight text-foreground">
                {user?.user_metadata?.name ||
                  user?.email?.split('@')[0] ||
                  'Usuario'}
              </p>
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                  En línea
                </span>
              </div>
            </div>
            <ChevronDown
              className={`hidden h-3 w-3 text-muted-foreground transition-transform duration-300 lg:block ${
                showUserMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* User Menu Dropdown Portal */}
          {showUserMenu &&
            overlayHost &&
            createPortal(
              <>
                <div
                  id="user-menu-desktop"
                  className="ios-card fixed z-[55] rounded-xl py-2 shadow-xl"
                  style={
                    desktopUserMenuStyle ?? {
                      top: '4.5rem',
                      right: '1.5rem',
                      width: '260px',
                    }
                  }
                >
                  <div className="flex flex-col">
                    <div className="border-b border-white/5 px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {user?.user_metadata?.name ||
                              user?.email?.split('@')[0] ||
                              'Usuario'}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user?.email || 'usuario@ejemplo.com'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Tema
                      </p>
                      <ThemeToggle isMinimized={true} />
                    </div>

                    <div className="py-2">
                      <button
                        type="button"
                        onClick={handleProfile}
                        className="flex w-full items-center space-x-3 px-4 py-2 text-sm text-foreground/80 transition-colors hover:bg-foreground/5"
                      >
                        <User className="h-4 w-4" />
                        <span>Mi Perfil</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSecurity}
                        className="flex w-full items-center space-x-3 px-4 py-2 text-sm text-foreground/80 transition-colors hover:bg-foreground/5"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Seguridad</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSettings}
                        className="flex w-full items-center space-x-3 px-4 py-2 text-sm text-foreground/80 transition-colors hover:bg-foreground/5"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Configuración</span>
                      </button>
                    </div>
                    <div className="border-t border-white/5 pt-2">
                      <button
                        type="button"
                        onClick={handleSupport}
                        className="flex w-full items-center space-x-3 px-4 py-2 text-sm text-foreground/80 transition-colors hover:bg-foreground/5"
                      >
                        <HelpCircle className="h-4 w-4" />
                        <span>Soporte Técnico</span>
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
