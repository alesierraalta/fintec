'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/main-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AccountForm } from '@/components/forms/account-form';
import { Button } from '@/components/ui';
import { useModal } from '@/hooks';
import { useRepository } from '@/providers/repository-provider';
import { useAuth } from '@/hooks/use-auth';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import { useOptimizedData } from '@/hooks/use-optimized-data';
import { Account } from '@/types';
import { fromMinorUnits } from '@/lib/money';
import { formatCurrencyWithBCV } from '@/lib/currency-ves';
import { 
  Plus, 
  Wallet, 
  CreditCard, 
  Banknote, 
  TrendingUp,
  TrendingDown,
  PiggyBank,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Bitcoin,
  DollarSign,
  Sparkles,
  Target,
  Award,
  Star,
  History,
  Settings
} from 'lucide-react';
import { BCVRates } from '@/components/currency/bcv-rates';
import { BinanceRatesComponent } from '@/components/currency/binance-rates';
import { RatesHistory } from '@/components/currency/rates-history';
import { BalanceAlertSettings } from '@/components/forms/balance-alert-settings';
import { BalanceAlertIndicator } from '@/components/accounts/balance-alert-indicator';
import { useBalanceAlerts } from '@/hooks/use-balance-alerts';
import { logger } from '@/lib/utils/logger';

// Componente NumberTicker simulado (efecto psicológico de progreso)
const NumberTicker = ({ value, prefix = '', suffix = '', isVisible = true }: {
  value: number;
  prefix?: string;
  suffix?: string;
  isVisible?: boolean;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (!isVisible) return;
    
    const duration = 1000;
    const steps = 50;
    const stepValue = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value, isVisible]);
  
  return (
    <span>
      {prefix}{isVisible ? displayValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '••••••'}{suffix}
    </span>
  );
};

const accountIcons = {
  BANK: Banknote,
  CARD: CreditCard,
  CASH: Wallet,
  SAVINGS: PiggyBank,
  INVESTMENT: TrendingUp,
  CRYPTO: Bitcoin,
};

// Animaciones
const fadeInUp = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -20, opacity: 0 }
};

const cardHover = {
  initial: { scale: 1 },
  whileHover: { scale: 1.02, y: -2 },
  transition: { type: "spring" as const, stiffness: 400, damping: 25 }
};

