'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Calculator,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Euro,
  ArrowUpDown,
  X,
  RefreshCw,
  Clock,
  BarChart3
} from 'lucide-react';
import { bcvHistoryService, BCVHistoryRecord } from '@/lib/services/bcv-history-service';
import { binanceHistoryService, BinanceHistoryRecord } from '@/lib/services/binance-history-service';
import { currencyService } from '@/lib/services/currency-service';
import { Button } from '@/components/ui';
import { logger } from '@/lib/utils/logger';

interface RatesHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CalculatorState {
  amount: string;
  fromCurrency: 'VES' | 'USD' | 'EUR';
  toCurrency: 'VES' | 'USD' | 'EUR';
  selectedBCVRate: BCVHistoryRecord | null;
  selectedBinanceRate: BinanceHistoryRecord | null;
  result: number;
  activeSource: 'BCV' | 'Binance';
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } }
};

export function RatesHistory({ isOpen, onClose }: RatesHistoryProps) {
  const [bcvHistoricalRates, setBcvHistoricalRates] = useState<BCVHistoryRecord[]>([]);
  const [binanceHistoricalRates, setBinanceHistoricalRates] = useState<BinanceHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'calculator'>('history');
  const [activeSource, setActiveSource] = useState<'BCV' | 'Binance'>('BCV');
  const [calculator, setCalculator] = useState<CalculatorState>({
    amount: '1',
    fromCurrency: 'USD',
    toCurrency: 'VES',
    selectedBCVRate: null,
    selectedBinanceRate: null,
    result: 0,
    activeSource: 'BCV'
  });

  const calculateResult = useCallback((
    bcvRate: BCVHistoryRecord | null, 
    binanceRate: BinanceHistoryRecord | null, 
    amount: string, 
    from: string, 
    to: string, 
    source: 'BCV' | 'Binance'
  ) => {
    logger.info('calculateResult called with:', { bcvRate, binanceRate, amount, from, to, source });
    const numAmount = parseFloat(amount) || 0;
    let result = 0;

    if (source === 'BCV' && bcvRate) {
      if (from === 'USD' && to === 'VES') {
        result = numAmount * bcvRate.usd;
      } else if (from === 'VES' && to === 'USD') {
        result = numAmount / bcvRate.usd;
      } else if (from === 'EUR' && to === 'VES') {
        result = numAmount * bcvRate.eur;
      } else if (from === 'VES' && to === 'EUR') {
        result = numAmount / bcvRate.eur;
      } else if (from === 'USD' && to === 'EUR') {
        result = (numAmount * bcvRate.usd) / bcvRate.eur;
      } else if (from === 'EUR' && to === 'USD') {
        result = (numAmount * bcvRate.eur) / bcvRate.usd;
      } else {
        result = numAmount; // Same currency
      }
    } else if (source === 'Binance' && binanceRate) {
      if (from === 'USD' && to === 'VES') {
        result = numAmount * binanceRate.usd;
      } else if (from === 'VES' && to === 'USD') {
        result = numAmount / binanceRate.usd;
      } else {
        result = numAmount; // Same currency or unsupported conversion
      }
    }

    logger.info(`Setting calculator result: ${result}, type: ${typeof result}`);
    setCalculator(prev => ({ ...prev, result }));
  }, []);

  const handleCalculatorChange = (field: keyof CalculatorState, value: any) => {
    setCalculator(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'amount' || field === 'fromCurrency' || field === 'toCurrency' || field === 'activeSource') {
        const activeRate = updated.activeSource === 'BCV' ? updated.selectedBCVRate : updated.selectedBinanceRate;
        if (activeRate) {
          calculateResult(
            updated.activeSource === 'BCV' ? updated.selectedBCVRate : null,
            updated.activeSource === 'Binance' ? updated.selectedBinanceRate : null,
            updated.amount, 
            updated.fromCurrency, 
            updated.toCurrency,
            updated.activeSource
          );
        }
      }
      return updated;
    });
  };

  const loadHistoricalRates = useCallback(async () => {
    setLoading(true);
    try {
      const [bcvRates, binanceRates] = await Promise.all([
        bcvHistoryService.getHistoricalRates(30),
        binanceHistoryService.getHistoricalRates(30)
      ]);
      
      setBcvHistoricalRates(bcvRates.reverse()); // Más recientes primero
      setBinanceHistoricalRates(binanceRates.reverse()); // Más recientes primero
      
      // Seleccionar la tasa más reciente por defecto para la calculadora
      if (bcvRates.length > 0) {
        setCalculator(prev => {
          const updated = { ...prev, selectedBCVRate: bcvRates[0] };
          calculateResult(bcvRates[0], null, updated.amount, updated.fromCurrency, updated.toCurrency, 'BCV');
          return updated;
        });
      }
      if (binanceRates.length > 0) {
        setCalculator(prev => ({ ...prev, selectedBinanceRate: binanceRates[0] }));
      }
    } catch (error) {
      logger.error('Error loading historical rates:', error);
    } finally {
      setLoading(false);
    }
  }, [calculateResult]);

  useEffect(() => {
    if (isOpen) {
      loadHistoricalRates();
    }
  }, [isOpen, loadHistoricalRates]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    } else if (current < previous) {
      return <TrendingDown className="h-3 w-3 text-red-500" />;
    }
    return <div className="h-3 w-3" />;
  };

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-500';
    if (current < previous) return 'text-red-500';
    return 'text-gray-500';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="bg-card/95 backdrop-blur-xl border border-border/40 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/20">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <History className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Historial de Tasas</h2>
                <p className="text-sm text-muted-foreground">BCV y Binance - Últimos 30 días</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              className="p-2 hover:bg-muted/20 rounded-xl transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border/20">
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-500/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Historial</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'calculator'
                  ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-500/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <Calculator className="h-4 w-4" />
                <span>Calculadora</span>
              </div>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {activeTab === 'history' && (
              <motion.div variants={fadeInUp} initial="hidden" animate="show">
                {/* Selector de Fuente */}
                <div className="flex space-x-1 bg-muted/5 p-1 rounded-xl mb-6">
                  <button
                    onClick={() => setActiveSource('BCV')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeSource === 'BCV'
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    BCV
                  </button>
                  <button
                    onClick={() => setActiveSource('Binance')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeSource === 'Binance'
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Binance
                  </button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                    <span className="ml-2 text-muted-foreground">Cargando historial...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeSource === 'BCV' ? (
                      bcvHistoricalRates.length === 0 ? (
                        <div className="text-center py-12">
                          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No hay datos históricos de BCV disponibles</p>
                        </div>
                      ) : (
                        bcvHistoricalRates.map((rate, index) => {
                          const previousRate = bcvHistoricalRates[index + 1];
                          return (
                            <motion.div
                              key={rate.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="bg-muted/5 rounded-2xl p-4 border border-border/10 hover:bg-muted/10 transition-colors cursor-pointer"
                              onClick={() => {
                                setCalculator(prev => ({ ...prev, selectedBCVRate: rate, activeSource: 'BCV' }));
                                calculateResult(rate, null, calculator.amount, calculator.fromCurrency, calculator.toCurrency, 'BCV');
                                setActiveTab('calculator');
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="text-center">
                                    <p className="text-sm font-medium text-foreground">{formatDate(rate.date)}</p>
                                    <p className="text-xs text-muted-foreground">{formatTime(rate.timestamp)}</p>
                                  </div>
                                  
                                  <div className="flex items-center space-x-6">
                                    <div className="flex items-center space-x-2">
                                      <DollarSign className="h-4 w-4 text-green-500" />
                                      <div>
                                        <p className="text-sm font-medium text-foreground">
                                          {(typeof rate.usd === 'number' ? rate.usd : parseFloat(rate.usd) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                                        </p>
                                        {previousRate && (
                                          <div className="flex items-center space-x-1">
                                            {getTrendIcon(rate.usd, previousRate.usd)}
                                            <span className={`text-xs ${getTrendColor(rate.usd, previousRate.usd)}`}>
                                              {((rate.usd - previousRate.usd) / previousRate.usd * 100).toFixed(2)}%
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                      <Euro className="h-4 w-4 text-blue-500" />
                                      <div>
                                        <p className="text-sm font-medium text-foreground">
                                          {rate.eur.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                                        </p>
                                        {previousRate && (
                                          <div className="flex items-center space-x-1">
                                            {getTrendIcon(rate.eur, previousRate.eur)}
                                            <span className={`text-xs ${getTrendColor(rate.eur, previousRate.eur)}`}>
                                              {((rate.eur - previousRate.eur) / previousRate.eur * 100).toFixed(2)}%
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded-lg">
                                    BCV
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )
                    ) : (
                      binanceHistoricalRates.length === 0 ? (
                        <div className="text-center py-12">
                          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No hay datos históricos de Binance disponibles</p>
                        </div>
                      ) : (
                        binanceHistoricalRates.map((rate, index) => {
                          const previousRate = binanceHistoricalRates[index + 1];
                          return (
                            <motion.div
                              key={rate.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="bg-muted/5 rounded-2xl p-4 border border-border/10 hover:bg-muted/10 transition-colors cursor-pointer"
                              onClick={() => {
                                setCalculator(prev => ({ ...prev, selectedBinanceRate: rate, activeSource: 'Binance' }));
                                calculateResult(null, rate, calculator.amount, calculator.fromCurrency, calculator.toCurrency, 'Binance');
                                setActiveTab('calculator');
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="text-center">
                                    <p className="text-sm font-medium text-foreground">{formatDate(rate.date)}</p>
                                    <p className="text-xs text-muted-foreground">{formatTime(rate.timestamp)}</p>
                                  </div>
                                  
                                  <div className="flex items-center space-x-6">
                                    <div className="flex items-center space-x-2">
                                      <DollarSign className="h-4 w-4 text-yellow-500" />
                                      <div>
                                        <p className="text-sm font-medium text-foreground">
                                          {rate.usd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                                        </p>
                                        {previousRate && (
                                          <div className="flex items-center space-x-1">
                                            {getTrendIcon(rate.usd, previousRate.usd)}
                                            <span className={`text-xs ${getTrendColor(rate.usd, previousRate.usd)}`}>
                                              {((rate.usd - previousRate.usd) / previousRate.usd * 100).toFixed(2)}%
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <span className="text-xs bg-yellow-500/10 text-yellow-600 px-2 py-1 rounded-lg">
                                    Binance
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'calculator' && (
              <motion.div variants={fadeInUp} initial="hidden" animate="show" className="space-y-6">
                {/* Source Selection */}
                <div className="bg-muted/5 rounded-2xl p-4 border border-border/10 mb-4">
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Fuente de Datos</span>
                  </h3>
                  <div className="flex space-x-1 bg-background p-1 rounded-lg">
                    <button
                      onClick={() => handleCalculatorChange('activeSource', 'BCV')}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        calculator.activeSource === 'BCV'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      BCV
                    </button>
                    <button
                      onClick={() => handleCalculatorChange('activeSource', 'Binance')}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        calculator.activeSource === 'Binance'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Binance
                    </button>
                  </div>
                </div>

                {/* Rate Selection */}
                <div className="bg-muted/5 rounded-2xl p-4 border border-border/10">
                  <h3 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Tasa Seleccionada</span>
                  </h3>
                  {calculator.activeSource === 'BCV' && calculator.selectedBCVRate ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="text-sm text-muted-foreground">{formatDate(calculator.selectedBCVRate.date)}</p>
                          <p className="text-xs text-muted-foreground">{formatTime(calculator.selectedBCVRate.timestamp)}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3 text-green-500" />
                            <span className="text-sm font-medium">
                              {calculator.selectedBCVRate.usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Euro className="h-3 w-3 text-blue-500" />
                            <span className="text-sm font-medium">
                              {calculator.selectedBCVRate.eur.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded-lg">
                        BCV
                      </span>
                    </div>
                  ) : calculator.activeSource === 'Binance' && calculator.selectedBinanceRate ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="text-sm text-muted-foreground">{formatDate(calculator.selectedBinanceRate.date)}</p>
                          <p className="text-xs text-muted-foreground">{formatTime(calculator.selectedBinanceRate.timestamp)}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3 text-yellow-500" />
                            <span className="text-sm font-medium">
                              {calculator.selectedBinanceRate.usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs bg-yellow-500/10 text-yellow-600 px-2 py-1 rounded-lg">
                        Binance
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Selecciona una fecha del historial</p>
                  )}
                </div>

                {/* Calculator */}
                <div className="bg-muted/5 rounded-2xl p-6 border border-border/10">
                  <h3 className="text-lg font-medium text-foreground mb-4 flex items-center space-x-2">
                    <Calculator className="h-5 w-5" />
                    <span>Calculadora de Conversión</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    {/* Amount Input */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Cantidad</label>
                      <input
                        type="number"
                        value={calculator.amount}
                        onChange={(e) => handleCalculatorChange('amount', e.target.value)}
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                        placeholder="Ingresa la cantidad"
                      />
                    </div>
                    
                    {/* From Currency */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">De</label>
                      <select
                        value={calculator.fromCurrency}
                        onChange={(e) => handleCalculatorChange('fromCurrency', e.target.value)}
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      >
                        <option value="USD">USD (Dólar)</option>
                        <option value="EUR">EUR (Euro)</option>
                        <option value="VES">VES (Bolívar)</option>
                      </select>
                    </div>
                    
                    {/* To Currency */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">A</label>
                      <select
                        value={calculator.toCurrency}
                        onChange={(e) => handleCalculatorChange('toCurrency', e.target.value)}
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-foreground"
                      >
                        <option value="VES">VES (Bolívar)</option>
                        <option value="USD">USD (Dólar)</option>
                        {calculator.activeSource === 'BCV' && <option value="EUR">EUR (Euro)</option>}
                      </select>
                    </div>
                  </div>
                  
                  {/* Swap Button */}
                  <div className="flex justify-center my-4">
                    <button
                      onClick={() => {
                        const newFrom = calculator.toCurrency;
                        const newTo = calculator.fromCurrency;
                        handleCalculatorChange('fromCurrency', newFrom);
                        handleCalculatorChange('toCurrency', newTo);
                      }}
                      className="p-2 hover:bg-muted/20 rounded-xl transition-colors"
                    >
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  
                  {/* Result */}
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Resultado</p>
                      <p className="text-2xl font-bold text-blue-500">
                        {calculator.result.toLocaleString('es-VE', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })} {calculator.toCurrency}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
