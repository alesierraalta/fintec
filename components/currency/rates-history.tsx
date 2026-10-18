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
  BarChart3,
} from 'lucide-react';
import {
  bcvHistoryService,
  BCVHistoryRecord,
} from '@/lib/services/bcv-history-service';
import {
  binanceHistoryService,
  BinanceHistoryRecord,
} from '@/lib/services/binance-history-service';
import { currencyService } from '@/lib/services/currency-service';
import { Button } from '@/components/ui';
import { logger } from '@/lib/utils/logger';

interface RatesHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CalculatorState {
  amount: string;
  fromCurrency: 'VES' | 'USD' | 'EUR' | 'BUSD';
  toCurrency: 'VES' | 'USD' | 'EUR' | 'BUSD';
  selectedBCVRate: BCVHistoryRecord | null;
  selectedBinanceRate: BinanceHistoryRecord | null;
  result: number;
  activeSource: 'BCV' | 'Binance';
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export function RatesHistory({ isOpen, onClose }: RatesHistoryProps) {
  const [bcvHistoricalRates, setBcvHistoricalRates] = useState<
    BCVHistoryRecord[]
  >([]);
  const [binanceHistoricalRates, setBinanceHistoricalRates] = useState<
    BinanceHistoryRecord[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'calculator'>(
    'history'
  );
  const [activeSource, setActiveSource] = useState<'BCV' | 'Binance'>('BCV');
  const [calculator, setCalculator] = useState<CalculatorState>({
    amount: '1',
    fromCurrency: 'USD',
    toCurrency: 'VES',
    selectedBCVRate: null,
    selectedBinanceRate: null,
    result: 0,
    activeSource: 'BCV',
  });

  const calculateResult = useCallback(
    (
      bcvRate: BCVHistoryRecord | null,
      binanceRate: BinanceHistoryRecord | null,
      amount: string,
      from: string,
      to: string,
      source: 'BCV' | 'Binance'
    ) => {
      logger.info('calculateResult called with:', {
        bcvRate,
        binanceRate,
        amount,
        from,
        to,
        source,
      });
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
        if ((from === 'USD' || from === 'BUSD') && to === 'VES') {
          result = numAmount * binanceRate.usd;
        } else if (from === 'VES' && (to === 'USD' || to === 'BUSD')) {
          result = numAmount / binanceRate.usd;
        } else {
          result = numAmount; // Same currency or unsupported conversion
        }
      }

      logger.info(
        `Setting calculator result: ${result}, type: ${typeof result}`
      );
      setCalculator((prev) => ({ ...prev, result }));
    },
    []
  );

  const handleCalculatorChange = (field: keyof CalculatorState, value: any) => {
    setCalculator((prev) => {
      const updated = { ...prev, [field]: value };
      if (
        field === 'amount' ||
        field === 'fromCurrency' ||
        field === 'toCurrency' ||
        field === 'activeSource'
      ) {
        const activeRate =
          updated.activeSource === 'BCV'
            ? updated.selectedBCVRate
            : updated.selectedBinanceRate;
        if (activeRate) {
          calculateResult(
            updated.activeSource === 'BCV' ? updated.selectedBCVRate : null,
            updated.activeSource === 'Binance'
              ? updated.selectedBinanceRate
              : null,
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
        binanceHistoryService.getHistoricalRates(30),
      ]);

      setBcvHistoricalRates(bcvRates.reverse()); // Más recientes primero
      setBinanceHistoricalRates(binanceRates.reverse()); // Más recientes primero

      // Seleccionar la tasa más reciente por defecto para la calculadora
      if (bcvRates.length > 0) {
        setCalculator((prev) => {
          const updated = { ...prev, selectedBCVRate: bcvRates[0] };
          calculateResult(
            bcvRates[0],
            null,
            updated.amount,
            updated.fromCurrency,
            updated.toCurrency,
            'BCV'
          );
          return updated;
        });
      }
      if (binanceRates.length > 0) {
        setCalculator((prev) => ({
          ...prev,
          selectedBinanceRate: binanceRates[0],
        }));
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
      year: 'numeric',
    });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit',
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="max-h-[90dvh] w-full max-w-4xl overflow-hidden rounded-3xl border border-border/40 bg-card/95 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/20 p-6">
            <div className="flex items-center space-x-3">
              <div className="rounded-xl bg-blue-500/10 p-2">
                <History className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Historial de Tasas
                </h2>
                <p className="text-sm text-muted-foreground">
                  BCV y Binance - Últimos 30 días
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              className="rounded-xl p-2 transition-colors hover:bg-muted/20"
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
                  ? 'border-b-2 border-blue-500 bg-blue-500/5 text-blue-500'
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
                  ? 'border-b-2 border-blue-500 bg-blue-500/5 text-blue-500'
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
          <div className="max-h-[60dvh] overflow-y-auto p-6">
            {activeTab === 'history' && (
              <motion.div variants={fadeInUp} initial="hidden" animate="show">
                {/* Selector de Fuente */}
                <div className="mb-6 flex space-x-1 rounded-xl bg-muted/5 p-1">
                  <button
                    onClick={() => setActiveSource('BCV')}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      activeSource === 'BCV'
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    BCV
                  </button>
                  <button
                    onClick={() => setActiveSource('Binance')}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
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
                    <span className="ml-2 text-muted-foreground">
                      Cargando historial...
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeSource === 'BCV' ? (
                      bcvHistoricalRates.length === 0 ? (
                        <div className="py-12 text-center">
                          <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            No hay datos históricos de BCV disponibles
                          </p>
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
                              className="cursor-pointer rounded-2xl border border-border/10 bg-muted/5 p-4 transition-colors hover:bg-muted/10"
                              onClick={() => {
                                setCalculator((prev) => ({
                                  ...prev,
                                  selectedBCVRate: rate,
                                  activeSource: 'BCV',
                                }));
                                calculateResult(
                                  rate,
                                  null,
                                  calculator.amount,
                                  calculator.fromCurrency,
                                  calculator.toCurrency,
                                  'BCV'
                                );
                                setActiveTab('calculator');
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className="text-center">
                                    <p className="text-sm font-medium text-foreground">
                                      {formatDate(rate.date)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatTime(rate.timestamp)}
                                    </p>
                                  </div>

                                  <div className="flex items-center space-x-6">
                                    <div className="flex items-center space-x-2">
                                      <DollarSign className="h-4 w-4 text-green-500" />
                                      <div>
                                        <p className="text-sm font-medium text-foreground">
                                          {(typeof rate.usd === 'number'
                                            ? rate.usd
                                            : parseFloat(rate.usd) || 0
                                          ).toLocaleString('es-VE', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}{' '}
                                          Bs
                                        </p>
                                        {previousRate && (
                                          <div className="flex items-center space-x-1">
                                            {getTrendIcon(
                                              rate.usd,
                                              previousRate.usd
                                            )}
                                            <span
                                              className={`text-xs ${getTrendColor(rate.usd, previousRate.usd)}`}
                                            >
                                              {(
                                                ((rate.usd - previousRate.usd) /
                                                  previousRate.usd) *
                                                100
                                              ).toFixed(2)}
                                              %
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                      <Euro className="h-4 w-4 text-blue-500" />
                                      <div>
                                        <p className="text-sm font-medium text-foreground">
                                          {rate.eur.toLocaleString('es-VE', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}{' '}
                                          Bs
                                        </p>
                                        {previousRate && (
                                          <div className="flex items-center space-x-1">
                                            {getTrendIcon(
                                              rate.eur,
                                              previousRate.eur
                                            )}
                                            <span
                                              className={`text-xs ${getTrendColor(rate.eur, previousRate.eur)}`}
                                            >
                                              {(
                                                ((rate.eur - previousRate.eur) /
                                                  previousRate.eur) *
                                                100
                                              ).toFixed(2)}
                                              %
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="rounded-lg bg-blue-500/10 px-2 py-1 text-xs text-blue-500">
                                    BCV
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )
                    ) : binanceHistoricalRates.length === 0 ? (
                      <div className="py-12 text-center">
                        <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No hay datos históricos de Binance disponibles
                        </p>
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
                            className="cursor-pointer rounded-2xl border border-border/10 bg-muted/5 p-4 transition-colors hover:bg-muted/10"
                            onClick={() => {
                              setCalculator((prev) => ({
                                ...prev,
                                selectedBinanceRate: rate,
                                activeSource: 'Binance',
                              }));
                              calculateResult(
                                null,
                                rate,
                                calculator.amount,
                                calculator.fromCurrency,
                                calculator.toCurrency,
                                'Binance'
                              );
                              setActiveTab('calculator');
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="text-center">
                                  <p className="text-sm font-medium text-foreground">
                                    {formatDate(rate.date)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatTime(rate.timestamp)}
                                  </p>
                                </div>

                                <div className="flex items-center space-x-6">
                                  <div className="flex items-center space-x-2">
                                    <DollarSign className="h-4 w-4 text-yellow-500" />
                                    <div>
                                      <p className="text-sm font-medium text-foreground">
                                        {rate.usd.toLocaleString('es-VE', {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}{' '}
                                        Bs
                                      </p>
                                      {previousRate && (
                                        <div className="flex items-center space-x-1">
                                          {getTrendIcon(
                                            rate.usd,
                                            previousRate.usd
                                          )}
                                          <span
                                            className={`text-xs ${getTrendColor(rate.usd, previousRate.usd)}`}
                                          >
                                            {(
                                              ((rate.usd - previousRate.usd) /
                                                previousRate.usd) *
                                              100
                                            ).toFixed(2)}
                                            %
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="rounded-lg bg-yellow-500/10 px-2 py-1 text-xs text-yellow-600">
                                  Binance
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'calculator' && (
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="show"
                className="space-y-6"
              >
                {/* Source Selection */}
                <div className="mb-4 rounded-2xl border border-border/10 bg-muted/5 p-4">
                  <h3 className="mb-3 flex items-center space-x-2 text-sm font-medium text-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Fuente de Datos</span>
                  </h3>
                  <div className="flex space-x-1 rounded-lg bg-background p-1">
                    <button
                      onClick={() =>
                        handleCalculatorChange('activeSource', 'BCV')
                      }
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        calculator.activeSource === 'BCV'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      BCV
                    </button>
                    <button
                      onClick={() =>
                        handleCalculatorChange('activeSource', 'Binance')
                      }
                      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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
                <div className="rounded-2xl border border-border/10 bg-muted/5 p-4">
                  <h3 className="mb-3 flex items-center space-x-2 text-sm font-medium text-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Tasa Seleccionada</span>
                  </h3>
                  {calculator.activeSource === 'BCV' &&
                  calculator.selectedBCVRate ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(calculator.selectedBCVRate.date)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(calculator.selectedBCVRate.timestamp)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3 text-green-500" />
                            <span className="text-sm font-medium">
                              {calculator.selectedBCVRate.usd.toLocaleString(
                                'es-VE',
                                { minimumFractionDigits: 2 }
                              )}{' '}
                              Bs
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Euro className="h-3 w-3 text-blue-500" />
                            <span className="text-sm font-medium">
                              {calculator.selectedBCVRate.eur.toLocaleString(
                                'es-VE',
                                { minimumFractionDigits: 2 }
                              )}{' '}
                              Bs
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="rounded-lg bg-blue-500/10 px-2 py-1 text-xs text-blue-500">
                        BCV
                      </span>
                    </div>
                  ) : calculator.activeSource === 'Binance' &&
                    calculator.selectedBinanceRate ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(calculator.selectedBinanceRate.date)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(
                              calculator.selectedBinanceRate.timestamp
                            )}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3 text-yellow-500" />
                            <span className="text-sm font-medium">
                              {calculator.selectedBinanceRate.usd.toLocaleString(
                                'es-VE',
                                { minimumFractionDigits: 2 }
                              )}{' '}
                              Bs
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="rounded-lg bg-yellow-500/10 px-2 py-1 text-xs text-yellow-600">
                        Binance
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Selecciona una fecha del historial
                    </p>
                  )}
                </div>

                {/* Calculator */}
                <div className="rounded-2xl border border-border/10 bg-muted/5 p-6">
                  <h3 className="mb-4 flex items-center space-x-2 text-lg font-medium text-foreground">
                    <Calculator className="h-5 w-5" />
                    <span>Calculadora de Conversión</span>
                  </h3>

                  <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
                    {/* Amount Input */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        value={calculator.amount}
                        onChange={(e) =>
                          handleCalculatorChange('amount', e.target.value)
                        }
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ingresa la cantidad"
                      />
                    </div>

                    {/* From Currency */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        De
                      </label>
                      <select
                        value={calculator.fromCurrency}
                        onChange={(e) =>
                          handleCalculatorChange('fromCurrency', e.target.value)
                        }
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="USD">USD (Dólar)</option>
                        <option value="EUR">EUR (Euro)</option>
                        <option value="BUSD">BUSD (Binance USD)</option>
                        <option value="VES">VES (Bolívar)</option>
                      </select>
                    </div>

                    {/* To Currency */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        A
                      </label>
                      <select
                        value={calculator.toCurrency}
                        onChange={(e) =>
                          handleCalculatorChange('toCurrency', e.target.value)
                        }
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="VES">VES (Bolívar)</option>
                        <option value="USD">USD (Dólar)</option>
                        <option value="BUSD">BUSD (Binance USD)</option>
                        {calculator.activeSource === 'BCV' && (
                          <option value="EUR">EUR (Euro)</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Swap Button */}
                  <div className="my-4 flex justify-center">
                    <button
                      onClick={() => {
                        const newFrom = calculator.toCurrency;
                        const newTo = calculator.fromCurrency;
                        handleCalculatorChange('fromCurrency', newFrom);
                        handleCalculatorChange('toCurrency', newTo);
                      }}
                      className="rounded-xl p-2 transition-colors hover:bg-muted/20"
                    >
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Result */}
                  <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
                    <div className="text-center">
                      <p className="mb-1 text-sm text-muted-foreground">
                        Resultado
                      </p>
                      <p className="text-2xl font-bold text-blue-500">
                        {calculator.result.toLocaleString('es-VE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        {calculator.toCurrency}
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
