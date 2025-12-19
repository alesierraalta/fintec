'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Settings,
  ChevronUp,
  BarChart3
} from 'lucide-react';
import { BCVRates } from '@/components/currency/bcv-rates';
import { BinanceRatesComponent } from '@/components/currency/binance-rates';
import { RatesHistory } from '@/components/currency/rates-history';
import { BalanceAlertSettings } from '@/components/forms/balance-alert-settings';
import { BalanceAlertIndicator } from '@/components/accounts/balance-alert-indicator';
import { useBalanceAlerts } from '@/hooks/use-balance-alerts';
import { logger } from '@/lib/utils/logger';
import { useAppStore } from '@/lib/store';
import { AccountsSkeleton } from '@/components/skeletons/accounts-skeleton';

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
  const usdEquivalentType = useAppStore((s) => s.selectedRateSource);
  const [showRatesHistory, setShowRatesHistory] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const dropdownRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [selectedAccountForAlert, setSelectedAccountForAlert] = useState<Account | null>(null);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const { checkAlerts } = useBalanceAlerts();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        setAccounts([]);
        setError('Debes iniciar sesión para ver tus cuentas');
        return;
      }

      const [userAccounts, transactionsData, categoriesData] = await Promise.all([
        repository.accounts.findByUserId(user.id),
        repository.transactions.findAll(),
        repository.categories.findAll()
      ]);

      setAccounts(userAccounts);
      setTransactions(transactionsData);
      setCategories(categoriesData);

      // Check for balance alerts after loading accounts
      await checkAlerts(userAccounts);
    } catch (err) {
      logger.error('Error loading data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [user, repository, checkAlerts]);

  // Load all data on mount
  useEffect(() => {
    if (user?.id) {
      loadAllData();
    }
  }, [loadAllData, user?.id]);

  // Helper for manual reload
  const loadAccounts = loadAllData;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (openDropdown) {
      const handleClickOutside = (event: MouseEvent) => {
        const dropdown = document.getElementById(`account-dropdown-${openDropdown}`);
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdown]);

  // Recalculate position on scroll/resize
  useEffect(() => {
    if (openDropdown) {
      const handleScroll = () => {
        calculateDropdownPosition(openDropdown);
      };

      // Get the scrollable container (main element with overflow-auto)
      const scrollContainer = document.querySelector('main');

      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', handleScroll);
      }
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);

      return () => {
        if (scrollContainer) {
          scrollContainer.removeEventListener('scroll', handleScroll);
        }
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
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

  const calculateDropdownPosition = (accountId: string) => {
    const trigger = dropdownRefs.current[accountId];
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      // Use viewport-relative positioning for fixed positioning
      setDropdownPosition({
        top: rect.bottom,
        left: rect.right - 192, // 192px = w-48
      });
    }
  };

  const toggleDropdown = (accountId: string) => {
    if (openDropdown !== accountId) {
      calculateDropdownPosition(accountId);
    }
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

  // Get category name helper
  const getCategoryName = useCallback((categoryId?: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Sin categoría';
  }, [categories]);

  // Calculate category statistics for an account
  const getAccountCategoryStats = useCallback((accountId: string) => {
    const accountTransactions = transactions.filter(t => t.accountId === accountId);
    const categoryStats: Record<string, { income: number; expenses: number; count: number }> = {};

    accountTransactions.forEach(transaction => {
      const categoryId = transaction.categoryId || 'uncategorized';
      const categoryName = getCategoryName(categoryId);

      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = { income: 0, expenses: 0, count: 0 };
      }

      const amount = (transaction.amountMinor || 0) / 100;
      categoryStats[categoryName].count++;

      if (transaction.type === 'INCOME') {
        categoryStats[categoryName].income += amount;
      } else if (transaction.type === 'EXPENSE') {
        categoryStats[categoryName].expenses += amount;
      }
    });

    return Object.entries(categoryStats)
      .map(([categoryName, stats]) => ({
        categoryName,
        ...stats,
        net: stats.income - stats.expenses
      }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [transactions, getCategoryName]);

  // Toggle account expansion
  const toggleAccountExpansion = (accountId: string) => {
    setExpandedAccount(expandedAccount === accountId ? null : accountId);
  };

  const formatBalance = (balanceMinor: number, currency: string) => {
    return formatCurrencyWithBCV(balanceMinor, currency, {
      showUSDEquivalent: currency === 'VES',
      locale: 'es-ES'
    });
  };

  const getCurrencySymbol = useCallback((currencyCode: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'VES': 'Bs.',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
      'BRL': 'R$',
      'PEN': 'S/',
      'MXN': 'MX$',
      'ARS': 'AR$',
      'COP': 'CO$',
      'CLP': 'CL$',
      'BTC': '₿',
      'ETH': 'Ξ',
    };
    return symbols[currencyCode] || currencyCode;
  }, []);

  // Helper function to get rate name for display
  const getRateName = useCallback((rateType: string) => {
    switch (rateType) {
      case 'binance': return 'Binance';
      case 'bcv_usd': return 'BCV USD';
      case 'bcv_eur': return 'BCV EUR';
      default: return 'BCV USD';
    }
  }, []);

  // Helper function to get exchange rate
  const getExchangeRate = useCallback((rateType: string) => {
    switch (rateType) {
      case 'binance': return binanceRates?.usd_ves || 1;
      case 'bcv_usd': return bcvRates?.usd || 1;
      case 'bcv_eur': return bcvRates?.eur || 1;
      default: return bcvRates?.usd || 1;
    }
  }, [bcvRates, binanceRates]);

  // Convertir balance a USD
  const convertToUSD = useCallback((balanceMinor: number, currencyCode: string, accountType?: string, useRate: 'binance' | 'bcv_usd' | 'bcv_eur' = 'bcv_usd'): number => {
    if (currencyCode === 'USD') return balanceMinor / 100;

    // * Handle cryptocurrencies with proper decimal places
    if (accountType === 'CRYPTO' || currencyCode === 'BTC' || currencyCode === 'ETH') {
      // Cryptocurrencies use 8 decimal places
      const balanceMajor = balanceMinor / 100000000;
      // ! Cryptocurrencies need their own exchange rates (BTC/USD, ETH/USD)
      // For now, return the crypto amount as-is (not converted)
      // TODO: Implement crypto exchange rate API integration
      return balanceMajor;
    }

    const balanceMajor = balanceMinor / 100;

    if (currencyCode === 'VES') {
      switch (useRate) {
        case 'binance':
          // Usar tasa de Binance para conversión de mercado
          return balanceMajor / binanceRates.usd_ves;
        case 'bcv_usd':
          // Usar tasa oficial BCV Dólar
          return balanceMajor / bcvRates.usd;
        case 'bcv_eur':
          // Usar tasa oficial BCV Euro (conversión aproximada)
          return (balanceMajor / bcvRates.eur) * 1.1; // EUR → USD aproximado
        default:
          return balanceMajor / bcvRates.usd;
      }
    }

    // Agregar más monedas según necesidad
    return balanceMajor;
  }, [binanceRates, bcvRates]);

  // Cálculo optimizado con tasas seleccionadas
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => {
      const balanceMinor = Number(acc.balance) || 0;
      const balanceMajor = fromMinorUnits(balanceMinor, acc.currencyCode);

      // * Exclude cryptocurrencies from total balance (they need their own exchange rates)
      if (acc.type === 'CRYPTO') {
        return sum; // Skip crypto accounts
      }

      if (acc.currencyCode === 'VES') {
        const rate = getExchangeRate(usdEquivalentType);
        return sum + (balanceMajor / rate);
      }
      return sum + balanceMajor;
    }, 0);
  }, [accounts, usdEquivalentType, getExchangeRate]);

  // Calculate balance growth based on current month transactions
  const balanceGrowth = useMemo(() => {
    if (!transactions?.length || totalBalance === 0) return 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const netChange = transactions.reduce((acc, t) => {
      const d = new Date(t.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        // * Skip cryptocurrency transactions (they need their own exchange rates)
        if (t.currencyCode === 'BTC' || t.currencyCode === 'ETH') {
          return acc;
        }

        const amountMajor = (t.amountMinor || 0) / 100;
        let amountUSD = amountMajor;

        if (t.currencyCode === 'VES') {
          const rate = getExchangeRate(usdEquivalentType);
          amountUSD = amountMajor / rate;
        }

        if (t.type === 'INCOME') return acc + amountUSD;
        if (t.type === 'EXPENSE') return acc - amountUSD;
      }
      return acc;
    }, 0);

    const startBalance = totalBalance - netChange;
    if (startBalance <= 0) return 0; // Avoid division by zero or negative start balance weirdness

    return Number(((netChange / startBalance) * 100).toFixed(1));
  }, [transactions, totalBalance, usdEquivalentType, getExchangeRate]);

  // Función para mostrar tasas actuales
  const showCurrentRates = useCallback(() => {
    // Tasas actuales - logging removido para build limpio
    // Binance: ${binanceRates.usd_ves} Bs/USDT
    // BCV USD: ${bcvRates.usd} Bs/USD  
    // BCV EUR: ${bcvRates.eur} Bs/EUR
  }, []);;;

  // Mostrar tasas actuales al cargar
  useEffect(() => {
    showCurrentRates();
  }, [showCurrentRates]);

  if (loading && accounts.length === 0) {
    return (
      <AuthGuard>
        <MainLayout>
          <AccountsSkeleton />
        </MainLayout>
      </AuthGuard>
    );
  }

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
              <h1 className="relative text-4xl sm:text-5xl md:text-6xl lg:text-6xl font-bold mb-3 sm:mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-primary via-blue-600 to-green-500 bg-clip-text text-white animate-gradient [background-size:200%_200%]">
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
                className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 text-sm font-medium ${showBalances
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

              {/* Local rate selector removed; global header RateSelector is the single source */}

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
                <h3 className="text-lg font-medium text-white tracking-wide">BALANCE TOTAL</h3>
              </div>
              <p className="text-2xl sm:text-3xl font-semibold amount-emphasis-white text-white mb-2">
                {showBalances ? (
                  <NumberTicker
                    value={totalBalance}
                    prefix="$"
                    isVisible={showBalances}
                  />
                ) : '••••••'}
              </p>
              {showBalances && (
                <p className="text-xs text-muted-foreground">
                  ({getRateName(usdEquivalentType)})
                </p>
              )}
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
                <h3 className="text-lg font-medium text-white tracking-wide">CUENTAS ACTIVAS</h3>
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
                <h3 className="text-lg font-medium text-white tracking-wide">CRIPTOMONEDAS</h3>
              </div>
              <p className="text-2xl sm:text-3xl font-light text-foreground mb-2">
                <NumberTicker
                  value={accounts.filter(acc => acc.type === 'CRYPTO').length}
                  isVisible={true}
                />
              </p>
              <p className="text-ios-footnote text-muted-foreground mb-2">wallets activos</p>
              {accounts.filter(acc => acc.type === 'CRYPTO').length > 0 && (
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
                <h3 className="text-lg font-medium text-white tracking-wide">DIVERSIFICACIÓN</h3>
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

          {/* Accounts List - iOS Style */}
          <div className="black-theme-card rounded-3xl shadow-lg overflow-hidden w-full no-horizontal-scroll">
            <div className="p-6 border-b border-border/40">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <h3 className="text-2xl font-semibold text-foreground">Todas las Cuentas</h3>
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
                              <p className="text-sm sm:text-ios-title font-semibold amount-emphasis-white text-white truncate">
                                {showBalances
                                  ? `${account.balance < 0 ? '-' : ''}${formatBalance(Math.abs(account.balance), account.currencyCode)}`
                                  : '••••••'
                                }
                              </p>
                              {account.currencyCode !== 'USD' && account.type !== 'CRYPTO' && showBalances && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  ≈ ${convertToUSD(Math.abs(account.balance), account.currencyCode, account.type, usdEquivalentType).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                  })} USD
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({getRateName(usdEquivalentType)})
                                  </span>
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
                                ref={(el) => { dropdownRefs.current[account.id] = el; }}
                                onClick={() => toggleDropdown(account.id)}
                                aria-label="Acciones de cuenta"
                                aria-expanded={openDropdown === account.id}
                                aria-haspopup="menu"
                                className="p-1.5 md:p-2 text-muted-foreground hover:text-foreground hover:bg-muted/20 rounded-xl transition-all duration-200 flex-shrink-0"
                              >
                                <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </button>


                            </div>
                          </div>
                        </div>

                        {/* Category Statistics - Expandable */}
                        {expandedAccount === account.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-4 pt-4 border-t border-border/20"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-foreground">📊 Estadísticas por Categoría</h4>
                                <span className="text-xs text-muted-foreground">
                                  {getAccountCategoryStats(account.id).length} categorías
                                </span>
                              </div>

                              {getAccountCategoryStats(account.id).length === 0 ? (
                                <div className="text-center py-4">
                                  <p className="text-xs text-muted-foreground">No hay transacciones en esta cuenta</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {getAccountCategoryStats(account.id).map((stat, index) => (
                                    <motion.div
                                      key={stat.categoryName}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.1 }}
                                      className="flex items-center justify-between p-2 bg-muted/10 rounded-lg"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-foreground truncate">
                                          {stat.categoryName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {stat.count} transacción{stat.count !== 1 ? 'es' : ''}
                                        </p>
                                      </div>
                                      <div className="text-right ml-2">
                                        {stat.income > 0 && (
                                          <p className="text-xs text-green-600 font-medium">
                                            +{getCurrencySymbol(account.currencyCode)}{stat.income.toFixed(2)}
                                          </p>
                                        )}
                                        {stat.expenses > 0 && (
                                          <p className="text-xs text-red-600 font-medium">
                                            -{getCurrencySymbol(account.currencyCode)}{stat.expenses.toFixed(2)}
                                          </p>
                                        )}
                                        <p className={`text-xs font-semibold ${stat.net >= 0 ? 'text-green-600' : 'text-red-600'
                                          }`}>
                                          {stat.net >= 0 ? '+' : ''}{getCurrencySymbol(account.currencyCode)}{stat.net.toFixed(2)}
                                        </p>
                                      </div>
                                    </motion.div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>
          {/* Exchange Rates Section - iOS Style Mobile Responsive */}
          <motion.div
            className="black-theme-card rounded-3xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 w-full no-horizontal-scroll"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex flex-col gap-4 mb-6 sm:mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse"></div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
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
              Tasas oficiales (BCV) y del mercado digital (Binance) para convertir tus cuentas
            </p>

            <div className="space-y-6">
              <BCVRates />
              <BinanceRatesComponent />

              {/* History Button - Mobile Responsive */}
              <motion.div
                className="flex justify-center px-2 sm:px-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <button
                  onClick={() => setShowRatesHistory(true)}
                  className="flex items-center justify-center space-x-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 px-3 sm:px-6 py-3 rounded-2xl transition-all duration-200 hover:scale-105 border border-blue-500/20 w-full md:w-auto text-sm sm:text-base min-h-[44px]"
                >
                  <History className="h-4 w-4" />
                  <span className="font-medium">Ver Historial y Calculadora</span>
                </button>
              </motion.div>
            </div>

            {/* Exchange Summary - Mobile Responsive */}
            <motion.div
              className="mt-6 sm:mt-8 bg-muted/5 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-border/20 mx-1 sm:mx-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <div className="text-center text-xs sm:text-ios-caption text-muted-foreground">
                <p className="mb-1 leading-relaxed">
                  💡 <strong>BCV:</strong> Tasa oficial del gobierno<br className="sm:hidden" />
                  <span className="hidden sm:inline"> · </span>
                  <strong className="sm:ml-1">Binance:</strong> Precio real del mercado digital
                </p>
                <p className="text-ios-footnote">
                  ℹ️ Estas tasas te ayudan a ver tus cuentas en diferentes monedas
                </p>
              </div>
            </motion.div>
          </motion.div>

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

        {/* Account Dropdown Portal */}
        {openDropdown && typeof document !== 'undefined' && createPortal(
          <div
            id={`account-dropdown-${openDropdown}`}
            className="fixed w-48 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/40 dark:border-gray-700/40 rounded-2xl shadow-2xl z-[10000]"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="account-options-menu"
          >
            {(() => {
              const account = accounts.find(acc => acc.id === openDropdown);
              if (!account) return null;

              return (
                <>
                  <button
                    onClick={() => {
                      handleEditAccount(account);
                      setOpenDropdown(null);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-foreground hover:bg-muted/20 transition-colors rounded-t-2xl"
                    role="menuitem"
                  >
                    <Edit className="h-4 w-4 mr-3" />
                    Editar cuenta
                  </button>
                  <button
                    onClick={() => handleAlertSettings(account)}
                    className="flex items-center w-full px-4 py-3 text-sm text-foreground hover:bg-muted/20 transition-colors"
                    role="menuitem"
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Alertas de saldo
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(account)}
                    className="flex items-center w-full px-4 py-3 text-sm text-error-600 hover:bg-error-50/50 transition-colors rounded-b-2xl"
                    role="menuitem"
                  >
                    <Trash2 className="h-4 w-4 mr-3" />
                    Eliminar cuenta
                  </button>
                </>
              );
            })()}
          </div>,
          document.body
        )}

        {/* Balance Alert Settings Modal */}
        {showAlertSettings && selectedAccountForAlert && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-card/95 backdrop-blur-xl rounded-3xl border border-border/40 shadow-xl max-w-md w-full">
              <div className="p-4 border-b border-border/40">
                <h3 className="text-2xl font-semibold text-foreground">
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
