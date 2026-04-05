'use client';

import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  DollarSign,
  Clock,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Zap,
  Users,
  Target,
  Activity,
  BarChart3,
  Euro,
  AlertTriangle,
} from 'lucide-react';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import type { BinanceRatesSnapshot } from '@/hooks/use-binance-rates';
import {
  calculateAverageRateDifference,
  calculateEurUsdRateDifference,
  formatPercentageDifference,
  getPercentageColorClass,
  type RateComparison,
} from '@/lib/rate-comparison';

export interface BinanceRatesCardProps {
  snapshot: BinanceRatesSnapshot;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export const BinanceRatesComponent = React.memo(function BinanceRatesComponent({
  snapshot,
}: BinanceRatesCardProps) {
  const { rates, loading, status, message, lastUpdatedLabel, refetch } =
    snapshot;
  const bcvRates = useBCVRates();

  const usdRateComparison: RateComparison | null = useMemo(() => {
    return rates && bcvRates
      ? calculateAverageRateDifference(
          bcvRates.usd,
          rates.sell_rate.avg,
          rates.buy_rate.avg
        )
      : null;
  }, [rates, bcvRates]);

  const eurRateComparison: RateComparison | null = useMemo(() => {
    return rates && bcvRates
      ? calculateEurUsdRateDifference(
          bcvRates.eur,
          rates.sell_rate.avg,
          rates.buy_rate.avg
        )
      : null;
  }, [rates, bcvRates]);

  const marketSummary = useMemo(() => {
    return {
      average: (rates.sell_rate.avg + rates.buy_rate.avg) / 2,
      spread: Math.abs(rates.sell_rate.avg - rates.buy_rate.avg),
      totalOffers: rates.prices_used,
    };
  }, [rates]);

  const handleRefresh = useCallback(() => {
    if (!loading) {
      void refetch();
    }
  }, [loading, refetch]);

  const handleOpenBinance = useCallback(() => {
    window.open('https://p2p.binance.com/es', '_blank', 'noopener,noreferrer');
  }, []);

  const isLive = status === 'live';
  const statusChip =
    status === 'fallback'
      ? {
          label: 'REFERENCIA',
          className:
            'border-amber-400 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
          icon: AlertTriangle,
        }
      : status === 'stale'
        ? {
            label: 'DESACT.',
            className:
              'border-warning-400 bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
            icon: Clock,
          }
        : {
            label: 'VIVO',
            className:
              'border-green-400 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
            icon: Activity,
          };

  const StatusIcon = statusChip.icon;

  return (
    <motion.div
      className="rounded-3xl border border-border/40 bg-card/90 p-6 shadow-lg backdrop-blur-xl transition-all duration-300 hover:shadow-xl lg:p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/20 to-yellow-500/20">
            <Zap className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground sm:text-xl">
              Binance (Mercado Digital)
            </h3>
            <p className="text-xs font-medium text-orange-600 sm:text-sm">
              Precio real P2P
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-bold ${statusChip.className}`}
          >
            <StatusIcon className="mr-1.5 h-4 w-4" />
            <span>{statusChip.label}</span>
          </div>

          <div className="flex items-center space-x-2">
            <motion.button
              onClick={handleRefresh}
              disabled={loading}
              aria-label="Actualizar tasas de Binance"
              className="group min-h-[44px] min-w-[44px] rounded-xl bg-muted/20 p-3 transition-all duration-200 hover:bg-primary/10 disabled:opacity-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw
                className={`h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary ${loading ? 'animate-spin' : ''}`}
              />
            </motion.button>
            <motion.button
              onClick={handleOpenBinance}
              aria-label="Abrir Binance P2P"
              className="group min-h-[44px] min-w-[44px] rounded-xl bg-muted/20 p-3 transition-all duration-200 hover:bg-primary/10"
              title="Abrir Binance P2P directamente"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </motion.button>
          </div>
        </div>
      </div>

      {(usdRateComparison || eurRateComparison) && (
        <motion.div
          className="mb-6 rounded-2xl border border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-yellow-500/5 p-4 backdrop-blur-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mb-4 flex items-center space-x-2">
            <BarChart3 className="h-4 w-4 text-orange-600" />
            <h4 className="text-ios-body font-medium text-foreground">
              Comparación con BCV Oficial
            </h4>
          </div>

          {usdRateComparison && (
            <div className="mb-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-success-500" />
                  <span className="text-ios-body font-medium text-foreground">
                    USD/VES vs USD/VES
                  </span>
                </div>
                <div
                  className={`rounded-full border px-3 py-1 text-ios-footnote font-medium ${getPercentageColorClass(!usdRateComparison.isBCVHigher)}`}
                >
                  <div className="flex items-center space-x-1">
                    {!usdRateComparison.isBCVHigher ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>
                      {formatPercentageDifference(
                        usdRateComparison.percentageDifference,
                        !usdRateComparison.isBCVHigher
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3 sm:gap-4">
                <div>
                  <p className="mb-1 text-ios-caption text-muted-foreground">
                    BCV USD
                  </p>
                  <p className="text-base font-semibold text-yellow-600 sm:text-lg">
                    Bs. {usdRateComparison.bcvRate.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-ios-caption text-muted-foreground">
                    Binance USD
                  </p>
                  <p className="text-base font-semibold text-orange-600 sm:text-lg">
                    Bs. {usdRateComparison.binanceRate.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-ios-caption text-muted-foreground">
                    Diferencia
                  </p>
                  <p className="text-base font-semibold text-foreground sm:text-lg">
                    Bs. {usdRateComparison.absoluteDifference.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {eurRateComparison && (
            <div className="border-t border-border/20 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Euro className="h-4 w-4 text-blue-500" />
                  <span className="text-ios-body font-medium text-foreground">
                    EUR/VES vs USD/VES
                  </span>
                </div>
                <div
                  className={`rounded-full border px-3 py-1 text-ios-footnote font-medium ${getPercentageColorClass(!eurRateComparison.isBCVHigher)}`}
                >
                  <div className="flex items-center space-x-1">
                    {!eurRateComparison.isBCVHigher ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>
                      {formatPercentageDifference(
                        eurRateComparison.percentageDifference,
                        !eurRateComparison.isBCVHigher
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3 sm:gap-4">
                <div>
                  <p className="mb-1 text-ios-caption text-muted-foreground">
                    BCV EUR
                  </p>
                  <p className="text-base font-semibold text-yellow-600 sm:text-lg">
                    Bs. {eurRateComparison.bcvRate.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-ios-caption text-muted-foreground">
                    Binance USD
                  </p>
                  <p className="text-base font-semibold text-orange-600 sm:text-lg">
                    Bs. {eurRateComparison.binanceRate.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-ios-caption text-muted-foreground">
                    Diferencia
                  </p>
                  <p className="text-base font-semibold text-foreground sm:text-lg">
                    Bs. {eurRateComparison.absoluteDifference.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <motion.div
          className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-red-600/5 p-4 backdrop-blur-sm transition-all duration-200 hover:border-red-500/30"
          variants={fadeInUp}
          whileHover={{ scale: 1.02 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-red-500 shadow-lg shadow-red-500/20"></div>
              <span className="text-ios-body font-medium text-foreground">
                VENTA
              </span>
            </div>
            {isLive && (
              <div className="inline-flex items-center rounded-full border border-green-400 bg-green-100 px-3 py-1.5 dark:bg-green-900/30">
                <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <Activity className="mr-1 h-4 w-4 text-green-600" />
                <span className="text-sm font-bold text-green-700 dark:text-green-300">
                  VIVO
                </span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xl font-light text-red-500 sm:text-2xl">
              Bs. {rates.sell_rate.avg.toFixed(2)}
            </p>
            <div className="flex justify-between text-xs">
              <span className="text-red-400">
                Min: {rates.sell_rate.min.toFixed(2)}
              </span>
              <span className="text-red-400">
                Max: {rates.sell_rate.max.toFixed(2)}
              </span>
            </div>
          </div>
          <p className="mb-2 text-ios-caption text-muted-foreground">
            Vendedores piden
          </p>
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3 text-red-400" />
            <span className="text-ios-footnote font-medium text-red-400">
              {rates.sell_prices_used} ofertas
            </span>
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-600/5 p-4 backdrop-blur-sm transition-all duration-200 hover:border-green-500/30"
          variants={fadeInUp}
          whileHover={{ scale: 1.02 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-green-500 shadow-lg shadow-green-500/20"></div>
              <span className="text-ios-body font-medium text-foreground">
                COMPRA
              </span>
            </div>
            {isLive && (
              <div className="inline-flex items-center rounded-full border border-green-400 bg-green-100 px-3 py-1.5 dark:bg-green-900/30">
                <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <Activity className="mr-1 h-4 w-4 text-green-600" />
                <span className="text-sm font-bold text-green-700 dark:text-green-300">
                  VIVO
                </span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xl font-light text-green-500 sm:text-2xl">
              Bs. {rates.buy_rate.avg.toFixed(2)}
            </p>
            <div className="flex justify-between text-xs">
              <span className="text-green-400">
                Min: {rates.buy_rate.min.toFixed(2)}
              </span>
              <span className="text-green-400">
                Max: {rates.buy_rate.max.toFixed(2)}
              </span>
            </div>
          </div>
          <p className="mb-2 text-ios-caption text-muted-foreground">
            Compradores ofrecen
          </p>
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3 text-green-400" />
            <span className="text-ios-footnote font-medium text-green-400">
              {rates.buy_prices_used} ofertas
            </span>
          </div>
        </motion.div>
      </div>

      <motion.div
        className="mb-6 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-4 backdrop-blur-sm sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="py-2 text-center sm:py-4">
          <div className="mb-2 flex items-center justify-center space-x-2 sm:mb-3">
            <Target className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
            <p className="text-base font-bold text-primary sm:text-lg">
              💵 USDT → Bolívares
            </p>
          </div>
          <p className="mb-2 text-3xl font-bold text-primary sm:mb-3 sm:text-5xl">
            Bs. {marketSummary.average.toFixed(2)}
          </p>
          <p className="text-sm font-medium text-muted-foreground sm:text-lg">
            Promedio del mercado digital
          </p>
        </div>
      </motion.div>

      <motion.div
        className="mb-6 rounded-2xl border border-primary/10 bg-primary/5 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="text-center">
          <p className="text-ios-caption text-muted-foreground">
            📊 Precio real del mercado digital (Binance P2P)
          </p>
          <div className="mt-2 flex items-center justify-center space-x-2">
            <ArrowUpDown className="h-3 w-3 text-orange-500" />
            <span className="text-ios-footnote font-medium text-orange-500">
              Diferencia: Bs. {marketSummary.spread.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {marketSummary.totalOffers} ofertas procesadas
          </div>
        </div>
      </motion.div>

      <div className="flex flex-col gap-2 text-ios-footnote text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-3 sm:space-y-0">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span className="truncate text-xs sm:text-sm">
              Actualizado: {lastUpdatedLabel}
            </span>
          </div>
          {message && (
            <span className="rounded-lg bg-error-500/10 px-2 py-1 text-xs text-error-500">
              {message}
            </span>
          )}
        </div>
        <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
          {isLive && (
            <div className="inline-flex items-center rounded-full border border-green-400 bg-green-100 px-3 py-1.5 dark:bg-green-900/30">
              <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-sm font-bold text-green-700 dark:text-green-300">
                P2P LIVE
              </span>
            </div>
          )}
          <span className="text-xs font-medium text-orange-600 sm:text-sm">
            Binance Venezuela
          </span>
        </div>
      </div>
    </motion.div>
  );
});
