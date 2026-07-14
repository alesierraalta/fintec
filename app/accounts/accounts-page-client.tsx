'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/main-layout';
import { useRepository } from '@/providers/repository-provider';
import { useAuth } from '@/hooks/use-auth';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import { fromMinorUnits } from '@/lib/money';
import {
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Bitcoin,
  DollarSign,
  Sparkles,
  Target,
  Star,
  Settings,
} from 'lucide-react';
import { RatesHistory } from '@/components/currency/rates-history';
import { BalanceAlertSettings } from '@/components/forms/balance-alert-settings';
import { AccountListRow } from '@/components/accounts/account-list-row';
import { useAppStore } from '@/lib/store';
import { getExchangeRate, convertBalanceToUSD } from '@/lib/rate-display';
import { AccountsRatesPanel } from '@/components/accounts/accounts-rates-panel';
import { RateBadge } from '@/components/accounts/rate-badge';
import { useAccountsPage } from '@/hooks/use-accounts-page';
import { AccountsSkeleton } from '@/components/skeletons/accounts-skeleton';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { FormLoading } from '@/components/ui/suspense-loading';

const AccountForm = dynamic(
  () =>
    import('@/components/forms/account-form').then((mod) => mod.AccountForm),
  { loading: () => <FormLoading />, ssr: false }
);

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

