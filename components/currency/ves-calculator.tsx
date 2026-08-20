'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator,
  ArrowUpDown,
  Clock,
  DollarSign,
  Euro,
} from 'lucide-react';
import type { BCVHistoryRecord } from '@/lib/services/bcv-history-service';
import type { BinanceHistoryRecord } from '@/lib/services/binance-history-service';

export type VesCalculatorCurrency = 'VES' | 'USD' | 'EUR' | 'BUSD';
export type VesCalculatorSource = 'BCV' | 'Binance';

export interface VesCalculatorProps {
  bcvRates?: BCVHistoryRecord[];
  binanceRates?: BinanceHistoryRecord[];
  selectedBCVRate: BCVHistoryRecord | null;
  selectedBinanceRate: BinanceHistoryRecord | null;
  activeSource: VesCalculatorSource;
  onSourceChange?: (source: VesCalculatorSource) => void;
  onSelectBCVRate?: (rate: BCVHistoryRecord) => void;
  onSelectBinanceRate?: (rate: BinanceHistoryRecord) => void;
}

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

export function VesCalculator({
  bcvRates = [],
  binanceRates = [],
  selectedBCVRate,
  selectedBinanceRate,
  activeSource,
  onSourceChange,
  onSelectBCVRate,
  onSelectBinanceRate,
}: VesCalculatorProps) {
  const [amount, setAmount] = useState('1');
  const [fromCurrency, setFromCurrency] = useState<VesCalculatorCurrency>('USD');
  const [toCurrency, setToCurrency] = useState<VesCalculatorCurrency>('VES');
  const [result, setResult] = useState(0);

  const calculateResult = useCallback(
    (
      bcvRate: BCVHistoryRecord | null,
      binanceRate: BinanceHistoryRecord | null,
      amountStr: string,
      from: string,
      to: string,
      source: VesCalculatorSource
    ) => {
      const sanitized = amountStr.replace(',', '.');
      const numAmount = parseFloat(sanitized) || 0;
      let calc = 0;

      if (source === 'BCV' && bcvRate) {
        if (from === 'USD' && to === 'VES') {
          calc = numAmount * bcvRate.usd;
        } else if (from === 'VES' && to === 'USD') {
          calc = numAmount / bcvRate.usd;
        } else if (from === 'EUR' && to === 'VES') {
          calc = numAmount * bcvRate.eur;
        } else if (from === 'VES' && to === 'EUR') {
          calc = numAmount / bcvRate.eur;
        } else if (from === 'USD' && to === 'EUR') {
          calc = (numAmount * bcvRate.usd) / bcvRate.eur;
        } else if (from === 'EUR' && to === 'USD') {
          calc = (numAmount * bcvRate.eur) / bcvRate.usd;
        } else {
          calc = numAmount;
        }
      } else if (source === 'Binance' && binanceRate) {
        if ((from === 'USD' || from === 'BUSD') && to === 'VES') {
          calc = numAmount * binanceRate.usd;
        } else if (from === 'VES' && (to === 'USD' || to === 'BUSD')) {
          calc = numAmount / binanceRate.usd;
        } else {
          calc = numAmount;
        }
      }

      setResult(calc);
    },
    []
  );

  // Recalculate whenever dependencies change
  useEffect(() => {
    const activeRate =
      activeSource === 'BCV' ? selectedBCVRate : selectedBinanceRate;
    if (activeRate) {
      calculateResult(
        activeSource === 'BCV' ? selectedBCVRate : null,
        activeSource === 'Binance' ? selectedBinanceRate : null,
        amount,
        fromCurrency,
        toCurrency,
        activeSource
      );
    } else {
      setResult(0);
    }
  }, [
    amount,
    fromCurrency,
    toCurrency,
    activeSource,
    selectedBCVRate,
    selectedBinanceRate,
    calculateResult,
  ]);

  const handleAmountChange = (value: string) => {
    // Preserve trailing zero: type="text" inputMode="decimal"
    let sanitized = value.replace(/[^0-9.,]/g, '');
    // Normalize commas to dots and keep only first separator
    const dotNormalized = sanitized.replace(/,/g, '.');
    const parts = dotNormalized.split('.');
    let normalized = dotNormalized;
    if (parts.length > 2) {
      normalized = parts[0] + '.' + parts.slice(1).join('');
    }
    // Allow empty to clear
    if (value === '') {
      normalized = '';
    }
    setAmount(normalized);
  };

  const handleSwap = () => {
    const newFrom = toCurrency;
    const newTo = fromCurrency;
    setFromCurrency(newFrom);
    setToCurrency(newTo);
  };

  const handleSourceChange = (source: VesCalculatorSource) => {
    onSourceChange?.(source);
    // result will recalc via effect
  };

  const selectedRate = activeSource === 'BCV' ? selectedBCVRate : selectedBinanceRate;

  const recentRates = activeSource === 'BCV' ? bcvRates.slice(0, 5) : binanceRates.slice(0, 5);

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="show" className="space-y-6">
      {/* Source Selection */}
      <div className="rounded-2xl border border-border/10 bg-muted/5 p-4">
        <h3 className="mb-3 flex items-center space-x-2 text-sm font-medium text-foreground">
          <Clock className="h-4 w-4" />
          <span>Fuente de Datos</span>
        </h3>
        <div className="flex space-x-1 rounded-lg bg-background p-1">
          <button
            type="button"
            onClick={() => handleSourceChange('BCV')}
            aria-pressed={activeSource === 'BCV'}
            aria-label="Usar tasa BCV"
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeSource === 'BCV'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            BCV
          </button>
          <button
            type="button"
            onClick={() => handleSourceChange('Binance')}
            aria-pressed={activeSource === 'Binance'}
            aria-label="Usar tasa Binance"
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeSource === 'Binance'
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
        {activeSource === 'BCV' && selectedBCVRate ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-sm text-muted-foreground">{formatDate(selectedBCVRate.date)}</p>
                <p className="text-xs text-muted-foreground">{formatTime(selectedBCVRate.timestamp)}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-3 w-3 text-green-500" />
                  <span className="text-sm font-medium">
                    {selectedBCVRate.usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Euro className="h-3 w-3 text-blue-500" />
                  <span className="text-sm font-medium">
                    {selectedBCVRate.eur.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                  </span>
                </div>
              </div>
            </div>
            <span className="rounded-lg bg-blue-500/10 px-2 py-1 text-xs text-blue-500">BCV</span>
          </div>
        ) : activeSource === 'Binance' && selectedBinanceRate ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-sm text-muted-foreground">{formatDate(selectedBinanceRate.date)}</p>
                <p className="text-xs text-muted-foreground">{formatTime(selectedBinanceRate.timestamp)}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-3 w-3 text-yellow-500" />
                  <span className="text-sm font-medium">
                    {selectedBinanceRate.usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                  </span>
                </div>
              </div>
            </div>
            <span className="rounded-lg bg-yellow-500/10 px-2 py-1 text-xs text-yellow-600">Binance</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Selecciona una fecha del historial</p>
        )}
      </div>

      {/* Calculator */}
      <div className="rounded-2xl border border-border/10 bg-muted/5 p-6">
        <h3 className="mb-4 flex items-center space-x-2 text-lg font-medium text-foreground">
          <Calculator className="h-5 w-5" />
          <span>Calculadora de Conversión</span>
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
          {/* Amount Input - preserves trailing zero via type="text" */}
          <div>
            <label htmlFor="calculator-amount" className="mb-2 block text-sm font-medium text-foreground">
              Cantidad
            </label>
            <input
              id="calculator-amount"
              data-testid="calculator-amount-input"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ingresa la cantidad"
              aria-label="Cantidad a convertir"
            />
          </div>

          {/* From Currency */}
          <div>
            <label htmlFor="calculator-from" className="mb-2 block text-sm font-medium text-foreground">
              De
            </label>
            <select
              id="calculator-from"
              data-testid="from-currency"
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value as VesCalculatorCurrency)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Moneda origen"
            >
              <option value="USD">USD (Dólar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="BUSD">BUSD (Binance USD)</option>
              <option value="VES">VES (Bolívar)</option>
            </select>
          </div>

          {/* To Currency */}
          <div>
            <label htmlFor="calculator-to" className="mb-2 block text-sm font-medium text-foreground">
              A
            </label>
            <select
              id="calculator-to"
              data-testid="to-currency"
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value as VesCalculatorCurrency)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Moneda destino"
            >
              <option value="VES">VES (Bolívar)</option>
              <option value="USD">USD (Dólar)</option>
              <option value="BUSD">BUSD (Binance USD)</option>
              {activeSource === 'BCV' && <option value="EUR">EUR (Euro)</option>}
            </select>
          </div>
        </div>

        {/* Swap Button */}
        <div className="my-4 flex justify-center">
          <button
            type="button"
            data-testid="swap-button"
            aria-label="Intercambiar monedas"
            onClick={handleSwap}
            className="rounded-xl p-2 transition-colors hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Result */}
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="text-center">
            <p className="mb-1 text-sm text-muted-foreground">Resultado</p>
            <p
              data-testid="calculator-result"
              aria-live="polite"
              className="text-2xl font-bold text-blue-500"
            >
              {result.toLocaleString('es-VE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              {toCurrency}
            </p>
          </div>
        </div>
      </div>

      {/* Recent rates quick picker */}
      {recentRates.length > 0 && (onSelectBCVRate || onSelectBinanceRate) && (
        <div className="rounded-2xl border border-border/10 bg-muted/5 p-4">
          <h4 className="mb-3 text-sm font-medium text-foreground">Tasas recientes</h4>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {activeSource === 'BCV'
              ? (bcvRates.slice(0, 5) as BCVHistoryRecord[]).map((rate) => (
                  <button
                    key={rate.id ?? rate.date}
                    type="button"
                    onClick={() => onSelectBCVRate?.(rate)}
                    aria-label={`Seleccionar tasa BCV ${rate.date}`}
                    className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                      selectedBCVRate?.date === rate.date
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                        : 'border-border/20 bg-background hover:bg-muted/20'
                    }`}
                  >
                    <span className="block font-medium">{formatDate(rate.date)}</span>
                    <span className="block text-muted-foreground">{rate.usd.toFixed(2)} Bs</span>
                  </button>
                ))
              : (binanceRates.slice(0, 5) as BinanceHistoryRecord[]).map((rate) => (
                  <button
                    key={rate.id ?? rate.date}
                    type="button"
                    onClick={() => onSelectBinanceRate?.(rate)}
                    aria-label={`Seleccionar tasa Binance ${rate.date}`}
                    className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                      selectedBinanceRate?.date === rate.date
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                        : 'border-border/20 bg-background hover:bg-muted/20'
                    }`}
                  >
                    <span className="block font-medium">{formatDate(rate.date)}</span>
                    <span className="block text-muted-foreground">{rate.usd.toFixed(2)} Bs</span>
                  </button>
                ))}
          </div>
        </div>
      )}

      {!selectedRate && (
        <p className="text-center text-xs text-muted-foreground">
          Selecciona una tasa del historial para habilitar la conversión
        </p>
      )}
    </motion.div>
  );
}

export default VesCalculator;
