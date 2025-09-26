'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Percent,
  Euro
} from 'lucide-react';
import { currencyService } from '@/lib/services/currency-service';
import type { BinanceRates } from '@/lib/services/currency-service';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { 
  calculateAverageRateDifference, 
  calculateEurUsdRateDifference,
  formatPercentageDifference, 
  getPercentageColorClass,
  type RateComparison 
} from '@/lib/rate-comparison';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export const BinanceRates = React.memo(function BinanceRates() {
  const [rates, setRates] = useState<BinanceRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLive, setIsLive] = useState(false);

  // Get BCV rates for comparison
  const bcvRates = useBCVRates();

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const binanceRates = await currencyService.fetchBinanceRates();
      setRates(binanceRates);
      setLastUpdated(new Date().toLocaleString('es-VE'));
      setIsLive(true);
      
      // Check if rates are very recent (less than 5 minutes old)
      const rateTime = new Date(binanceRates.lastUpdated);
      const now = new Date();
      const minutesDiff = (now.getTime() - rateTime.getTime()) / (1000 * 60);
      setIsLive(minutesDiff < 5);
    } catch (error) {
      setError('Error al obtener datos de Binance P2P');
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    
    // Auto-refresh every 2 minutes for P2P data
    const interval = setInterval(fetchRates, 120000);
    return () => clearInterval(interval);
  }, [fetchRates]);

  // Calculate percentage difference with BCV for both USD and EUR
  // Memoize expensive calculations
  const usdRateComparison: RateComparison | null = useMemo(() => {
    return rates && bcvRates ? 
      calculateAverageRateDifference(bcvRates.usd, rates.sell_rate.avg, rates.buy_rate.avg) : 
      null;
  }, [rates, bcvRates]);
    
  const eurRateComparison: RateComparison | null = useMemo(() => {
    return rates && bcvRates ? 
      calculateEurUsdRateDifference(bcvRates.eur, rates.sell_rate.avg, rates.buy_rate.avg) : 
      null;
  }, [rates, bcvRates]);

  // Memoize other expensive calculations
  const marketSummary = useMemo(() => {
    if (!rates) return null;
    return {
      average: (rates.sell_rate.avg + rates.buy_rate.avg) / 2,
      spread: Math.abs(rates.sell_rate.avg - rates.buy_rate.avg),
      totalOffers: rates.prices_used
    };
  }, [rates]);

  // Memoize handlers
  const handleRefresh = useCallback(() => {
    fetchRates();
  }, [fetchRates]);

  const handleOpenBinance = useCallback(() => {
    window.open('https://p2p.binance.com/es', '_blank', 'noopener,noreferrer');
  }, []);

  if (!rates) {
    return (
      <motion.div 
        className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg animate-pulse"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="h-4 bg-muted/30 rounded mb-4"></div>
        <div className="h-8 bg-muted/30 rounded"></div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 lg:p-8 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center border border-orange-500/20">
            <Zap className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-ios-title font-semibold text-foreground">Binance P2P</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-success-500 animate-pulse' : 'bg-warning-500'}`}></div>
              <p className="text-ios-caption text-muted-foreground tracking-wide text-xs sm:text-sm">USD/VES EN TIEMPO REAL</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <motion.button
            onClick={handleRefresh}
            disabled={loading}
            className="p-3 rounded-xl bg-muted/20 hover:bg-primary/10 transition-all duration-200 disabled:opacity-50 group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className={`h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
          <motion.button
            onClick={handleOpenBinance}
            className="p-3 rounded-xl bg-muted/20 hover:bg-primary/10 transition-all duration-200 group"
            title="Abrir Binance P2P directamente"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </motion.button>
        </div>
      </div>

      {/* BCV Comparison - New Section */}
      {(usdRateComparison || eurRateComparison) && (
        <motion.div 
          className="bg-gradient-to-r from-orange-500/5 to-yellow-500/5 backdrop-blur-sm rounded-2xl p-4 border border-orange-500/20 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="h-4 w-4 text-orange-600" />
            <h4 className="text-ios-body font-medium text-foreground">Comparación con BCV Oficial</h4>
          </div>
          
          {/* USD Comparison */}
          {usdRateComparison && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-success-500" />
                  <span className="text-ios-body font-medium text-foreground">USD/VES vs USD/VES</span>
                </div>
                <div className={`px-3 py-1 rounded-full text-ios-footnote font-medium border ${getPercentageColorClass(!usdRateComparison.isBCVHigher)}`}>
                  <div className="flex items-center space-x-1">
                    {!usdRateComparison.isBCVHigher ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{formatPercentageDifference(usdRateComparison.percentageDifference, !usdRateComparison.isBCVHigher)}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-ios-caption text-muted-foreground mb-1">BCV USD</p>
                  <p className="text-lg font-semibold text-yellow-600">Bs. {usdRateComparison.bcvRate.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-ios-caption text-muted-foreground mb-1">Binance USD</p>
                  <p className="text-lg font-semibold text-orange-600">Bs. {usdRateComparison.binanceRate.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-ios-caption text-muted-foreground mb-1">Diferencia</p>
                  <p className="text-lg font-semibold text-foreground">Bs. {usdRateComparison.absoluteDifference.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-2 text-center">
                <p className="text-ios-footnote text-muted-foreground">
                  {!usdRateComparison.isBCVHigher ? 
                    `Binance P2P es ${usdRateComparison.percentageDifference.toFixed(1)}% más alto que BCV` :
                    `BCV es ${usdRateComparison.percentageDifference.toFixed(1)}% más alto que Binance P2P`
                  }
                </p>
              </div>
            </div>
          )}
          
          {/* EUR Comparison */}
          {eurRateComparison && (
            <div className="border-t border-border/20 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Euro className="h-4 w-4 text-blue-500" />
                  <span className="text-ios-body font-medium text-foreground">EUR/VES vs USD/VES</span>
                </div>
                <div className={`px-3 py-1 rounded-full text-ios-footnote font-medium border ${getPercentageColorClass(!eurRateComparison.isBCVHigher)}`}>
                  <div className="flex items-center space-x-1">
                    {!eurRateComparison.isBCVHigher ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{formatPercentageDifference(eurRateComparison.percentageDifference, !eurRateComparison.isBCVHigher)}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-ios-caption text-muted-foreground mb-1">BCV EUR</p>
                  <p className="text-lg font-semibold text-yellow-600">Bs. {eurRateComparison.bcvRate.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-ios-caption text-muted-foreground mb-1">Binance USD</p>
                  <p className="text-lg font-semibold text-orange-600">Bs. {eurRateComparison.binanceRate.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-ios-caption text-muted-foreground mb-1">Diferencia</p>
                  <p className="text-lg font-semibold text-foreground">Bs. {eurRateComparison.absoluteDifference.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-2 text-center">
                <p className="text-ios-footnote text-muted-foreground">
                  {!eurRateComparison.isBCVHigher ? 
                    `Binance P2P es ${eurRateComparison.percentageDifference.toFixed(1)}% más alto que BCV EUR` :
                    `BCV EUR es ${eurRateComparison.percentageDifference.toFixed(1)}% más alto que Binance P2P`
                  }
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Main Rates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 mb-6">
        {/* VENTA (Sell) - Precio más alto */}
        <motion.div 
          className="bg-gradient-to-br from-red-500/10 to-red-600/5 backdrop-blur-sm rounded-2xl p-4 border border-red-500/20 hover:border-red-500/30 transition-all duration-200"
          variants={fadeInUp}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/20"></div>
              <span className="text-ios-body font-medium text-foreground">VENTA</span>
            </div>
            {isLive && (
              <div className="flex items-center space-x-1">
                <Activity className="h-3 w-3 text-success-500 animate-pulse" />
                <span className="text-ios-footnote text-success-500 font-medium">VIVO</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-light text-red-500">
              Bs. {rates.sell_rate.avg.toFixed(2)}
            </p>
            <div className="flex justify-between text-xs">
              <span className="text-red-400">Min: {rates.sell_rate.min.toFixed(2)}</span>
              <span className="text-red-400">Max: {rates.sell_rate.max.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-ios-caption text-muted-foreground mb-2">Vendedores piden</p>
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3 text-red-400" />
            <span className="text-ios-footnote text-red-400 font-medium">{rates.sell_prices_used} ofertas</span>
          </div>
        </motion.div>

        {/* COMPRA (Buy) - Precio más bajo */}
        <motion.div 
          className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm rounded-2xl p-4 border border-green-500/20 hover:border-green-500/30 transition-all duration-200"
          variants={fadeInUp}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/20"></div>
              <span className="text-ios-body font-medium text-foreground">COMPRA</span>
            </div>
            {isLive && (
              <div className="flex items-center space-x-1">
                <Activity className="h-3 w-3 text-success-500 animate-pulse" />
                <span className="text-ios-footnote text-success-500 font-medium">VIVO</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-light text-green-500">
              Bs. {rates.buy_rate.avg.toFixed(2)}
            </p>
            <div className="flex justify-between text-xs">
              <span className="text-green-400">Min: {rates.buy_rate.min.toFixed(2)}</span>
              <span className="text-green-400">Max: {rates.buy_rate.max.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-ios-caption text-muted-foreground mb-2">Compradores ofrecen</p>
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3 text-green-400" />
            <span className="text-ios-footnote text-green-400 font-medium">{rates.buy_prices_used} ofertas</span>
          </div>
        </motion.div>
      </div>

      {/* Market Summary */}
      <motion.div 
        className="bg-muted/5 backdrop-blur-sm rounded-2xl p-4 border border-border/20 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center space-x-1 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-ios-caption font-medium text-muted-foreground">PROMEDIO</p>
            </div>
            <p className="text-xl font-light text-primary">Bs. {marketSummary?.average.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <div className="flex items-center justify-center space-x-1 mb-2">
              <ArrowUpDown className="h-4 w-4 text-orange-500" />
              <p className="text-ios-caption font-medium text-muted-foreground">SPREAD</p>
            </div>
            <p className="text-xl font-light text-orange-500">Bs. {marketSummary?.spread.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <div className="flex items-center justify-center space-x-1 mb-2">
              <Users className="h-4 w-4 text-blue-500" />
              <p className="text-ios-caption font-medium text-muted-foreground">OFERTAS</p>
            </div>
            <p className="text-xl font-light text-blue-500">{marketSummary?.totalOffers || 0}</p>
          </div>
        </div>
      </motion.div>

      {/* Market Explanation */}
      <motion.div 
        className="bg-primary/5 backdrop-blur-sm rounded-2xl p-4 border border-primary/10 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="text-center space-y-2">
          <p className="text-ios-caption text-muted-foreground text-xs sm:text-sm leading-relaxed">
            <strong className="text-red-500">VENTA:</strong> Si vendes USD, recibes esta cantidad en Bs.
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> · </span>
            <strong className="text-green-500 sm:ml-1">COMPRA:</strong> Si compras USD, pagas esta cantidad en Bs.
          </p>
          <div className="flex items-center justify-center space-x-2">
            <ArrowUpDown className="h-3 w-3 text-orange-500" />
            <span className="text-ios-footnote text-orange-500 font-medium">
              Diferencia del mercado: Bs. {marketSummary?.spread.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 text-ios-footnote text-muted-foreground">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span className="truncate text-xs sm:text-sm">Actualizado: {lastUpdated}</span>
          </div>
          {error && (
            <span className="text-error-500 bg-error-500/10 px-2 py-1 rounded-lg text-xs">
              {error}
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
          {isLive && (
            <div className="flex items-center space-x-1 text-success-500">
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
              <span className="font-medium text-xs sm:text-sm">P2P LIVE</span>
            </div>
          )}
          <span className="text-orange-600 font-medium text-xs sm:text-sm">Binance Venezuela</span>
        </div>
      </div>
    </motion.div>
  );
});