// accountIcons movido a components/accounts/account-list-row.tsx.

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
  const { user } = useAuth();
  const repository = useRepository();
  const bcvRates = useBCVRates();
  const binanceRatesState = useBinanceRates();
  const { rates: binanceRates } = binanceRatesState;
  const usdEquivalentType = useAppStore((s) => s.selectedRateSource);
  const dropdownRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const {
    accounts,
    transactions,
    categories,
    selectedAccount,
    openDropdown,
    dropdownPosition,
    selectedAccountForAlert,
    showAlertSettings,
    accountToDelete,
    deletingAccount,
    showRatesHistory,
    showBalances,
    error,
    loading,
    isOpen,
    closeModal,
    loadAccounts,
    handleEditAccount,
    handleNewAccount,
    handleAccountSaved,
    handleDeleteAccount,
    confirmDeleteAccount,
    cancelDeleteAccount,
    handleAlertSettings,
    handleCloseAlertSettings,
    toggleDropdown,
    setSelectedAccount,
    setShowRatesHistory,
    setShowBalances,
    calculateDropdownPosition,
    closeDropdown,
    getCategoryName,
    getAccountCategoryStats,
    expandedAccount,
  } = useAccountsPage({
    user,
    repository,
    onOpenHistory: () => setShowRatesHistory(true),
    dropdownRefs,
  });

  // (Click-outside + scroll/resize useEffects moved to hooks/use-accounts-page.ts.)

  // (Handlers, click-outside + scroll/resize useEffects, and category helpers
  // moved to hooks/use-accounts-page.ts.)

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

  // Helpers moved to @/lib/rate-display (getRateName, getExchangeRate, convertBalanceToUSD).
  // They are pure functions that take the bcv/binance snapshots as parameters.
  // The page passes them down directly. See SPEC: simplify-accounts-rates-section.

  // Cálculo optimizado con tasas seleccionadas
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => {
      const balanceMinor = Number(acc.balance) || 0;
      const balanceMajor = fromMinorUnits(balanceMinor, acc.currencyCode);

      // * Include cryptocurrencies in total balance using USD conversion
      if (acc.type === 'CRYPTO') {
        const usdValue = convertBalanceToUSD(
          balanceMinor,
          acc.currencyCode,
          acc.type,
          usdEquivalentType,
          bcvRates,
          binanceRates
        );
        return sum + usdValue;
      }

      if (acc.currencyCode === 'VES') {
        const rate = getExchangeRate(usdEquivalentType, bcvRates, binanceRates);
        return sum + balanceMajor / rate;
      }
      return sum + balanceMajor;
    }, 0);
  }, [accounts, usdEquivalentType, bcvRates, binanceRates]);

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
          amountUSD = convertBalanceToUSD(
            t.amountMinor || 0,
            t.currencyCode,
            account?.type,
            usdEquivalentType,
            bcvRates,
            binanceRates
          );
        } else {
          const amountMajor = (t.amountMinor || 0) / 100;
          amountUSD = amountMajor;

          if (t.currencyCode === 'VES') {
            const rate = getExchangeRate(
              usdEquivalentType,
              bcvRates,
              binanceRates
            );
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
    accounts,
    bcvRates,
    binanceRates,
  ]);

  // Función para mostrar tasas actuales — eliminada en simplify-accounts-rates-section
  // (era un no-op que solo loggeaba; el RateBadge ahora muestra la tasa activa).
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
              <span className="mr-2">💼</span>
              <span className="animate-gradient bg-gradient-to-r from-primary via-blue-600 to-green-500 bg-clip-text text-transparent [background-size:200%_200%]">
                Mis Cuentas
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
                <TrendingUp className="h-3 w-3 text-success" />
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
            className="ios-card group rounded-3xl p-4 shadow-lg transition-all duration-300 hover:shadow-xl sm:p-6"
            variants={fadeInUp}
            {...cardHover}
          >
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary"></div>
              <h3 className="text-lg font-medium tracking-wide text-foreground">
                BALANCE TOTAL
              </h3>
            </div>
            <p className="amount-emphasis-main mb-2 text-2xl font-semibold sm:text-3xl">
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
              <div className="mt-2">
                <RateBadge
                  source={usdEquivalentType}
                  value={getExchangeRate(
                    usdEquivalentType,
                    bcvRates,
                    binanceRates
                  )}
                />
              </div>
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
            className="ios-card group rounded-3xl p-4 shadow-lg transition-all duration-300 hover:shadow-xl sm:p-6"
            variants={fadeInUp}
            {...cardHover}
          >
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
              <h3 className="text-lg font-medium tracking-wide text-foreground">
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
            className="ios-card group rounded-3xl p-4 shadow-lg transition-all duration-300 hover:shadow-xl sm:p-6"
            variants={fadeInUp}
            {...cardHover}
          >
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-warning-500"></div>
              <h3 className="text-lg font-medium tracking-wide text-foreground">
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
            className="ios-card group rounded-3xl p-4 shadow-lg transition-all duration-300 hover:shadow-xl sm:p-6"
            variants={fadeInUp}
            {...cardHover}
          >
            <div className="mb-4 flex items-center space-x-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
              <h3 className="text-lg font-medium tracking-wide text-foreground">
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
        <div className="ios-card no-horizontal-scroll w-full overflow-hidden rounded-3xl shadow-lg">
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
                {accounts.map((account, index) => (
                  <AccountListRow
                    key={account.id}
                    account={account}
                    index={index}
                    showBalances={showBalances}
                    usdEquivalentType={usdEquivalentType}
                    binanceUsdVes={binanceRates?.usd_ves ?? 0}
                    bcvRates={bcvRates}
                    isExpanded={expandedAccount === account.id}
                    onEdit={handleEditAccount}
                    onDelete={handleDeleteAccount}
                    onAlertSettings={handleAlertSettings}
                    onToggleDropdown={toggleDropdown}
                    onRegisterTrigger={(accountId, el) => {
                      dropdownRefs.current[accountId] = el;
                    }}
                    renderCategoryStats={() => (
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
                        {getAccountCategoryStats(account.id).length === 0 ? (
                          <div className="py-4 text-center">
                            <p className="text-xs text-muted-foreground">
                              No hay transacciones en esta cuenta
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {getAccountCategoryStats(account.id).map(
                              (stat, statIndex) => (
                                <motion.div
                                  key={stat.categoryName}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: statIndex * 0.1 }}
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
                                      <p className="text-xs font-medium text-error">
                                        -
                                        {getCurrencySymbol(
                                          account.currencyCode
                                        )}
                                        {stat.expenses.toFixed(2)}
                                      </p>
                                    )}
                                    <p
                                      className={`text-xs font-semibold ${stat.net >= 0 ? 'text-green-600' : 'text-error'}`}
                                    >
                                      {stat.net >= 0 ? '+' : ''}
                                      {getCurrencySymbol(account.currencyCode)}
                                      {stat.net.toFixed(2)}
                                    </p>
                                  </div>
                                </motion.div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
        {/* Exchange Rates Section - now self-contained panel */}
        <AccountsRatesPanel
          bcv={bcvRates}
          binance={binanceRatesState}
          selectedSource={usdEquivalentType}
          onOpenHistory={() => setShowRatesHistory(true)}
        />
      </div>

      {isOpen && (
        <AccountForm
          isOpen={isOpen}
          onClose={closeModal}
          onSuccess={handleAccountSaved}
          account={selectedAccount}
        />
      )}

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
                      closeDropdown();
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
        <BalanceAlertSettings
          isOpen={showAlertSettings}
          account={selectedAccountForAlert}
          onClose={handleCloseAlertSettings}
        />
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
