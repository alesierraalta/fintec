'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  RefreshCw, 
  DollarSign, 
  Calculator,
  Zap,
  Building2,
  Edit3,
  Check,
  AlertCircle,
  Clock,
  ArrowRightLeft
} from 'lucide-react';
import { currencyService } from '@/lib/services/currency-service';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import { useBCVRates } from '@/hooks/use-bcv-rates';

interface RateSelectorProps {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  onRateSelected: (rate: number, source: string) => void;
  onManualRate: (rate: number) => void;
}

interface RateOption {
  id: string;
  name: string;
  rate: number;
  source: string;
  icon: React.ReactNode;
  description: string;
  lastUpdated?: string;
  isLive?: boolean;
}

export function RateSelector({ fromCurrency, toCurrency, amount, onRateSelected, onManualRate }: RateSelectorProps) {
  const [selectedRate, setSelectedRate] = useState<string>('');
  const [manualRate, setManualRate] = useState<number>(0);
  const [showManualInput, setShowManualInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  const { rates: binanceRates, loading: binanceLoading, refetch: refetchBinance } = useBinanceRates();
  const bcvRates = useBCVRates();

  const [rateOptions, setRateOptions] = useState<RateOption[]>([]);

  // Calculate available rate options based on currencies
  useEffect(() => {
    const options: RateOption[] = [];

    // Only show rate options if currencies are different
    if (fromCurrency !== toCurrency) {
      // Binance P2P rates (USD/VES)
      if ((fromCurrency === 'USD' && toCurrency === 'VES') || (fromCurrency === 'VES' && toCurrency === 'USD')) {
        if (binanceRates) {
          const rate = fromCurrency === 'USD' ? binanceRates.sell_rate.avg : 1 / binanceRates.buy_rate.avg;
          options.push({
            id: 'binance-sell',
            name: 'Binance P2P (Venta)',
            rate: rate,
            source: 'Binance P2P',
            icon: <Zap className="h-5 w-5 text-orange-500" />,
            description: `Venta USD en Binance P2P: Bs. ${binanceRates.sell_rate.avg.toFixed(2)}`,
            lastUpdated: binanceRates.lastUpdated,
            isLive: true
          });
          
          const buyRate = fromCurrency === 'USD' ? binanceRates.buy_rate.avg : 1 / binanceRates.sell_rate.avg;
          options.push({
            id: 'binance-buy',
            name: 'Binance P2P (Compra)',
            rate: buyRate,
            source: 'Binance P2P',
            icon: <Zap className="h-5 w-5 text-green-500" />,
            description: `Compra USD en Binance P2P: Bs. ${binanceRates.buy_rate.avg.toFixed(2)}`,
            lastUpdated: binanceRates.lastUpdated,
            isLive: true
          });
        }
      }

      // BCV rates - Show all available rates when transferring to/from VES
      if (toCurrency === 'VES' || fromCurrency === 'VES') {
        if (bcvRates) {
          // Show USD rate when VES is involved
          if ((fromCurrency === 'USD' && toCurrency === 'VES') || (fromCurrency === 'VES' && toCurrency === 'USD')) {
            const rate = fromCurrency === 'USD' ? bcvRates.usd : 1 / bcvRates.usd;
            options.push({
              id: 'bcv-usd',
              name: 'BCV Oficial (USD)',
              rate: rate,
              source: 'BCV',
              icon: <Building2 className="h-5 w-5 text-blue-500" />,
              description: `Tasa oficial BCV USD: Bs. ${bcvRates.usd.toFixed(2)}`,
              isLive: false
            });
          }
          
          // Show EUR rate when VES is involved
          if ((fromCurrency === 'EUR' && toCurrency === 'VES') || (fromCurrency === 'VES' && toCurrency === 'EUR')) {
            const rate = fromCurrency === 'EUR' ? bcvRates.eur : 1 / bcvRates.eur;
            options.push({
              id: 'bcv-eur',
              name: 'BCV Oficial (EUR)',
              rate: rate,
              source: 'BCV',
              icon: <Building2 className="h-5 w-5 text-blue-500" />,
              description: `Tasa oficial BCV EUR: Bs. ${bcvRates.eur.toFixed(2)}`,
              isLive: false
            });
          }
          
          // Show EUR rate as reference when transferring USD to VES (so user can see EUR rate too)
          if (fromCurrency === 'USD' && toCurrency === 'VES') {
            const eurRate = bcvRates.eur;
            options.push({
              id: 'bcv-eur-ref',
              name: 'BCV Oficial (EUR) - Referencia',
              rate: eurRate,
              source: 'BCV',
              icon: <Building2 className="h-5 w-5 text-blue-500" />,
              description: `Tasa oficial BCV EUR: Bs. ${bcvRates.eur.toFixed(2)}`,
              isLive: false
            });
          }
          
          // Show USD rate as reference when transferring EUR to VES (so user can see USD rate too)
          if (fromCurrency === 'EUR' && toCurrency === 'VES') {
            const usdRate = bcvRates.usd;
            options.push({
              id: 'bcv-usd-ref',
              name: 'BCV Oficial (USD) - Referencia',
              rate: usdRate,
              source: 'BCV',
              icon: <Building2 className="h-5 w-5 text-blue-500" />,
              description: `Tasa oficial BCV USD: Bs. ${bcvRates.usd.toFixed(2)}`,
              isLive: false
            });
          }
        }
      }

      // Manual rate option
      options.push({
        id: 'manual',
        name: 'Tasa Manual',
        rate: 0,
        source: 'Manual',
        icon: <Edit3 className="h-5 w-5 text-purple-500" />,
        description: 'Ingresa tu propia tasa de cambio',
        isLive: false
      });
    }

    setRateOptions(options);
  }, [fromCurrency, toCurrency, binanceRates, bcvRates]);

  const handleRateSelect = (optionId: string) => {
    setSelectedRate(optionId);
    setError('');
    
    if (optionId === 'manual') {
      setShowManualInput(true);
    } else {
      setShowManualInput(false);
      const option = rateOptions.find(opt => opt.id === optionId);
      if (option) {
        onRateSelected(option.rate, option.source);
      }
    }
  };

  const handleManualRateSubmit = () => {
    if (manualRate <= 0) {
      setError('La tasa debe ser mayor a 0');
      return;
    }
    
    onManualRate(manualRate);
    setError('');
  };

  const calculateConvertedAmount = (rate: number) => {
    if (fromCurrency === toCurrency) return amount;
    return amount * rate;
  };

  const formatCurrency = (value: number, currency: string) => {
    if (currency === 'VES') {
      return `Bs. ${value.toFixed(2)}`;
    } else if (currency === 'USD') {
      return `$${value.toFixed(2)}`;
    } else if (currency === 'EUR') {
      return `€${value.toFixed(2)}`;
    }
    return `${value.toFixed(2)} ${currency}`;
  };

  // Don't show rate selector if currencies are the same
  if (fromCurrency === toCurrency) {
    return null;
  }

  return (
    <motion.div 
      className="bg-white dark:bg-neutral-800 rounded-3xl p-6 border border-neutral-200 dark:border-neutral-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Tasa de Cambio
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Selecciona la tasa para convertir {fromCurrency} a {toCurrency}
          </p>
        </div>
      </div>

      {/* Rate Options */}
      <div className="space-y-3 mb-6">
        {rateOptions.map((option) => (
          <motion.button
            key={option.id}
            onClick={() => handleRateSelect(option.id)}
            className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
              selectedRate === option.id
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg shadow-primary-500/20'
                : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {option.icon}
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {option.name}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {option.description}
                  </p>
                  {option.lastUpdated && (
                    <div className="flex items-center space-x-1 mt-1">
                      <Clock className="h-3 w-3 text-neutral-400" />
                      <span className="text-xs text-neutral-400">
                        {new Date(option.lastUpdated).toLocaleString('es-VE')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {option.isLive && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-600 font-medium">LIVE</span>
                  </div>
                )}
                {selectedRate === option.id && (
                  <Check className="h-5 w-5 text-primary-600" />
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Manual Rate Input */}
      {showManualInput && (
        <motion.div 
          className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4 border border-purple-200 dark:border-purple-700 mb-6"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Tasa Manual ({fromCurrency} → {toCurrency})
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-500" />
                <input
                  type="number"
                  value={manualRate || ''}
                  onChange={(e) => setManualRate(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>
            
            {manualRate > 0 && (
              <div className="bg-white dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200 dark:border-neutral-600">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="font-medium">{formatCurrency(amount, fromCurrency)}</span> × {manualRate.toFixed(4)} = 
                  <span className="font-bold text-purple-600 ml-1">
                    {formatCurrency(calculateConvertedAmount(manualRate), toCurrency)}
                  </span>
                </p>
              </div>
            )}

            <button
              onClick={handleManualRateSubmit}
              disabled={manualRate <= 0}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl font-semibold transition-colors"
            >
              Usar Tasa Manual
            </button>
          </div>
        </motion.div>
      )}

      {/* Conversion Preview */}
      {selectedRate && selectedRate !== 'manual' && (
        <motion.div 
          className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-2xl p-4 border border-primary-200 dark:border-primary-700"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
              Conversión con tasa seleccionada:
            </p>
            <div className="flex items-center justify-center space-x-4">
              <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {formatCurrency(amount, fromCurrency)}
              </span>
              <ArrowRightLeft className="h-5 w-5 text-primary-600" />
              <span className="text-lg font-bold text-primary-600">
                {formatCurrency(calculateConvertedAmount(rateOptions.find(opt => opt.id === selectedRate)?.rate || 0), toCurrency)}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div 
          className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        </motion.div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end mt-4">
        <button
          onClick={() => {
            setLoading(true);
            refetchBinance();
            setTimeout(() => setLoading(false), 1000);
          }}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">Actualizar Tasas</span>
        </button>
      </div>
    </motion.div>
  );
}