'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Euro,
  RefreshCw,
  Search,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { VesCalculator } from '@/components/currency/ves-calculator';
import { bcvHistoryService, type BCVHistoryRecord } from '@/lib/services/bcv-history-service';
import { binanceHistoryService, type BinanceHistoryRecord } from '@/lib/services/binance-history-service';
import { formatCaracasDayKey } from '@/lib/utils/date-key';
import { logger } from '@/lib/utils/logger';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTrendIcon(current: number, previous: number) {
  if (current > previous) {
    return <TrendingUp className="h-3 w-3 text-green-500" />;
  } else if (current < previous) {
    return <TrendingDown className="h-3 w-3 text-red-500" />;
  }
  return <div className="h-3 w-3" />;
}

function getTrendColor(current: number, previous: number) {
  if (current > previous) return 'text-green-500';
  if (current < previous) return 'text-red-500';
  return 'text-gray-500';
}

export default function CalculatorClient() {
  const [bcvHistoricalRates, setBcvHistoricalRates] = useState<BCVHistoryRecord[]>([]);
  const [binanceHistoricalRates, setBinanceHistoricalRates] = useState<BinanceHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'calculator'>('calculator');
  const [activeSource, setActiveSource] = useState<'BCV' | 'Binance'>('BCV');
  const [selectedBCVRate, setSelectedBCVRate] = useState<BCVHistoryRecord | null>(null);
  const [selectedBinanceRate, setSelectedBinanceRate] = useState<BinanceHistoryRecord | null>(null);

  const [selectedDate, setSelectedDate] = useState('');
  const [historyMinDate, setHistoryMinDate] = useState('2023-01-01');
  const [historyMaxDate, setHistoryMaxDate] = useState(() => formatCaracasDayKey(new Date()));
  const [dateSearchMessage, setDateSearchMessage] = useState<string | null>(null);
  const [dateSearchError, setDateSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const loadHistoricalRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bcvRates, binanceRates] = await Promise.all([
        bcvHistoryService.getHistoricalRates(30),
        binanceHistoryService.getHistoricalRates(30),
      ]);

      const bcvReversed = [...bcvRates].reverse();
      const binanceReversed = [...binanceRates].reverse();
      setBcvHistoricalRates(bcvReversed);
      setBinanceHistoricalRates(binanceReversed);

      if (bcvReversed.length > 0) {
        setSelectedBCVRate(bcvReversed[0]);
      }
      if (binanceReversed.length > 0) {
        setSelectedBinanceRate(binanceReversed[0]);
      }
    } catch (err) {
      logger.error('Error loading historical rates:', err);
      setError('No se pudieron cargar las tasas históricas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistoricalRates();
  }, [loadHistoricalRates]);

  useEffect(() => {
    const todayStr = formatCaracasDayKey(new Date());
    setHistoryMaxDate(todayStr);
    let cancelled = false;
    const computeRange = async () => {
      try {
        const bcvAll = await (bcvHistoryService.getAllHistoricalRates?.() ?? bcvHistoryService.getHistoricalRates(3650));
        const binanceAll = await ((binanceHistoryService as unknown as { getAllHistoricalRates?: () => Promise<BinanceHistoryRecord[]> }).getAllHistoricalRates?.() ?? binanceHistoryService.getHistoricalRates(3650));
        const allDates = [...bcvAll.map((r) => r.date), ...binanceAll.map((r) => r.date)].filter(Boolean).sort();
        if (!cancelled && allDates.length > 0) {
          setHistoryMinDate(allDates[0]);
        }
      } catch {
        // keep fallback 2023-01-01
      }
    };
    void computeRange();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectBCV = (rate: BCVHistoryRecord) => {
    setSelectedBCVRate(rate);
    setActiveSource('BCV');
    setActiveTab('calculator');
  };

  const handleSelectBinance = (rate: BinanceHistoryRecord) => {
    setSelectedBinanceRate(rate);
    setActiveSource('Binance');
    setActiveTab('calculator');
  };

  const searchByDate = useCallback(
    async (dateStrRaw: string, source: 'BCV' | 'Binance') => {
      const dateStr = dateStrRaw.trim();
      setDateSearchMessage(null);
      setDateSearchError(null);
      if (!dateStr) {
        setDateSearchError('Selecciona una fecha');
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        setDateSearchError('Formato inválido, usa YYYY-MM-DD');
        return;
      }
      if (dateStr < historyMinDate || dateStr > historyMaxDate) {
        setDateSearchError(`Fecha fuera de rango (${historyMinDate} - ${historyMaxDate})`);
        return;
      }
      setIsSearching(true);
      try {
        if (source === 'BCV') {
          const svc: unknown = bcvHistoryService;
          const getter =
            (svc as { getBCVRateOnOrBefore?: (d: string) => Promise<BCVHistoryRecord | null> }).getBCVRateOnOrBefore?.bind(svc as object) ??
            (svc as { getRatesForDate: (d: string) => Promise<BCVHistoryRecord | null> }).getRatesForDate.bind(svc as object);
          const rate = await getter(dateStr);
          if (!rate) {
            setDateSearchError('No hay tasa disponible para esa fecha');
            return;
          }
          if (rate.date !== dateStr) {
            setDateSearchMessage('No hay tasa para ese día, se muestra la más cercana anterior');
          }
          setSelectedBCVRate(rate);
          setBcvHistoricalRates((prev) => {
            if (prev.some((r) => r.date === rate.date)) return prev;
            const next = [...prev, rate].sort((a, b) => b.date.localeCompare(a.date));
            return next;
          });
          setActiveSource('BCV');
        } else {
          const svc: unknown = binanceHistoryService;
          const getter =
            (svc as { getBinanceRateOnOrBefore?: (d: string) => Promise<BinanceHistoryRecord | null> }).getBinanceRateOnOrBefore?.bind(svc as object) ??
            (svc as { getBinanceRateForDate?: (d: string) => Promise<BinanceHistoryRecord | null> }).getBinanceRateForDate?.bind(svc as object) ??
            (svc as { getRatesForDate: (d: string) => Promise<BinanceHistoryRecord | null> }).getRatesForDate.bind(svc as object);
          const rate = await getter(dateStr);
          if (!rate) {
            setDateSearchError('No hay tasa disponible para esa fecha');
            return;
          }
          if (rate.date !== dateStr) {
            setDateSearchMessage('No hay tasa para ese día, se muestra la más cercana anterior');
          }
          setSelectedBinanceRate(rate);
          setBinanceHistoricalRates((prev) => {
            if (prev.some((r) => r.date === rate.date)) return prev;
            const next = [...prev, rate].sort((a, b) => b.date.localeCompare(a.date));
            return next;
          });
          setActiveSource('Binance');
        }
      } catch (err) {
        logger.error('Error buscando tasa por fecha', err);
        setDateSearchError('Error al buscar la tasa');
      } finally {
        setIsSearching(false);
      }
    },
    [historyMinDate, historyMaxDate]
  );

  const handleDateSearch = useCallback(async () => {
    await searchByDate(selectedDate, activeSource);
  }, [searchByDate, selectedDate, activeSource]);

  const handlePickDateFromVes = useCallback(
    async (dateStr: string, source: 'BCV' | 'Binance') => {
      setSelectedDate(dateStr);
      await searchByDate(dateStr, source);
    },
    [searchByDate]
  );

  const HistoryDatePicker = (
    <div className="mb-6 rounded-2xl border border-border/20 bg-card/60 p-4">
      <label
        htmlFor="history-date-picker"
        className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground"
      >
        <Calendar className="h-4 w-4" />
        Elegir día
      </label>
      <div className="flex gap-2">
        <input
          id="history-date-picker"
          data-testid="history-date-picker"
          type="date"
          aria-label="Elegir día del historial completo"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleDateSearch();
            }
          }}
          min={historyMinDate}
          max={historyMaxDate}
          className="flex-1 rounded-xl border border-border/20 bg-card/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          data-testid="history-date-search"
          aria-label="Buscar tasa por fecha"
          onClick={() => void handleDateSearch()}
          disabled={isSearching}
          className="inline-flex items-center gap-1 rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {isSearching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span>Buscar</span>
        </button>
      </div>
      {dateSearchMessage && (
        <p role="status" aria-live="polite" className="mt-2 text-xs text-amber-600">
          {dateSearchMessage}
        </p>
      )}
      {dateSearchError && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {dateSearchError}
        </p>
      )}
    </div>
  );

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-500/10 p-2">
              <Calculator className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Calculadora VES</h1>
              <p className="text-sm text-muted-foreground">Convierte entre VES, USD, EUR y BUSD con tasas BCV y Binance</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex overflow-hidden rounded-2xl border border-border/20 bg-card/50 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setActiveTab('calculator')}
            aria-selected={activeTab === 'calculator'}
            role="tab"
            className={`flex flex-1 items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'calculator'
                ? 'border-b-2 border-blue-500 bg-blue-500/5 text-blue-500'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calculator className="h-4 w-4" />
            <span>Calculadora</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            aria-selected={activeTab === 'history'}
            role="tab"
            className={`flex flex-1 items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'border-b-2 border-blue-500 bg-blue-500/5 text-blue-500'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Historial</span>
          </button>
        </div>

        <div className="rounded-3xl border border-border/40 bg-card/80 p-6 shadow-xl backdrop-blur-xl">
          {activeTab === 'calculator' && (
            <div className="space-y-6">
              {/* Date picker accessible from calculator tab */}
              {HistoryDatePicker}
              <VesCalculator
                bcvRates={bcvHistoricalRates}
                binanceRates={binanceHistoricalRates}
                selectedBCVRate={selectedBCVRate}
                selectedBinanceRate={selectedBinanceRate}
                activeSource={activeSource}
                onSourceChange={setActiveSource}
                onSelectBCVRate={handleSelectBCV}
                onSelectBinanceRate={handleSelectBinance}
                onPickDate={handlePickDateFromVes}
                minDate={historyMinDate}
                maxDate={historyMaxDate}
              />
            </div>
          )}

          {activeTab === 'history' && (
            <motion.div variants={fadeInUp} initial="hidden" animate="show">
              {HistoryDatePicker}
              {/* Selector de Fuente */}
              <div className="mb-6 flex space-x-1 rounded-xl bg-muted/5 p-1">
                <button
                  type="button"
                  onClick={() => setActiveSource('BCV')}
                  aria-pressed={activeSource === 'BCV'}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    activeSource === 'BCV'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  BCV
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSource('Binance')}
                  aria-pressed={activeSource === 'Binance'}
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
                <div className="space-y-3" aria-busy="true" aria-label="Cargando historial">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse rounded-2xl border border-border/10 bg-muted/20 p-4">
                      <div className="flex items-center justify-between">
                        <div className="h-4 w-24 rounded bg-muted/40" />
                        <div className="h-4 w-20 rounded bg-muted/40" />
                      </div>
                      <div className="mt-3 h-3 w-40 rounded bg-muted/30" />
                    </div>
                  ))}
                  <div className="flex items-center justify-center py-4 text-muted-foreground">
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin text-blue-500" />
                    Cargando historial...
                  </div>
                </div>
              ) : error ? (
                <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <button
                    type="button"
                    onClick={() => void loadHistoricalRates()}
                    className="mt-3 rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
                  >
                    Reintentar
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeSource === 'BCV' ? (
                    bcvHistoricalRates.length === 0 ? (
                      <div className="py-12 text-center">
                        <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">No hay datos históricos de BCV disponibles</p>
                      </div>
                    ) : (
                      bcvHistoricalRates.map((rate, index) => {
                        const previousRate = bcvHistoricalRates[index + 1];
                        const isSelected = selectedBCVRate?.date === rate.date;
                        return (
                          <motion.div
                            key={rate.id ?? rate.date}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            role="button"
                            tabIndex={0}
                            aria-pressed={isSelected}
                            aria-label={`Seleccionar tasa BCV ${rate.date}`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleSelectBCV(rate);
                              }
                            }}
                            onClick={() => handleSelectBCV(rate)}
                            className={`cursor-pointer rounded-2xl border p-4 transition-colors hover:bg-muted/10 ${
                              isSelected ? 'border-blue-500/50 bg-blue-500/5' : 'border-border/10 bg-muted/5'
                            }`}
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
                                        {(typeof rate.usd === 'number' ? rate.usd : parseFloat(rate.usd) || 0).toLocaleString('es-VE', {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}{' '}
                                        Bs
                                      </p>
                                      {previousRate && (
                                        <div className="flex items-center space-x-1">
                                          {getTrendIcon(rate.usd, previousRate.usd)}
                                          <span className={`text-xs ${getTrendColor(rate.usd, previousRate.usd)}`}>
                                            {previousRate.usd !== 0
                                              ? ((rate.usd - previousRate.usd) / previousRate.usd * 100).toFixed(2)
                                              : '0.00'}
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
                                        {rate.eur.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                                      </p>
                                      {previousRate && (
                                        <div className="flex items-center space-x-1">
                                          {getTrendIcon(rate.eur, previousRate.eur)}
                                          <span className={`text-xs ${getTrendColor(rate.eur, previousRate.eur)}`}>
                                            {previousRate.eur !== 0
                                              ? ((rate.eur - previousRate.eur) / previousRate.eur * 100).toFixed(2)
                                              : '0.00'}
                                            %
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="rounded-lg bg-blue-500/10 px-2 py-1 text-xs text-blue-500">BCV</span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )
                  ) : binanceHistoricalRates.length === 0 ? (
                    <div className="py-12 text-center">
                      <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No hay datos históricos de Binance disponibles</p>
                    </div>
                  ) : (
                    binanceHistoricalRates.map((rate, index) => {
                      const previousRate = binanceHistoricalRates[index + 1];
                      const isSelected = selectedBinanceRate?.date === rate.date;
                      return (
                        <motion.div
                          key={rate.id ?? rate.date}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          aria-label={`Seleccionar tasa Binance ${rate.date}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectBinance(rate);
                            }
                          }}
                          onClick={() => handleSelectBinance(rate)}
                          className={`cursor-pointer rounded-2xl border p-4 transition-colors hover:bg-muted/10 ${
                            isSelected ? 'border-blue-500/50 bg-blue-500/5' : 'border-border/10 bg-muted/5'
                          }`}
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
                                          {previousRate.usd !== 0
                                            ? ((rate.usd - previousRate.usd) / previousRate.usd * 100).toFixed(2)
                                            : '0.00'}
                                          %
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="rounded-lg bg-yellow-500/10 px-2 py-1 text-xs text-yellow-600">Binance</span>
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
        </div>
      </div>
    </MainLayout>
  );
}
