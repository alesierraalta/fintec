'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/main-layout';
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
  BarChart3,
} from 'lucide-react';
import { BCVRates } from '@/components/currency/bcv-rates';
import { BinanceRatesComponent } from '@/components/currency/binance-rates';
import { RatesHistory } from '@/components/currency/rates-history';
import { BalanceAlertSettings } from '@/components/forms/balance-alert-settings';
import { BalanceAlertIndicator } from '@/components/accounts/balance-alert-indicator';
import { SwipeableAccountCard } from '@/components/accounts/swipeable-account-card';
import { useBalanceAlerts } from '@/hooks/use-balance-alerts';
import { logger } from '@/lib/utils/logger';
import { useAppStore } from '@/lib/store';
import { AccountsSkeleton } from '@/components/skeletons/accounts-skeleton';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { toast } from 'sonner';

// Componente NumberTicker simulado (efecto psicológico de progreso)
const NumberTicker = ({
  value,
  prefix = '',
  suffix = '',
  isVisible = true,
}: {
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
      {prefix}
      {isVisible
        ? displayValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : '••••••'}
      {suffix}
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
  exit: { y: -20, opacity: 0 },
};

const cardHover = {
  initial: { scale: 1 },
  whileHover: { scale: 1.02, y: -2 },
  transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
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
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const dropdownRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [selectedAccountForAlert, setSelectedAccountForAlert] =
    useState<Account | null>(null);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const { checkAlerts } = useBalanceAlerts();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        setAccounts([]);
        setError('Debes iniciar sesión para ver tus cuentas');
        return;
      }

      const [userAccounts, transactionsData, categoriesData] =
        await Promise.all([
          repository.accounts.findByUserId(user.id),
          repository.transactions.findAll(),
          repository.categories.findAll(),
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
        const dropdown = document.getElementById(
          `account-dropdown-${openDropdown}`
        );
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
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
        scrollContainer.addEventListener('scroll', handleScroll, {
          passive: true,
        });
      }
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll, { passive: true });

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

  const handleDeleteAccount = (account: Account) => {
    setOpenDropdown(null);
    setAccountToDelete(account);
  };

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return;

    try {
      setDeletingAccount(true);
      await repository.accounts.delete(accountToDelete.id);
      setAccountToDelete(null);
      await loadAccounts();
      toast.success('Cuenta eliminada correctamente');
    } catch (err) {
      toast.error('Error al eliminar la cuenta');
    } finally {
      setDeletingAccount(false);
    }
  };

  const cancelDeleteAccount = () => {
    if (deletingAccount) return;
    setAccountToDelete(null);
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
  const getCategoryName = useCallback(
    (categoryId?: string) => {
      return (
        categories.find((c) => c.id === categoryId)?.name || 'Sin categoría'
      );
    },
    [categories]
  );

  // Calculate category statistics for an account
  const getAccountCategoryStats = useCallback(
    (accountId: string) => {
      const accountTransactions = transactions.filter(
        (t) => t.accountId === accountId
      );
      const categoryStats: Record<
        string,
        { income: number; expenses: number; count: number }
      > = {};

      accountTransactions.forEach((transaction) => {
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
          net: stats.income - stats.expenses,
        }))
        .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
    },
    [transactions, getCategoryName]
  );

  // Toggle account expansion
  const toggleAccountExpansion = (accountId: string) => {
    setExpandedAccount(expandedAccount === accountId ? null : accountId);
  };

  const formatBalance = (balanceMinor: number, currency: string) => {
    return formatCurrencyWithBCV(balanceMinor, currency, {
      showUSDEquivalent: currency === 'VES',
      locale: 'es-ES',
    });
  };

  const getCurrencySymbol = useCallback((currencyCode: string) => {
    const symbols: Record<string, string> = {
      USD: '$',
      VES: 'Bs.',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'C$',
      AUD: 'A$',
      BRL: 'R$',
      PEN: 'S/',
      MXN: 'MX$',
      ARS: 'AR$',
      COP: 'CO$',
      CLP: 'CL$',
      BTC: '₿',
      ETH: 'Ξ',
    };
    return symbols[currencyCode] || currencyCode;
  }, []);

  // Helper function to get rate name for display
  const getRateName = useCallback((rateType: string) => {
    switch (rateType) {
      case 'binance':
        return 'Binance';
      case 'bcv_usd':
        return 'BCV USD';
      case 'bcv_eur':
        return 'BCV EUR';
      default:
        return 'BCV USD';
    }
  }, []);

  // Helper function to get exchange rate
  const getExchangeRate = useCallback(
    (rateType: string) => {
      switch (rateType) {
        case 'binance':
          return binanceRates?.usd_ves || 1;
        case 'bcv_usd':
          return bcvRates?.usd || 1;
        case 'bcv_eur':
          return bcvRates?.eur || 1;
        default:
          return bcvRates?.usd || 1;
      }
    },
    [bcvRates, binanceRates]
  );

  // Convertir balance a USD
  const convertToUSD = useCallback(
    (
      balanceMinor: number,
      currencyCode: string,
      accountType?: string,
      useRate: 'binance' | 'bcv_usd' | 'bcv_eur' = 'bcv_usd'
    ): number => {
      if (currencyCode === 'USD') return balanceMinor / 100;

      // * Handle cryptocurrencies with proper decimal places
      // * Crypto base value is in USD (at Binance rate). When BCV selected, multiply by ratio
      if (
        accountType === 'CRYPTO' ||
        currencyCode === 'BTC' ||
        currencyCode === 'ETH'
      ) {
        // Cryptocurrencies use 8 decimal places
        const balanceMajor = balanceMinor / 100000000;

        // Base value is already in USD (at Binance market rate)
        // When BCV is selected, show "equivalent USD" using BCV rate
        // Formula: USD_crypto × (Binance_rate / BCV_rate) = adjusted USD
        if (useRate === 'bcv_usd' || useRate === 'bcv_eur') {
          const bcvRate = useRate === 'bcv_eur' ? bcvRates.eur : bcvRates.usd;
          const rateRatio = binanceRates.usd_ves / bcvRate;
          return balanceMajor * rateRatio;
        }

        // For Binance view, return the base USD value
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
    },
    [binanceRates, bcvRates]
  );

  // Cálculo optimizado con tasas seleccionadas
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => {
      const balanceMinor = Number(acc.balance) || 0;
      const balanceMajor = fromMinorUnits(balanceMinor, acc.currencyCode);

      // * Include cryptocurrencies in total balance using USD conversion
      if (acc.type === 'CRYPTO') {
        // For crypto, use the converted USD value from convertToUSD
        const usdValue = convertToUSD(
          balanceMinor,
          acc.currencyCode,
          acc.type,
          usdEquivalentType
        );
        return sum + usdValue;
      }

      if (acc.currencyCode === 'VES') {
        const rate = getExchangeRate(usdEquivalentType);
        return sum + balanceMajor / rate;
      }
      return sum + balanceMajor;
    }, 0);
  }, [accounts, usdEquivalentType, getExchangeRate, convertToUSD]);

  // Calculate balance growth based on current month transactions
  const balanceGrowth = useMemo(() => {
    if (!transactions?.length || totalBalance === 0) return 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const netChange = transactions.reduce((acc, t) => {
      const d = new Date(t.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        // * Include cryptocurrency transactions with proper conversion
        const account = accounts.find((a) => a.id === t.accountId);
        const isCrypto =
          account?.type === 'CRYPTO' ||
          t.currencyCode === 'BTC' ||
          t.currencyCode === 'ETH';

        let amountUSD = 0;
        if (isCrypto) {
          // Use convertToUSD for crypto transactions
          amountUSD = convertToUSD(
            t.amountMinor || 0,
            t.currencyCode,
            account?.type,
            usdEquivalentType
          );
        } else {
          const amountMajor = (t.amountMinor || 0) / 100;
          amountUSD = amountMajor;

          if (t.currencyCode === 'VES') {
            const rate = getExchangeRate(usdEquivalentType);
            amountUSD = amountMajor / rate;
          }
        }

        if (t.type === 'INCOME') return acc + amountUSD;
        if (t.type === 'EXPENSE') return acc - amountUSD;
      }
      return acc;
    }, 0);

    const startBalance = totalBalance - netChange;
    if (startBalance <= 0) return 0; // Avoid division by zero or negative start balance weirdness

    return Number(((netChange / startBalance) * 100).toFixed(1));
  }, [
    transactions,
    totalBalance,
    usdEquivalentType,
    getExchangeRate,
    accounts,
    convertToUSD,
  ]);

  // Función para mostrar tasas actuales
  const showCurrentRates = useCallback(() => {
    // Tasas actuales - logging removido para build limpio
    // Binance: ${binanceRates.usd_ves} Bs/USDT
    // BCV USD: ${bcvRates.usd} Bs/USD
    // BCV EUR: ${bcvRates.eur} Bs/EUR
  }, []);

  // Mostrar tasas actuales al cargar
  useEffect(() => {
    showCurrentRates();
  }, [showCurrentRates]);

  if (loading && accounts.length === 0) {
    return (
      <MainLayout>
        <AccountsSkeleton />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="no-horizontal-scroll w-full animate-fade-in space-y-8">
        {/* iOS-style Header - Enhanced Mobile Optimized */}
        <div className="px-4 py-6 text-center sm:py-8 md:py-10">
          {/* Status Indicator with Enhanced Animation */}
          <motion.div
            className="mb-4 inline-flex items-center space-x-3 text-muted-foreground sm:mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="relative">
              <div className="h-3 w-3 animate-pulse rounded-full bg-gradient-to-r from-primary to-blue-500 shadow-lg shadow-primary/30"></div>
              <div className="absolute inset-0 h-3 w-3 animate-ping rounded-full bg-gradient-to-r from-primary to-blue-500 opacity-20"></div>
            </div>
            <span className="text-ios-caption font-semibold uppercase tracking-wide">
              Centro Financiero
            </span>
            <div className="flex space-x-1">
              <div
                className="h-1 w-1 animate-bounce rounded-full bg-primary/60"
                style={{ animationDelay: '0ms' }}
              ></div>
              <div
                className="h-1 w-1 animate-bounce rounded-full bg-primary/60"
                style={{ animationDelay: '150ms' }}
              ></div>
              <div
                className="h-1 w-1 animate-bounce rounded-full bg-primary/60"
                style={{ animationDelay: '300ms' }}
              ></div>
            </div>
          </motion.div>

          {/* Enhanced Title with Visual Elements */}
          <motion.div
            className="relative mb-6 sm:mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          >
            {/* Background Glow Effect */}
            <div className="absolute inset-0 scale-150 rounded-full bg-gradient-to-r from-primary/10 via-blue-500/10 to-green-500/10 opacity-60 blur-3xl"></div>

            {/* Main Title */}
            <h1 className="relative mb-3 text-4xl font-bold tracking-tight sm:mb-4 sm:text-5xl md:text-6xl lg:text-6xl">
              <span className="animate-gradient bg-gradient-to-r from-primary via-blue-600 to-green-500 bg-clip-text text-transparent [background-size:200%_200%]">
                💼 Mis Cuentas
              </span>
            </h1>

            {/* Decorative Elements */}
            <div className="mb-4 flex items-center justify-center space-x-4">
              <motion.div
                className="h-0.5 w-12 bg-gradient-to-r from-transparent via-primary to-transparent"
                initial={{ width: 0 }}
                animate={{ width: 48 }}
                transition={{ duration: 1, delay: 0.8 }}
              ></motion.div>
              <motion.div
                className="rounded-full border border-primary/30 bg-gradient-to-r from-primary/20 to-blue-500/20 p-2 backdrop-blur-sm"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
              >
                <Wallet className="h-4 w-4 text-primary" />
              </motion.div>
              <motion.div
                className="h-0.5 w-12 bg-gradient-to-r from-transparent via-primary to-transparent"
                initial={{ width: 0 }}
                animate={{ width: 48 }}
                transition={{ duration: 1, delay: 0.8 }}
              ></motion.div>
            </div>
          </motion.div>

          {/* Enhanced Description with Stats Preview */}
          <motion.div
            className="mb-6 space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <p className="mx-auto max-w-2xl px-4 text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
              Controla y optimiza tu patrimonio financiero desde un solo lugar
            </p>

            {/* Quick Stats Badges */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <motion.div
                className="inline-flex items-center space-x-2 rounded-full border border-primary/20 bg-gradient-to-r from-primary/10 to-blue-500/10 px-4 py-2 backdrop-blur-sm"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                <span className="text-ios-caption font-medium text-foreground">
                  {accounts.length} Cuenta{accounts.length !== 1 ? 's' : ''}
                </span>
              </motion.div>

              <motion.div
                className="inline-flex items-center space-x-2 rounded-full border border-green-500/20 bg-gradient-to-r from-green-500/10 to-emerald-500/10 px-4 py-2 backdrop-blur-sm"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
              >
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-ios-caption font-medium text-foreground">
                  +{balanceGrowth.toFixed(1)}% este mes
                </span>
              </motion.div>
            </div>
          </motion.div>

          {/* Quick Actions Header - Mobile Responsive */}
          <motion.div
            className="mb-4 flex flex-col items-center justify-center gap-3 px-4 sm:flex-row sm:gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.button
              className={`flex w-full items-center justify-center space-x-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 sm:w-auto sm:py-2 ${
                showBalances
                  ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                  : 'bg-primary text-white shadow-sm hover:bg-primary/90'
              }`}
              onClick={() => setShowBalances(!showBalances)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {showBalances ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span>{showBalances ? 'Ocultar Saldos' : 'Mostrar Saldos'}</span>
            </motion.button>

            {/* Local rate selector removed; global header RateSelector is the single source */}

            <motion.button
              className="group relative hidden w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary to-blue-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-600 hover:to-primary sm:flex sm:w-auto"
              onClick={handleNewAccount}
              whileHover={{
                scale: 1.02,
                boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)',
              }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:animate-pulse group-hover:opacity-20"></div>
              <div className="relative flex items-center justify-center space-x-2">
                <Plus className="h-5 w-5" />
                <span>Nueva Cuenta</span>
                <Sparkles className="h-4 w-4" />
              </div>
            </motion.button>
          </motion.div>

          {/* Achievement Badge */}
          {accounts.length > 0 && (
            <motion.div
              className="inline-flex items-center space-x-2 rounded-2xl border border-border/40 bg-card/80 px-4 py-2 backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Star className="h-4 w-4 text-warning-500" />
              <span className="text-ios-caption font-medium text-muted-foreground">
                {accounts.length >= 5
                  ? '🏆 Maestro Financiero'
                  : accounts.length >= 3
                    ? '🥉 Organizador Avanzado'
                    : accounts.length >= 1
                      ? '🌟 ¡Buen Comienzo!'
                      : ''}
              </span>
            </motion.div>
          )}
        </div>

        {/* iOS-style Summary Cards - Mobile First Responsive */}
        <motion.div
          className="no-horizontal-scroll grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:gap-8"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.1 },
            },
          }}
          initial="hidden"
          animate="show"
        >
          {/* Balance Total Card - iOS Style Mobile Responsive */}
          <motion.div
            className="black-theme-card group rounded-3xl p-4 shadow-lg transition-all duration-300 hover:shadow-xl sm:p-6"
            variants={fadeInUp}
            {...cardHover}
          >
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
              <h3 className="text-lg font-medium tracking-wide text-white">
                BALANCE TOTAL
              </h3>
            </div>
            <p className="amount-emphasis-white mb-2 text-2xl font-semibold text-white sm:text-3xl">
              {showBalances ? (
                <NumberTicker
                  value={totalBalance}
                  prefix="$"
                  isVisible={showBalances}
                />
              ) : (
                '••••••'
              )}
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
                <span
                  className={`text-ios-footnote font-medium ${balanceGrowth > 0 ? 'text-success-600' : 'text-error-600'}`}
                >
                  {balanceGrowth > 0 ? '+' : ''}
                  {balanceGrowth}% este mes
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Cuentas Activas Card - iOS Style Mobile Responsive */}
          <motion.div
            className="black-theme-card group rounded-3xl p-4 shadow-lg transition-all duration-300 hover:shadow-xl sm:p-6"
            variants={fadeInUp}
            {...cardHover}
          >
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
              <h3 className="text-lg font-medium tracking-wide text-white">
                CUENTAS ACTIVAS
              </h3>
            </div>
            <div className="mb-3 flex items-baseline space-x-2">
              <p className="text-2xl font-light text-foreground sm:text-3xl">
                <NumberTicker
                  value={accounts.filter((acc) => acc.active).length}
                  isVisible={true}
                />
              </p>
              <p className="text-ios-body text-muted-foreground">
                de {accounts.length}
              </p>
            </div>
            <div className="mb-2 h-2 w-full rounded-full bg-muted/30">
              <motion.div
                className="h-2 rounded-full bg-gradient-to-r from-success-500 to-success-600"
                initial={{ width: 0 }}
                animate={{
                  width: `${accounts.length > 0 ? (accounts.filter((acc) => acc.active).length / accounts.length) * 100 : 0}%`,
                }}
                transition={{ delay: 0.5, duration: 1 }}
              ></motion.div>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="h-3 w-3 text-success-600" />
              <span className="text-ios-footnote text-success-600">
                Meta: 5 cuentas
              </span>
            </div>
          </motion.div>

          {/* Criptomonedas Card - iOS Style Mobile Responsive */}
          <motion.div
            className="black-theme-card group rounded-3xl p-4 shadow-lg transition-all duration-300 hover:shadow-xl sm:p-6"
            variants={fadeInUp}
            {...cardHover}
          >
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-warning-500"></div>
              <h3 className="text-lg font-medium tracking-wide text-white">
                CRIPTOMONEDAS
              </h3>
            </div>
            <p className="mb-2 text-2xl font-light text-foreground sm:text-3xl">
              <NumberTicker
                value={accounts.filter((acc) => acc.type === 'CRYPTO').length}
                isVisible={true}
              />
            </p>
            <p className="mb-2 text-ios-footnote text-muted-foreground">
              wallets activos
            </p>
            {accounts.filter((acc) => acc.type === 'CRYPTO').length > 0 && (
              <motion.div
                className="flex items-center space-x-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <Bitcoin className="h-3 w-3 text-warning-600" />
                <span className="text-ios-footnote font-medium text-warning-600">
                  Inversor Crypto
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Diversificación Card - iOS Style Mobile Responsive */}
          <motion.div
            className="black-theme-card group rounded-3xl p-4 shadow-lg transition-all duration-300 hover:shadow-xl sm:p-6"
            variants={fadeInUp}
            {...cardHover}
          >
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
              <h3 className="text-lg font-medium tracking-wide text-white">
                DIVERSIFICACIÓN
              </h3>
            </div>
            <p className="mb-2 text-2xl font-light text-foreground sm:text-3xl">
              <NumberTicker
                value={
                  Array.from(new Set(accounts.map((acc) => acc.currencyCode)))
                    .length
                }
                isVisible={true}
              />
            </p>
            <p className="mb-2 text-ios-footnote text-muted-foreground">
              divisas diferentes
            </p>
            {Array.from(new Set(accounts.map((acc) => acc.currencyCode)))
              .length >= 3 && (
              <motion.div
                className="flex items-center space-x-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
              >
                <DollarSign className="h-3 w-3 text-primary-600" />
                <span className="text-ios-footnote font-medium text-primary-600">
                  Bien Diversificado
                </span>
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Accounts List - iOS Style */}
        <div className="black-theme-card no-horizontal-scroll w-full overflow-hidden rounded-3xl shadow-lg">
          <div className="border-b border-border/40 p-6">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
              <h3 className="text-2xl font-semibold text-foreground">
                Todas las Cuentas
              </h3>
            </div>
          </div>

          <div className="divide-y divide-border/40">
            {loading ? (
              <motion.div
                className="p-6 text-center sm:p-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                <motion.p
                  className="text-sm text-muted-foreground sm:text-ios-body"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  ✨ Cargando tus cuentas...
                </motion.p>
              </motion.div>
            ) : error ? (
              <motion.div
                className="p-6 text-center sm:p-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <p className="mb-4 text-sm text-error-600 sm:text-ios-body">
                  ❌ {error}
                </p>
                <motion.button
                  onClick={loadAccounts}
                  className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-primary/90 sm:w-auto sm:px-6 sm:text-ios-body"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  🔄 Reintentar
                </motion.button>
              </motion.div>
            ) : accounts.length === 0 ? (
              <motion.div
                className="p-8 text-center sm:p-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                >
                  <Wallet className="mx-auto mb-4 h-16 w-16 text-muted-foreground sm:mb-6 sm:h-20 sm:w-20" />
                </motion.div>
                <motion.h3
                  className="mb-3 px-4 text-lg font-semibold text-foreground sm:text-ios-title"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  🎯 ¡Tu Viaje Financiero Comienza Aquí!
                </motion.h3>
                <motion.p
                  className="mx-auto mb-6 max-w-sm px-4 text-sm leading-relaxed text-muted-foreground sm:mb-8 sm:text-ios-body"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  Crea tu primera cuenta para empezar a organizar tus finanzas
                  de manera inteligente y alcanzar tus metas 🚀
                </motion.p>
                <motion.button
                  onClick={handleNewAccount}
                  className="group relative mx-auto w-full max-w-xs overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-blue-600 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 hover:from-blue-600 hover:to-primary sm:px-8 sm:py-4 sm:text-ios-body"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  whileHover={{
                    scale: 1.02,
                    boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)',
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:animate-pulse group-hover:opacity-20"></div>
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
                  const Icon =
                    accountIcons[account.type as keyof typeof accountIcons] ||
                    Wallet;

                  return (
                    <motion.div
                      key={account.id}
                      className="group relative cursor-pointer border-l-0 p-4 transition-all duration-200 hover:border-l-4 hover:border-l-primary/40 hover:bg-card/60 sm:p-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{
                        scale: 1.005,
                        transition: { duration: 0.2 },
                      }}
                    >
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex min-w-0 flex-1 items-center space-x-3 md:space-x-4">
                          <div className="flex-shrink-0 rounded-2xl bg-muted/20 p-2.5 transition-colors duration-200 group-hover:bg-primary/10 sm:p-3">
                            <Icon className="h-4 w-4 text-muted-foreground transition-colors duration-200 group-hover:text-primary sm:h-5 sm:w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="mb-1 truncate text-sm font-medium text-foreground sm:text-ios-body">
                              {account.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground sm:text-ios-caption md:gap-2">
                              <span className="truncate">
                                {account.type === 'BANK'
                                  ? 'Banco'
                                  : account.type === 'CARD'
                                    ? 'Tarjeta'
                                    : account.type === 'CASH'
                                      ? 'Efectivo'
                                      : account.type === 'SAVINGS'
                                        ? 'Ahorros'
                                        : account.type === 'CRYPTO'
                                          ? 'Criptomoneda'
                                          : 'Inversión'}
                              </span>
                              <div className="hidden h-1 w-1 rounded-full bg-muted-foreground md:block"></div>
                              <span className="font-medium text-primary">
                                {account.currencyCode}
                              </span>
                              <div className="hidden h-1 w-1 rounded-full bg-muted-foreground md:block"></div>
                              <span
                                className={`${account.active ? 'text-success-600' : 'text-error-600'} flex-shrink-0`}
                              >
                                {account.active ? 'Activa' : 'Inactiva'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0 text-right">
                            <p className="amount-emphasis-white truncate text-sm font-semibold text-white sm:text-ios-title">
                              {showBalances
                                ? account.type === 'CRYPTO'
                                  ? `$${convertToUSD(
                                      Math.abs(account.balance),
                                      account.currencyCode,
                                      account.type,
                                      usdEquivalentType
                                    ).toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}`
                                  : `${account.balance < 0 ? '-' : ''}${formatBalance(Math.abs(account.balance), account.currencyCode)}`
                                : '••••••'}
                            </p>
                            {account.currencyCode !== 'USD' &&
                              account.type !== 'CRYPTO' &&
                              showBalances && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  ≈ $
                                  {convertToUSD(
                                    Math.abs(account.balance),
                                    account.currencyCode,
                                    account.type,
                                    usdEquivalentType
                                  ).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}{' '}
                                  USD
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    ({getRateName(usdEquivalentType)})
                                  </span>
                                </p>
                              )}
                            {account.type === 'CRYPTO' && showBalances && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                <span className="text-xs text-muted-foreground">
                                  ({getRateName(usdEquivalentType)})
                                </span>
                              </p>
                            )}
                            {(account.currencyCode === 'USD' ||
                              account.currencyCode === 'USDT' ||
                              account.currencyCode === 'BUSD') &&
                              showBalances && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  ≈ Bs.{' '}
                                  {(
                                    (Math.abs(account.balance) / 100) *
                                    (binanceRates?.usd_ves || 0)
                                  ).toLocaleString('es-VE', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    (Binance)
                                  </span>
                                </p>
                              )}
                            <div className="mt-1 flex items-center justify-end space-x-1 md:space-x-2">
                              {account.currencyCode === 'VES' && (
                                <span className="rounded-lg bg-warning-500/10 px-1.5 py-0.5 text-xs font-medium text-warning-600 sm:px-2 sm:py-1 sm:text-ios-footnote">
                                  BCV
                                </span>
                              )}
                              <BalanceAlertIndicator account={account} />
                            </div>
                          </div>

                          <div className="relative">
                            <button
                              ref={(el) => {
                                dropdownRefs.current[account.id] = el;
                              }}
                              onClick={() => toggleDropdown(account.id)}
                              aria-label="Acciones de cuenta"
                              aria-expanded={openDropdown === account.id}
                              aria-haspopup="menu"
                              className="flex-shrink-0 rounded-xl p-1.5 text-muted-foreground transition-all duration-200 hover:bg-muted/20 hover:text-foreground md:p-2"
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
                          className="mt-4 border-t border-border/20 pt-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-foreground">
                                📊 Estadísticas por Categoría
                              </h4>
                              <span className="text-xs text-muted-foreground">
                                {getAccountCategoryStats(account.id).length}{' '}
                                categorías
                              </span>
                            </div>

                            {getAccountCategoryStats(account.id).length ===
                            0 ? (
                              <div className="py-4 text-center">
                                <p className="text-xs text-muted-foreground">
                                  No hay transacciones en esta cuenta
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {getAccountCategoryStats(account.id).map(
                                  (stat, index) => (
                                    <motion.div
                                      key={stat.categoryName}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.1 }}
                                      className="flex items-center justify-between rounded-lg bg-muted/10 p-2"
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium text-foreground">
                                          {stat.categoryName}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {stat.count} transacción
                                          {stat.count !== 1 ? 'es' : ''}
                                        </p>
                                      </div>
                                      <div className="ml-2 text-right">
                                        {stat.income > 0 && (
                                          <p className="text-xs font-medium text-green-600">
                                            +
                                            {getCurrencySymbol(
                                              account.currencyCode
                                            )}
                                            {stat.income.toFixed(2)}
                                          </p>
                                        )}
                                        {stat.expenses > 0 && (
                                          <p className="text-xs font-medium text-red-600">
                                            -
                                            {getCurrencySymbol(
                                              account.currencyCode
                                            )}
                                            {stat.expenses.toFixed(2)}
                                          </p>
                                        )}
                                        <p
                                          className={`text-xs font-semibold ${
                                            stat.net >= 0
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          {stat.net >= 0 ? '+' : ''}
                                          {getCurrencySymbol(
                                            account.currencyCode
                                          )}
                                          {stat.net.toFixed(2)}
                                        </p>
                                      </div>
                                    </motion.div>
                                  )
                                )}
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
        {/* Exchange Rates Section - Collapsible for Mobile */}
        <CollapsibleSection
          title="💱 Tasas de Cambio"
          storageKey="accounts-exchange-rates"
          collapseOnMobile={true}
          defaultExpanded={true}
          badge={
            <div className="flex items-center space-x-2 rounded-xl bg-muted/20 px-3 py-1">
              <div className="h-2 w-2 animate-pulse rounded-full bg-success-500" />
              <span className="text-ios-caption font-medium text-success-600">
                EN VIVO
              </span>
            </div>
          }
        >
          <p className="mb-6 text-center text-sm font-light text-muted-foreground sm:text-base md:text-left">
            Tasas oficiales (BCV) y del mercado digital (Binance) para convertir
            tus cuentas
          </p>

          <div className="space-y-6">
            <BCVRates />
            <BinanceRatesComponent />

            {/* History Button - Mobile Responsive */}
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button
                onClick={() => setShowRatesHistory(true)}
                className="flex min-h-[44px] w-full items-center justify-center space-x-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-500 transition-all duration-200 hover:scale-105 hover:bg-blue-500/20 sm:px-6 sm:text-base md:w-auto"
              >
                <History className="h-4 w-4" />
                <span className="font-medium">Ver Historial y Calculadora</span>
              </button>
            </motion.div>
          </div>

          {/* Exchange Summary */}
          <div className="mt-6 rounded-2xl border border-border/20 bg-muted/5 p-3 backdrop-blur-sm sm:p-4">
            <div className="text-center text-xs text-muted-foreground sm:text-ios-caption">
              <p className="mb-1 leading-relaxed">
                💡 <strong>BCV:</strong> Tasa oficial del gobierno
                <span className="hidden sm:inline"> · </span>
                <br className="sm:hidden" />
                <strong className="sm:ml-1">Binance:</strong> Precio real del
                mercado digital
              </p>
              <p className="text-ios-footnote">
                ℹ️ Estas tasas te ayudan a ver tus cuentas en diferentes monedas
              </p>
            </div>
          </div>
        </CollapsibleSection>
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
      {openDropdown &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id={`account-dropdown-${openDropdown}`}
            className="fixed z-[10000] w-48 rounded-2xl border border-border/40 bg-card/95 shadow-2xl backdrop-blur-xl"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="account-options-menu"
          >
            {(() => {
              const account = accounts.find((acc) => acc.id === openDropdown);
              if (!account) return null;

              return (
                <>
                  <button
                    onClick={() => {
                      handleEditAccount(account);
                      setOpenDropdown(null);
                    }}
                    className="flex w-full items-center rounded-t-2xl px-4 py-3 text-sm text-foreground transition-colors hover:bg-muted/20"
                    role="menuitem"
                  >
                    <Edit className="mr-3 h-4 w-4" />
                    Editar cuenta
                  </button>
                  <button
                    onClick={() => handleAlertSettings(account)}
                    className="flex w-full items-center px-4 py-3 text-sm text-foreground transition-colors hover:bg-muted/20"
                    role="menuitem"
                  >
                    <Settings className="mr-3 h-4 w-4" />
                    Alertas de saldo
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(account)}
                    className="flex w-full items-center rounded-b-2xl px-4 py-3 text-sm text-error-600 transition-colors hover:bg-error-50/50"
                    role="menuitem"
                  >
                    <Trash2 className="mr-3 h-4 w-4" />
                    Eliminar cuenta
                  </button>
                </>
              );
            })()}
          </div>,
          document.body
        )}

      {/* Delete Account Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            aria-describedby="delete-account-description"
            className="w-full max-w-md rounded-2xl border border-border/60 bg-card/95 p-6"
          >
            <div className="mb-4 flex items-center space-x-3">
              <div className="rounded-lg bg-destructive/15 p-2">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <h3
                id="delete-account-title"
                className="text-lg font-semibold text-foreground"
              >
                Eliminar Cuenta
              </h3>
            </div>

            <div className="mb-6 space-y-3">
              <p
                id="delete-account-description"
                className="text-muted-foreground"
              >
                Esta accion eliminara la cuenta{' '}
                <span className="font-medium text-foreground">
                  {accountToDelete.name}
                </span>
                .
              </p>
              <p className="text-sm text-destructive">
                Esta accion no se puede deshacer.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={cancelDeleteAccount}
                disabled={deletingAccount}
                className="focus-ring flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-muted/40 px-4 py-2 text-foreground transition-colors hover:bg-muted/60 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteAccount}
                disabled={deletingAccount}
                className="focus-ring flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-destructive px-4 py-2 text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {deletingAccount ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Alert Settings Modal */}
      {showAlertSettings && selectedAccountForAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          {/* * Modal wrapper with max-height for mobile scrolling */}
          <div className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border/40 bg-card/95 shadow-xl backdrop-blur-xl">
            <div className="flex-shrink-0 border-b border-border/40 p-4">
              <h3 className="text-2xl font-semibold text-foreground">
                Alertas de Saldo - {selectedAccountForAlert.name}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              <BalanceAlertSettings
                isOpen={showAlertSettings}
                account={selectedAccountForAlert}
                onClose={handleCloseAlertSettings}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button for Mobile */}
      <FloatingActionButton
        onClick={handleNewAccount}
        label="Nueva Cuenta"
        icon={<Plus className="h-6 w-6" />}
        mobileOnly={true}
        position="bottom-right"
        variant="primary"
      />
    </MainLayout>
  );
}
