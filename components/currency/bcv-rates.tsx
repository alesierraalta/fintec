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
  Percent
} from 'lucide-react';
import { currencyService } from '@/lib/services/currency-service';
import type { BCVRates } from '@/lib/services/currency-service';
import { BCVTrend } from '@/lib/services/bcv-history-service';
import { useBinanceRates } from '@/hooks/use-binance-rates';
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

export function BCVRates() {
  const [rates, setRates] = useState<BCVRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLive, setIsLive] = useState(false);
  const [trends, setTrends] = useState<{ usd: BCVTrend; eur: BCVTrend } | null>(null);
  
  // Get Binance rates for comparison
  const { rates: binanceRates } = useBinanceRates();
  
  // Currency converter state
  const [showConverter, setShowConverter] = useState(false);
  const [amount, setAmount] = useState<string>('1');
  const [fromCurrency, setFromCurrency] = useState<'VES' | 'USD' | 'EUR'>('USD');
  const [toCurrency, setToCurrency] = useState<'VES' | 'USD' | 'EUR'>('VES');

  const fetchRates = async () => {
    setLoading(true);
    setError('');
    try {
      const bcvRates = await currencyService.fetchBCVRates();
      setRates(bcvRates);
      setLastUpdated(new Date().toLocaleString('es-VE'));
      setIsLive(true);
      
      // Check if rates are very recent (less than 1 hour old)
      const rateTime = new Date(bcvRates.lastUpdated);
      const now = new Date();
      const hoursDiff = (now.getTime() - rateTime.getTime()) / (1000 * 60 * 60);
      setIsLive(hoursDiff < 1);
      
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
    
    // Auto-refresh every 10 minutes for BCV data
    const interval = setInterval(fetchRates, 600000);
    return () => clearInterval(interval);
  }, []);

  // Calculate percentage difference with Binance for both USD and EUR
  const usdRateComparison: RateComparison | null = rates && binanceRates ? 
    calculateAverageRateDifference(rates.usd, binanceRates.sell_rate.avg, binanceRates.buy_rate.avg) : 
    null;
    
  const eurRateComparison: RateComparison | null = rates && binanceRates ? 
    calculateEurUsdRateDifference(rates.eur, binanceRates.sell_rate.avg, binanceRates.buy_rate.avg) : 
    null;

  const renderTrendIcon = (trend: BCVTrend) => {
    if (trend.trend === 'up') {
      return (
        <div className="flex items-center space-x-1">
          <TrendingUpIcon className="h-3 w-3 text-success-500" />
          <span className="text-ios-footnote text-success-500 font-medium">+{Math.abs(trend.changePercent).toFixed(2)}%</span>
        </div>
      );
    } else if (trend.trend === 'down') {
      return (
        <div className="flex items-center space-x-1">
          <TrendingDownIcon className="h-3 w-3 text-error-500" />
          <span className="text-ios-footnote text-error-500 font-medium">-{Math.abs(trend.changePercent).toFixed(2)}%</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-1">
          <Minus className="h-3 w-3 text-muted-foreground" />
          <span className="text-ios-footnote text-muted-foreground">0.00%</span>
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
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'VES': return 'Bs.';
      default: return '';
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-red-500/20 flex items-center justify-center border border-yellow-500/20">
            <Landmark className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-ios-title font-semibold text-foreground">Banco Central de Venezuela</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-success-500 animate-pulse' : 'bg-warning-500'}`}></div>
              <p className="text-ios-caption text-muted-foreground tracking-wide">TASAS OFICIALES</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <motion.button
            onClick={() => setShowConverter(!showConverter)}
            className="p-3 rounded-xl bg-muted/20 hover:bg-primary/10 transition-all duration-200 group"
            title="Convertidor de Monedas"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Calculator className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </motion.button>
          <motion.button
            onClick={fetchRates}
            disabled={loading}
            className="p-3 rounded-xl bg-muted/20 hover:bg-primary/10 transition-all duration-200 disabled:opacity-50 group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className={`h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
          <motion.a 
            href="https://www.bcv.org.ve" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-muted/20 hover:bg-primary/10 transition-all duration-200 group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </motion.a>
        </div>
      </div>

      {/* Binance Comparison - New Section */}
      {(usdRateComparison || eurRateComparison) && (
        <motion.div 
          className="bg-gradient-to-r from-primary/5 to-blue-500/5 backdrop-blur-sm rounded-2xl p-4 border border-primary/20 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h4 className="text-ios-body font-medium text-foreground">Comparación con Binance P2P</h4>
          </div>
          
          {/* USD Comparison */}
          {usdRateComparison && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-success-500" />
                  <span className="text-ios-body font-medium text-foreground">USD/VES vs USD/VES</span>
                </div>
                <div className={`px-3 py-1 rounded-full text-ios-footnote font-medium border ${getPercentageColorClass(usdRateComparison.isBCVHigher)}`}>
                  <div className="flex items-center space-x-1">
                    {usdRateComparison.isBCVHigher ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{formatPercentageDifference(usdRateComparison.percentageDifference, usdRateComparison.isBCVHigher)}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
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
                  {usdRateComparison.comparisonText}
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
                <div className={`px-3 py-1 rounded-full text-ios-footnote font-medium border ${getPercentageColorClass(eurRateComparison.isBCVHigher)}`}>
                  <div className="flex items-center space-x-1">
                    {eurRateComparison.isBCVHigher ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{formatPercentageDifference(eurRateComparison.percentageDifference, eurRateComparison.isBCVHigher)}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
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
                  {eurRateComparison.comparisonText}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Rates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mb-6">
        {/* USD Rate */}
        <motion.div 
          className="bg-muted/10 backdrop-blur-sm rounded-2xl p-4 border border-border/20 hover:border-success-500/30 transition-all duration-200"
          variants={fadeInUp}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-success-500" />
              <span className="text-ios-body font-medium text-foreground">USD/VES</span>
            </div>
            {trends?.usd ? renderTrendIcon(trends.usd) : (
              <div className="flex items-center space-x-1">
                <Minus className="h-3 w-3 text-muted-foreground" />
                <span className="text-ios-footnote text-muted-foreground">0%</span>
              </div>
            )}
          </div>
          <p className="text-2xl font-light text-foreground mb-1">Bs. {rates.usd.toFixed(2)}</p>
          <p className="text-ios-caption text-muted-foreground">por 1 USD</p>
        </motion.div>

        {/* EUR Rate */}
        <motion.div 
          className="bg-muted/10 backdrop-blur-sm rounded-2xl p-4 border border-border/20 hover:border-blue-500/30 transition-all duration-200"
          variants={fadeInUp}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Euro className="h-4 w-4 text-blue-500" />
              <span className="text-ios-body font-medium text-foreground">EUR/VES</span>
            </div>
            {trends?.eur ? renderTrendIcon(trends.eur) : (
              <div className="flex items-center space-x-1">
                <Minus className="h-3 w-3 text-muted-foreground" />
                <span className="text-ios-footnote text-muted-foreground">0%</span>
              </div>
            )}
          </div>
          <p className="text-2xl font-light text-foreground mb-1">Bs. {rates.eur.toFixed(2)}</p>
          <p className="text-ios-caption text-muted-foreground">por 1 EUR</p>
        </motion.div>
      </div>

      {/* Currency Converter */}
      {showConverter && (
        <motion.div 
          className="bg-muted/5 backdrop-blur-sm rounded-2xl p-4 border border-border/20 mb-6"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center space-x-2 mb-4">
            <Calculator className="h-4 w-4 text-primary" />
            <h4 className="text-ios-body font-medium text-foreground">Conversión Rápida</h4>
          </div>
          
          <div className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="block text-ios-caption font-medium text-muted-foreground mb-2">Cantidad</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ingresa el monto"
                className="w-full px-4 py-3 bg-background/50 border border-border/30 rounded-xl text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
              />
            </div>
            
            {/* Currency Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 sm:gap-2 items-center">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-ios-caption font-medium text-muted-foreground mb-2">De</label>
                <select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value as 'VES' | 'USD' | 'EUR')}
                  className="w-full px-3 py-3 bg-background/50 border border-border/30 rounded-xl text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                >
                  <option value="USD">USD - Dólar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="VES">VES - Bolívar</option>
                </select>
              </div>
              
              <div className="flex justify-center col-span-1 sm:col-span-1">
                <motion.button
                  onClick={swapCurrencies}
                  className="p-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all duration-200"
                  title="Intercambiar monedas"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowUpDown className="h-4 w-4 text-primary" />
                </motion.button>
              </div>
              
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-ios-caption font-medium text-muted-foreground mb-2">A</label>
                <select
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value as 'VES' | 'USD' | 'EUR')}
                  className="w-full px-3 py-3 bg-background/50 border border-border/30 rounded-xl text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                >
                  <option value="USD">USD - Dólar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="VES">VES - Bolívar</option>
                </select>
              </div>
            </div>
            
            {/* Result */}
            <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
              <div className="text-center">
                <p className="text-ios-caption text-muted-foreground mb-1">Resultado</p>
                <p className="text-3xl font-light text-primary">
                  {getCurrencySymbol(toCurrency)} {convertCurrency().toLocaleString('es-VE', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </p>
                <p className="text-ios-footnote text-muted-foreground mt-1">
                  {amount} {fromCurrency} = {convertCurrency().toFixed(2)} {toCurrency}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-ios-footnote text-muted-foreground">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Actualizado: {lastUpdated}</span>
          </div>
          {error && (
            <span className="text-error-500 bg-error-500/10 px-2 py-1 rounded-lg">
              {error}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isLive && (
            <div className="flex items-center space-x-1 text-success-500">
              <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
              <span className="font-medium">OFICIAL</span>
            </div>
          )}
          <span className="text-yellow-600 font-medium">bcv.org.ve</span>
        </div>
      </div>
    </motion.div>
  );
}
