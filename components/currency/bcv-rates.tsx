'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Euro,
  Clock,
  ExternalLink,
  Minus,
  ArrowUpDown,
  Calculator,
  Landmark,
  TrendingUpIcon,
  TrendingDownIcon,
  BarChart3,
  Percent,
} from 'lucide-react';
import { currencyService } from '@/lib/services/currency-service';
import type { BCVRates } from '@/types/rates';
import { BCVTrend } from '@/lib/services/bcv-history-service';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import { Badge } from '@/components/ui/badge';
import {
  calculateAverageRateDifference,
  calculateEurUsdRateDifference,
  formatPercentageDifference,
  getPercentageColorClass,
  type RateComparison,
} from '@/lib/rate-comparison';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function BCVRates() {
  const [rates, setRates] = useState<BCVRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLive, setIsLive] = useState(false);
  const [trends, setTrends] = useState<{ usd: BCVTrend; eur: BCVTrend } | null>(
    null
  );

  // Get Binance rates for comparison
  const { rates: binanceRates, isFallback: binanceIsFallback } =
    useBinanceRates();

  // Currency converter state
  const [showConverter, setShowConverter] = useState(false); // Already closed by default
  const [amount, setAmount] = useState<string>('1');
  const [fromCurrency, setFromCurrency] = useState<'VES' | 'USD' | 'EUR'>(
    'USD'
  );
  const [toCurrency, setToCurrency] = useState<'VES' | 'USD' | 'EUR'>('VES');

  const formatAge = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return '';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `${hours}h`;
    const days = Math.round(hours / 24);
    return `${days}d`;
  };

  const fetchRates = async () => {
    setLoading(true);
    setError('');
    try {
      const bcvRates = await currencyService.fetchBCVRates();
      setRates(bcvRates);
      setLastUpdated(new Date(bcvRates.lastUpdated).toLocaleString('es-VE'));

      // Check if rates are very recent (less than 1 hour old)
      const rateTime = new Date(bcvRates.lastUpdated);
      const now = new Date();
      const hoursDiff = (now.getTime() - rateTime.getTime()) / (1000 * 60 * 60);
      setIsLive(hoursDiff < 1 && bcvRates.fallback !== true);

      // Fetch trends
      try {
        const trendsData = await currencyService.getBCVTrends();
        setTrends(trendsData);
      } catch (trendError) {
        // Silent fail for trends
      }
    } catch (error) {
      setError('Error al obtener tasas del BCV');
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();

    const fetchWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchRates();
      }
    };

    // Auto-refresh every 10 minutes for BCV data (only while visible)
    const interval = window.setInterval(fetchWhenVisible, 600000);
    document.addEventListener('visibilitychange', fetchWhenVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', fetchWhenVisible);
    };
  }, []);

  const isBinanceValid =
    binanceRates && !binanceIsFallback && binanceRates.sell_rate?.avg > 0;

  // Calculate percentage difference with Binance for both USD and EUR
  const usdRateComparison: RateComparison | null =
    rates && isBinanceValid
      ? calculateAverageRateDifference(
          rates.usd,
          binanceRates.sell_rate.avg,
          binanceRates.buy_rate.avg
        )
      : null;

  const eurRateComparison: RateComparison | null =
    rates && isBinanceValid
      ? calculateEurUsdRateDifference(
          rates.eur,
          binanceRates.sell_rate.avg,
          binanceRates.buy_rate.avg
        )
      : null;

  const renderTrendIcon = (trend: BCVTrend) => {
    if (trend.trend === 'up') {
      return (
        <div className="inline-flex items-center rounded-lg border border-green-400 bg-green-100 px-3 py-1.5 dark:bg-green-900/30">
          <TrendingUpIcon className="h-5 w-5 text-green-600" />
          <span className="ml-1.5 text-base font-bold text-green-700 dark:text-green-300">
            +{Math.abs(trend.changePercent).toFixed(1)}%
          </span>
        </div>
      );
    } else if (trend.trend === 'down') {
      return (
        <div className="inline-flex items-center rounded-lg border border-red-400 bg-red-100 px-3 py-1.5 dark:bg-red-900/30">
          <TrendingDownIcon className="h-5 w-5 text-red-600" />
          <span className="ml-1.5 text-base font-bold text-red-700 dark:text-red-300">
            -{Math.abs(trend.changePercent).toFixed(1)}%
          </span>
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center rounded-lg border border-gray-300 bg-gray-100 px-3 py-1.5 dark:bg-gray-800">
          <Minus className="h-5 w-5 text-gray-600" />
          <span className="ml-1.5 text-base font-bold text-gray-700 dark:text-gray-300">
            0%
          </span>
        </div>
      );
    }
  };

  const convertCurrency = () => {
    if (!rates || !amount || isNaN(parseFloat(amount))) return 0;

    const numAmount = parseFloat(amount);

    if (fromCurrency === toCurrency) return numAmount;

    // Convert to VES first if needed
    let vesAmount = numAmount;
    if (fromCurrency === 'USD') {
      vesAmount = numAmount * rates.usd;
    } else if (fromCurrency === 'EUR') {
      vesAmount = numAmount * rates.eur;
    }

    // Convert from VES to target currency
    if (toCurrency === 'VES') {
      return vesAmount;
    } else if (toCurrency === 'USD') {
      return vesAmount / rates.usd;
    } else if (toCurrency === 'EUR') {
      return vesAmount / rates.eur;
    }

    return 0;
  };

  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      case 'VES':
        return 'Bs.';
      default:
        return '';
    }
  };

  if (!rates) {
    return (
      <motion.div
        className="animate-pulse rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mb-4 h-4 rounded bg-muted/30"></div>
        <div className="h-8 rounded bg-muted/30"></div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl lg:p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/20 to-red-500/20">
            <Landmark className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground sm:text-xl">
              Banco Central (BCV)
            </h3>
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">
              Tasa oficial del gobierno
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <motion.button
            onClick={() => setShowConverter(!showConverter)}
            className="group flex min-h-[44px] items-center justify-center rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 transition-all duration-200 hover:bg-primary/20 sm:px-4"
            title="Convertidor de Monedas"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Calculator className="h-4 w-4 text-primary transition-colors group-hover:text-primary-600 sm:h-5 sm:w-5" />
            <span className="ml-2 text-sm font-medium text-primary transition-colors group-hover:text-primary-600 sm:text-base">
              Convertir
            </span>
          </motion.button>
          <motion.button
            onClick={fetchRates}
            disabled={loading}
            className="group flex min-h-[44px] items-center justify-center rounded-xl border border-green-300 bg-green-50 px-3 py-2.5 transition-all duration-200 hover:bg-green-100 disabled:opacity-50 sm:px-4"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw
              className={`h-4 w-4 text-green-600 transition-colors group-hover:text-green-700 sm:h-5 sm:w-5 ${loading ? 'animate-spin' : ''}`}
            />
            <span className="ml-2 text-sm font-medium text-green-600 transition-colors group-hover:text-green-700 sm:text-base">
              Actualizar
            </span>
          </motion.button>
          <motion.a
            href="https://www.bcv.org.ve"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-[44px] items-center justify-center rounded-xl border border-gray-300 bg-gray-100 px-3 py-2.5 transition-all duration-200 hover:bg-gray-200 sm:px-4"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ExternalLink className="h-4 w-4 text-gray-600 transition-colors group-hover:text-gray-700 sm:h-5 sm:w-5" />
            <span className="ml-2 text-sm font-medium text-gray-600 transition-colors group-hover:text-gray-700 sm:text-base">
              Ver más
            </span>
          </motion.a>
        </div>
      </div>

      {/* Simple Binance Comparison */}
      {usdRateComparison && (
        <motion.div
          className="mb-6 rounded-2xl border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-orange-100 p-3 backdrop-blur-sm dark:border-orange-600 dark:from-orange-900/20 dark:to-orange-800/20 sm:p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-orange-600 sm:h-5 sm:w-5" />
              <span className="text-sm font-bold text-orange-700 dark:text-orange-300 sm:text-lg">
                vs Binance:
              </span>
            </div>
            <div className="inline-flex items-center rounded-full border-2 border-orange-400 bg-orange-100 px-3 py-2 dark:bg-orange-900/30 sm:px-4">
              <div className="flex items-center space-x-2">
                {usdRateComparison.isBCVHigher ? (
                  <TrendingUp className="h-4 w-4 text-orange-600 sm:h-5 sm:w-5" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-orange-600 sm:h-5 sm:w-5" />
                )}
                <span className="text-xs font-bold text-orange-700 dark:text-orange-300 sm:text-base">
                  BCV está{' '}
                  {formatPercentageDifference(
                    usdRateComparison.percentageDifference,
                    usdRateComparison.isBCVHigher
                  )}{' '}
                  que Binance
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Rates Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* USD Rate */}
        <motion.div
          className="rounded-2xl border border-border/20 bg-muted/10 p-4 backdrop-blur-sm transition-all duration-200 hover:border-success-500/30"
          variants={fadeInUp}
          whileHover={{ scale: 1.02 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-success-500" />
              <span className="text-base font-bold text-foreground sm:text-lg">
                Dólar (USD)
              </span>
            </div>
            {trends?.usd ? (
              renderTrendIcon(trends.usd)
            ) : (
              <div className="flex items-center space-x-1">
                <Minus className="h-3 w-3 text-muted-foreground" />
                <span className="text-ios-footnote text-muted-foreground">
                  0%
                </span>
              </div>
            )}
          </div>
          <p className="mb-1 text-2xl font-bold text-foreground sm:text-3xl">
            Bs. {rates.usd.toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground sm:text-base">
            1 USD = Bolívares
          </p>
        </motion.div>

        {/* EUR Rate */}
        <motion.div
          className="rounded-2xl border border-border/20 bg-muted/10 p-4 backdrop-blur-sm transition-all duration-200 hover:border-blue-500/30"
          variants={fadeInUp}
          whileHover={{ scale: 1.02 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Euro className="h-4 w-4 text-blue-500" />
              <span className="text-base font-bold text-foreground sm:text-lg">
                Euro (EUR)
              </span>
            </div>
            {trends?.eur ? (
              renderTrendIcon(trends.eur)
            ) : (
              <div className="flex items-center space-x-1">
                <Minus className="h-3 w-3 text-muted-foreground" />
                <span className="text-ios-footnote text-muted-foreground">
                  0%
                </span>
              </div>
            )}
          </div>
          <p className="mb-1 text-2xl font-bold text-foreground sm:text-3xl">
            Bs. {rates.eur.toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground sm:text-base">
            1 EUR = Bolívares
          </p>
        </motion.div>
      </div>

      {/* Currency Converter */}
      {showConverter && (
        <motion.div
          className="mb-6 rounded-2xl border border-border/20 bg-muted/5 p-4 backdrop-blur-sm"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-4 flex items-center space-x-2">
            <Calculator className="h-4 w-4 text-primary" />
            <h4 className="text-ios-body font-medium text-foreground">
              Conversión Rápida
            </h4>
          </div>

          <div className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="mb-2 block text-ios-caption font-medium text-muted-foreground">
                Cantidad
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ingresa el monto"
                className="w-full rounded-xl border border-border/30 bg-background/50 px-4 py-3 text-foreground transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Currency Selection */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-5 sm:gap-2">
              <div className="col-span-1 sm:col-span-2">
                <label className="mb-2 block text-ios-caption font-medium text-muted-foreground">
                  De
                </label>
                <select
                  value={fromCurrency}
                  onChange={(e) =>
                    setFromCurrency(e.target.value as 'VES' | 'USD' | 'EUR')
                  }
                  className="min-h-[44px] w-full rounded-xl border border-border/30 bg-background/50 px-3 py-3 text-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                >
                  <option value="USD">USD - Dólar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="VES">VES - Bolívar</option>
                </select>
              </div>

              <div className="col-span-1 flex justify-center sm:col-span-1">
                <motion.button
                  onClick={swapCurrencies}
                  className="min-h-[44px] min-w-[44px] rounded-xl bg-primary/10 p-3 transition-all duration-200 hover:bg-primary/20"
                  title="Intercambiar monedas"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowUpDown className="h-4 w-4 text-primary" />
                </motion.button>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="mb-2 block text-ios-caption font-medium text-muted-foreground">
                  A
                </label>
                <select
                  value={toCurrency}
                  onChange={(e) =>
                    setToCurrency(e.target.value as 'VES' | 'USD' | 'EUR')
                  }
                  className="min-h-[44px] w-full rounded-xl border border-border/30 bg-background/50 px-3 py-3 text-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                >
                  <option value="USD">USD - Dólar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="VES">VES - Bolívar</option>
                </select>
              </div>
            </div>

            {/* Result */}
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
              <div className="text-center">
                <p className="mb-1 text-ios-caption text-muted-foreground">
                  Resultado
                </p>
                <p className="text-3xl font-light text-primary">
                  {getCurrencySymbol(toCurrency)}{' '}
                  {convertCurrency().toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="mt-1 text-ios-footnote text-muted-foreground">
                  {amount} {fromCurrency} = {convertCurrency().toFixed(2)}{' '}
                  {toCurrency}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Footer */}
      <div className="flex flex-col gap-2 text-ios-footnote text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-3 sm:space-y-0">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span className="text-xs sm:text-sm">
              Actualizado: {lastUpdated}
            </span>
          </div>
          {rates?.cached && !rates?.fallback && (
            <Badge
              variant="info"
              size="sm"
              title={
                typeof rates.cacheAge === 'number'
                  ? `Cache age: ${formatAge(rates.cacheAge)}`
                  : 'Cache'
              }
            >
              CACHE
              {typeof rates.cacheAge === 'number' &&
                ` · ${formatAge(rates.cacheAge)}`}
            </Badge>
          )}
          {rates?.fallback && (
            <Badge
              variant="warning"
              size="sm"
              title={
                rates.fallbackReason
                  ? `Fallback: ${rates.fallbackReason}`
                  : 'Fallback'
              }
            >
              FALLBACK
              {typeof rates.dataAge === 'number' &&
                ` · ${formatAge(rates.dataAge)}`}
            </Badge>
          )}
          {!rates?.fallback && !isLive && rates?.lastUpdated && (
            <Badge variant="outline" size="sm" title="Datos no recientes">
              STALE
            </Badge>
          )}
          {error && (
            <span className="rounded-lg bg-error-500/10 px-2 py-1 text-xs text-error-500">
              {error}
            </span>
          )}
        </div>
        <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
          {isLive && (
            <div className="flex items-center space-x-1 text-success-500">
              <div className="h-2 w-2 animate-pulse rounded-full bg-success-500"></div>
              <span className="text-xs font-medium sm:text-sm">OFICIAL</span>
            </div>
          )}
          <span className="text-xs font-medium text-yellow-600 sm:text-sm">
            bcv.org.ve
          </span>
        </div>
      </div>
    </motion.div>
  );
}