export default function AccountsPage() {
  const { isOpen, openModal, closeModal } = useModal();
  const { user } = useAuth();
  const repository = useRepository();
  const bcvRates = useBCVRates();
  const { rates: binanceRates } = useBinanceRates();
  const [showBalances, setShowBalances] = useState(true);
  const [showRatesHistory, setShowRatesHistory] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [selectedAccountForAlert, setSelectedAccountForAlert] = useState<Account | null>(null);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const { checkAlerts } = useBalanceAlerts();

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.id) {
        // No user authenticated, show empty state or redirect to login
        setAccounts([]);
        setError('Debes iniciar sesión para ver tus cuentas');
        return;
      }
      
      const userAccounts = await repository.accounts.findByUserId(user.id);
      setAccounts(userAccounts);
      
      // Check for balance alerts after loading accounts
      await checkAlerts(userAccounts);
    } catch (err) {
      logger.error('Error loading accounts:', err);
      setError('Error al cargar las cuentas');
    } finally {
      setLoading(false);
    }
  }, [user, repository.accounts, checkAlerts]);

  // Load accounts from database
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openDropdown) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDropdown]);

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    openModal();
  };

  const handleNewAccount = () => {
    setSelectedAccount(null);
    openModal();
  };

  const handleAccountSaved = () => {
    closeModal();
    loadAccounts();
  };

  const handleDeleteAccount = async (account: Account) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la cuenta "${account.name}"?`)) {
      return;
    }
    
    try {
      await repository.accounts.delete(account.id);
      setOpenDropdown(null);
      loadAccounts();
    } catch (err) {
      alert('Error al eliminar la cuenta');
    }
  };

  const toggleDropdown = (accountId: string) => {
    setOpenDropdown(openDropdown === accountId ? null : accountId);
  };

  const handleAlertSettings = (account: Account) => {
    setSelectedAccountForAlert(account);
    setShowAlertSettings(true);
    setOpenDropdown(null);
  };

  const handleCloseAlertSettings = () => {
    setShowAlertSettings(false);
    setSelectedAccountForAlert(null);
    loadAccounts(); // Reload to get updated alert settings
  };

  const formatBalance = (balanceMinor: number, currency: string) => {
    return formatCurrencyWithBCV(balanceMinor, currency, {
      showUSDEquivalent: currency === 'VES',
      locale: 'es-ES'
    });
  };

  // Convertir balance a USD
  const convertToUSD = useCallback((balanceMinor: number, currencyCode: string): number => {
    if (currencyCode === 'USD') return balanceMinor / 100;
    
    const balanceMajor = balanceMinor / 100;
    
    if (currencyCode === 'VES') {
      // Usar tasa promedio de Binance
      return balanceMajor / binanceRates.usd_ves;
    }
    
    // Agregar más monedas según necesidad
    return balanceMajor;
  }, [binanceRates]);

  // Cálculo optimizado con tasas BCV reales
  const totalBalance = accounts.reduce((sum, acc) => {
    const balanceMinor = Number(acc.balance) || 0;
    const balanceMajor = fromMinorUnits(balanceMinor, acc.currencyCode);
    
    if (acc.currencyCode === 'VES') {
      return sum + (balanceMajor / bcvRates.usd);
    }
    return sum + balanceMajor;
  }, 0);
  
  // Default balance growth to 0 (could be calculated from transaction history if needed)
  const balanceGrowth = 0;

  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-8 animate-fade-in no-horizontal-scroll w-full">
          {/* iOS-style Header - Enhanced Mobile Optimized */}
          <div className="text-center py-6 px-4 sm:py-8 md:py-10">
            {/* Status Indicator with Enhanced Animation */}
            <motion.div 
              className="inline-flex items-center space-x-3 text-muted-foreground mb-4 sm:mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="relative">
                <div className="w-3 h-3 bg-gradient-to-r from-primary to-blue-500 rounded-full animate-pulse shadow-lg shadow-primary/30"></div>
                <div className="absolute inset-0 w-3 h-3 bg-gradient-to-r from-primary to-blue-500 rounded-full animate-ping opacity-20"></div>
              </div>
              <span className="text-ios-caption font-semibold tracking-wide uppercase">Centro Financiero</span>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-1 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-1 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </motion.div>
            
            {/* Enhanced Title with Visual Elements */}
            <motion.div
              className="relative mb-6 sm:mb-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            >
              {/* Background Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-blue-500/10 to-green-500/10 blur-3xl rounded-full scale-150 opacity-60"></div>
              
              {/* Main Title */}
              <h1 className="relative text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-primary via-blue-600 to-green-500 bg-clip-text text-transparent bg-size-200 animate-gradient">
                  💼 Mis Cuentas
                </span>
              </h1>
              
              {/* Decorative Elements */}
              <div className="flex items-center justify-center space-x-4 mb-4">
                <motion.div 
                  className="w-12 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
                  initial={{ width: 0 }}
                  animate={{ width: 48 }}
                  transition={{ duration: 1, delay: 0.8 }}
                ></motion.div>
                <motion.div
                  className="p-2 rounded-full bg-gradient-to-r from-primary/20 to-blue-500/20 backdrop-blur-sm border border-primary/30"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6, delay: 1 }}
                >
                  <Wallet className="h-4 w-4 text-primary" />
                </motion.div>
                <motion.div 
                  className="w-12 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
                  initial={{ width: 0 }}
                  animate={{ width: 48 }}
                  transition={{ duration: 1, delay: 0.8 }}
                ></motion.div>
              </div>
            </motion.div>
            
            {/* Enhanced Description with Stats Preview */}
            <motion.div
              className="space-y-3 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <p className="text-base sm:text-lg text-muted-foreground font-light leading-relaxed px-4 max-w-2xl mx-auto">
                Controla y optimiza tu patrimonio financiero desde un solo lugar
              </p>
              
              {/* Quick Stats Badges */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                <motion.div 
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary/10 to-blue-500/10 backdrop-blur-sm rounded-full px-4 py-2 border border-primary/20"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-ios-caption font-medium text-foreground">{accounts.length} Cuenta{accounts.length !== 1 ? 's' : ''}</span>
                </motion.div>
                
                <motion.div 
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-full px-4 py-2 border border-green-500/20"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-ios-caption font-medium text-foreground">+{balanceGrowth.toFixed(1)}% este mes</span>
                </motion.div>
              </div>
            </motion.div>
            
            {/* Quick Actions Header - Mobile Responsive */}
            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4 px-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.button
                className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 text-sm font-medium ${
                  showBalances 
                    ? 'bg-muted hover:bg-muted/80 text-muted-foreground' 
                    : 'bg-primary hover:bg-primary/90 text-white shadow-sm'
                }`}
                onClick={() => setShowBalances(!showBalances)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>{showBalances ? 'Ocultar Saldos' : 'Mostrar Saldos'}</span>
              </motion.button>
              
              <motion.button
                className="relative w-full sm:w-auto px-6 py-3 rounded-xl text-white font-medium shadow-lg overflow-hidden group transition-all duration-300 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary"
                onClick={handleNewAccount}
                whileHover={{ scale: 1.02, boxShadow: "0 10px 25px rgba(59, 130, 246, 0.4)" }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></div>
                <div className="relative flex items-center justify-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span className="hidden sm:inline">Nueva Cuenta</span>
                  <span className="sm:hidden">Agregar Cuenta</span>
                  <Sparkles className="h-4 w-4" />
                </div>
              </motion.button>
            </motion.div>

            {/* Achievement Badge */}
            {accounts.length > 0 && (
              <motion.div 
                className="inline-flex items-center space-x-2 bg-card/80 backdrop-blur-sm rounded-2xl px-4 py-2 border border-border/40"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Star className="h-4 w-4 text-warning-500" />
                <span className="text-ios-caption text-muted-foreground font-medium">
                  {accounts.length >= 5 ? '🏆 Maestro Financiero' : 
                   accounts.length >= 3 ? '🥉 Organizador Avanzado' : 
                   accounts.length >= 1 ? '🌟 ¡Buen Comienzo!' : ''}
                </span>
              </motion.div>
            )}
          </div>

          {/* iOS-style Summary Cards - Mobile First Responsive */}
          <motion.div 
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:gap-8 w-full no-horizontal-scroll"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
            initial="hidden"
            animate="show"
          >
            {/* Balance Total Card - iOS Style Mobile Responsive */}
            <motion.div 
              className="black-theme-card rounded-3xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 group"
              variants={fadeInUp}
              {...cardHover}
            >
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">BALANCE TOTAL</h3>
              </div>
              <p className="text-2xl sm:text-3xl font-light text-foreground mb-2">
                {showBalances ? (
                  <NumberTicker 
                    value={totalBalance} 
                    prefix="$" 
                    isVisible={showBalances} 
                  />
                ) : '••••••'}
              </p>
              {balanceGrowth !== 0 && (
                <motion.div 
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {balanceGrowth > 0 ? (
                    <TrendingUp className="h-4 w-4 text-success-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-error-600" />
                  )}
                  <span className={`text-ios-footnote font-medium ${balanceGrowth > 0 ? 'text-success-600' : 'text-error-600'}`}>
                    {balanceGrowth > 0 ? '+' : ''}{balanceGrowth}% este mes
                  </span>
                </motion.div>
              )}
            </motion.div>

            {/* Cuentas Activas Card - iOS Style Mobile Responsive */}
            <motion.div 
              className="black-theme-card rounded-3xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 group"
              variants={fadeInUp}
              {...cardHover}
            >
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">CUENTAS ACTIVAS</h3>
              </div>
              <div className="flex items-baseline space-x-2 mb-3">
                <p className="text-2xl sm:text-3xl font-light text-foreground">
                  <NumberTicker value={accounts.filter(acc => acc.active).length} isVisible={true} />
                </p>
                <p className="text-ios-body text-muted-foreground">de {accounts.length}</p>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2 mb-2">
                <motion.div 
                  className="bg-gradient-to-r from-success-500 to-success-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${accounts.length > 0 ? (accounts.filter(acc => acc.active).length / accounts.length) * 100 : 0}%` }}
                  transition={{ delay: 0.5, duration: 1 }}
                ></motion.div>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="h-3 w-3 text-success-600" />
                <span className="text-ios-footnote text-success-600">Meta: 5 cuentas</span>
              </div>
            </motion.div>

            {/* Criptomonedas Card - iOS Style Mobile Responsive */}
            <motion.div 
              className="black-theme-card rounded-3xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 group"
              variants={fadeInUp}
              {...cardHover}
            >
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse"></div>
                <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">CRIPTOMONEDAS</h3>
              </div>
              <p className="text-2xl sm:text-3xl font-light text-foreground mb-2">
                <NumberTicker 
                  value={accounts.filter(acc => acc.currencyCode === 'BTC' || acc.currencyCode === 'ETH').length} 
                  isVisible={true} 
                />
              </p>
              <p className="text-ios-footnote text-muted-foreground mb-2">wallets activos</p>
              {accounts.filter(acc => acc.currencyCode === 'BTC' || acc.currencyCode === 'ETH').length > 0 && (
                <motion.div 
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <Bitcoin className="h-3 w-3 text-warning-600" />
                  <span className="text-ios-footnote text-warning-600 font-medium">Inversor Crypto</span>
                </motion.div>
              )}
            </motion.div>

            {/* Diversificación Card - iOS Style Mobile Responsive */}
            <motion.div 
              className="black-theme-card rounded-3xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 group"
              variants={fadeInUp}
              {...cardHover}
            >
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">DIVERSIFICACIÓN</h3>
              </div>
              <p className="text-2xl sm:text-3xl font-light text-foreground mb-2">
                <NumberTicker 
                  value={Array.from(new Set(accounts.map(acc => acc.currencyCode))).length} 
                  isVisible={true} 
                />
              </p>
              <p className="text-ios-footnote text-muted-foreground mb-2">divisas diferentes</p>
              {Array.from(new Set(accounts.map(acc => acc.currencyCode))).length >= 3 && (
                <motion.div 
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <DollarSign className="h-3 w-3 text-primary-600" />
                  <span className="text-ios-footnote text-primary-600 font-medium">Bien Diversificado</span>
                </motion.div>
              )}
            </motion.div>
          </motion.div>

          {/* Exchange Rates Section - iOS Style Mobile Responsive */}
          <motion.div 
            className="black-theme-card rounded-3xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 w-full no-horizontal-scroll"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 sm:mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse"></div>
                <h2 className="text-xl sm:text-2xl md:text-ios-large-title font-bold text-foreground tracking-tight">
                  💱 Tasas de Cambio
                </h2>
              </div>
              <motion.div
                className="flex items-center justify-center sm:justify-start space-x-2 bg-muted/20 rounded-xl px-3 py-2 w-fit mx-auto sm:mx-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                <span className="text-ios-caption text-success-600 font-medium">EN VIVO</span>
              </motion.div>
            </div>
            
            <p className="text-sm sm:text-base text-muted-foreground font-light mb-6 sm:mb-8 text-center md:text-left px-2 md:px-0">
              Seguimiento en tiempo real de las tasas oficiales del BCV y precios del mercado P2P de Binance
            </p>

            <div className="space-y-6">
              <BCVRates />
              <BinanceRatesComponent />
              
              {/* History Button - Mobile Responsive */}
              <motion.div
                className="flex justify-center px-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <button
                  onClick={() => setShowRatesHistory(true)}
                  className="flex items-center justify-center space-x-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 px-4 sm:px-6 py-3 rounded-2xl transition-all duration-200 hover:scale-105 border border-blue-500/20 w-full md:w-auto text-sm sm:text-base"
                >
                  <History className="h-4 w-4" />
                  <span className="font-medium">Ver Historial y Calculadora</span>
                </button>
              </motion.div>
            </div>

            {/* Exchange Summary - Mobile Responsive */}
            <motion.div 
              className="mt-6 sm:mt-8 bg-muted/5 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-border/20 mx-2 md:mx-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <div className="text-center text-xs sm:text-ios-caption text-muted-foreground">
                <p className="mb-1 leading-relaxed">
                  💡 <strong>BCV:</strong> Tasas oficiales del gobierno<br className="sm:hidden" />
                  <span className="hidden sm:inline"> · </span>
                  <strong className="sm:ml-1">Binance:</strong> Mercado P2P en tiempo real
                </p>
                <p className="text-ios-footnote">
                  Los precios pueden variar entre fuentes debido a las dinámicas del mercado
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Accounts List - iOS Style */}
          <div className="black-theme-card rounded-3xl shadow-lg overflow-hidden w-full no-horizontal-scroll">
            <div className="p-6 border-b border-border/40">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <h3 className="text-ios-title font-semibold text-foreground">Todas las Cuentas</h3>
              </div>
            </div>
            
            <div className="divide-y divide-border/40">
              {loading ? (
                <motion.div 
                  className="p-6 sm:p-8 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <motion.p 
                    className="text-muted-foreground text-sm sm:text-ios-body"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    ✨ Cargando tus cuentas...
                  </motion.p>
                </motion.div>
              ) : error ? (
                <motion.div 
                  className="p-6 sm:p-8 text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <p className="text-error-600 text-sm sm:text-ios-body mb-4">❌ {error}</p>
                  <motion.button 
                    onClick={loadAccounts}
                    className="px-4 sm:px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all duration-200 text-sm sm:text-ios-body font-medium w-full sm:w-auto"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    🔄 Reintentar
                  </motion.button>
                </motion.div>
              ) : accounts.length === 0 ? (
                <motion.div 
                  className="p-8 sm:p-12 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    <Wallet className="h-16 w-16 sm:h-20 sm:w-20 text-muted-foreground mx-auto mb-4 sm:mb-6" />
                  </motion.div>
                  <motion.h3 
                    className="text-lg sm:text-ios-title font-semibold text-foreground mb-3 px-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    🎯 ¡Tu Viaje Financiero Comienza Aquí!
                  </motion.h3>
                  <motion.p 
                    className="text-muted-foreground text-sm sm:text-ios-body mb-6 sm:mb-8 max-w-sm mx-auto leading-relaxed px-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    Crea tu primera cuenta para empezar a organizar tus finanzas de manera inteligente y alcanzar tus metas 🚀
                  </motion.p>
                  <motion.button
                    onClick={handleNewAccount}
                    className="text-white font-medium px-6 sm:px-8 py-3 sm:py-4 rounded-2xl shadow-lg transition-all duration-300 relative overflow-hidden group bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary text-sm sm:text-ios-body w-full max-w-xs mx-auto"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    whileHover={{ scale: 1.02, boxShadow: "0 10px 25px rgba(59, 130, 246, 0.4)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></div>
                    <div className="relative flex items-center space-x-2">
                      <Plus className="h-5 w-5" />
                      <span>Crear Primera Cuenta</span>
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </motion.button>
                </motion.div>
              ) : (
                <AnimatePresence>
                  {accounts.map((account, index) => {
                    const Icon = accountIcons[account.type as keyof typeof accountIcons] || Wallet;
                    
                    return (
                      <motion.div 
                        key={account.id} 
                        className="p-4 sm:p-6 hover:bg-card/60 transition-all duration-200 relative group cursor-pointer border-l-0 hover:border-l-4 hover:border-l-primary/40"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ 
                          scale: 1.005,
                          transition: { duration: 0.2 }
                        }}
                      >
                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center space-x-3 md:space-x-4 flex-1 min-w-0">
                            <div className="p-2.5 sm:p-3 bg-muted/20 group-hover:bg-primary/10 rounded-2xl transition-colors duration-200 flex-shrink-0">
                              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm sm:text-ios-body font-medium text-foreground mb-1 truncate">{account.name}</h4>
                              <div className="flex items-center flex-wrap gap-1 md:gap-2 text-xs sm:text-ios-caption text-muted-foreground">
                                <span className="truncate">{account.type === 'BANK' ? 'Banco' : 
                                       account.type === 'CARD' ? 'Tarjeta' :
                                       account.type === 'CASH' ? 'Efectivo' :
                                       account.type === 'SAVINGS' ? 'Ahorros' : 
                                       'Inversión'}</span>
                                <div className="w-1 h-1 bg-muted-foreground rounded-full hidden md:block"></div>
                                <span className="text-primary font-medium">
                                  {account.currencyCode}
                                </span>
                                <div className="w-1 h-1 bg-muted-foreground rounded-full hidden md:block"></div>
                                <span className={`${account.active ? 'text-success-600' : 'text-error-600'} flex-shrink-0`}>
                                  {account.active ? 'Activa' : 'Inactiva'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm sm:text-ios-title font-light text-foreground truncate">
                                {showBalances 
                                  ? `${account.balance < 0 ? '-' : ''}${formatBalance(Math.abs(account.balance), account.currencyCode)}`
                                  : '••••••'
                                }
                              </p>
                              {account.currencyCode !== 'USD' && showBalances && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  ≈ ${convertToUSD(Math.abs(account.balance), account.currencyCode).toLocaleString('en-US', { 
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })} USD
                                </p>
                              )}
                              <div className="flex items-center justify-end space-x-1 md:space-x-2 mt-1">
                                {account.currencyCode === 'VES' && (
                                  <span className="text-xs sm:text-ios-footnote bg-warning-500/10 text-warning-600 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg font-medium">
                                    BCV
                                  </span>
                                )}
                                <BalanceAlertIndicator account={account} />
                              </div>
                            </div>
                            
                            <div className="relative">
                              <button 
                                onClick={() => toggleDropdown(account.id)}
                                className="p-1.5 md:p-2 text-muted-foreground hover:text-foreground hover:bg-muted/20 rounded-xl transition-all duration-200 flex-shrink-0"
                              >
                                <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </button>
                              
                              {openDropdown === account.id && (
                                <div className="absolute right-0 mt-2 w-44 md:w-48 bg-card border border-border rounded-2xl shadow-xl z-20 overflow-hidden">
                                  <button
                                    onClick={() => {
                                      handleEditAccount(account);
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full px-3 md:px-4 py-2.5 md:py-3 text-left text-sm sm:text-ios-body text-foreground hover:bg-muted/20 transition-colors flex items-center space-x-2 md:space-x-3"
                                  >
                                    <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    <span>Editar cuenta</span>
                                  </button>
                                  <button
                                    onClick={() => handleAlertSettings(account)}
                                    className="w-full px-3 md:px-4 py-2.5 md:py-3 text-left text-sm sm:text-ios-body text-foreground hover:bg-muted/20 transition-colors flex items-center space-x-2 md:space-x-3"
                                  >
                                    <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    <span>Alertas de saldo</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAccount(account)}
                                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left text-sm sm:text-ios-body text-error-600 hover:bg-error-50/50 transition-colors flex items-center space-x-2 sm:space-x-3"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    <span>Eliminar cuenta</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        <AccountForm
          isOpen={isOpen}
          onClose={closeModal}
          onSuccess={handleAccountSaved}
          account={selectedAccount}
        />
        
        <RatesHistory
          isOpen={showRatesHistory}
          onClose={() => setShowRatesHistory(false)}
        />
        
        {/* Balance Alert Settings Modal */}
        {showAlertSettings && selectedAccountForAlert && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card/95 backdrop-blur-xl rounded-3xl border border-border/40 shadow-xl max-w-md w-full">
              <div className="p-4 border-b border-border/40">
                <h3 className="text-ios-title font-semibold text-foreground">
                  Alertas de Saldo - {selectedAccountForAlert.name}
                </h3>
              </div>
              <BalanceAlertSettings
                isOpen={showAlertSettings}
                account={selectedAccountForAlert}
                onClose={handleCloseAlertSettings}
              />
            </div>
          </div>
        )}
      </MainLayout>
    </AuthGuard>
  );
}
