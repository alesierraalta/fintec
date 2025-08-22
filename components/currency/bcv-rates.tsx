'use client';

import React, { useState, useEffect } from 'react';
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
  Calculator
} from 'lucide-react';
import { currencyService, BCVRates } from '@/lib/services/currency-service';
import { BCVTrend } from '@/lib/services/bcv-history-service';

export function BCVRates() {
  const [rates, setRates] = useState<BCVRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLive, setIsLive] = useState(false);
  const [trends, setTrends] = useState<{ usd: BCVTrend; eur: BCVTrend } | null>(null);
  
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
        console.error('Error fetching trends:', trendError);
      }
    } catch (error) {
      console.error('Error fetching BCV rates:', error);
      setError('Error al obtener tasas del BCV');
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const renderTrendIcon = (trend: BCVTrend) => {
    if (trend.trend === 'up') {
      return (
        <div className="flex items-center space-x-1">
          <TrendingUp className="h-3 w-3 text-green-500" />
          <span className="text-xs text-green-500">+{Math.abs(trend.changePercent).toFixed(2)}%</span>
        </div>
      );
    } else if (trend.trend === 'down') {
      return (
        <div className="flex items-center space-x-1">
          <TrendingDown className="h-3 w-3 text-red-500" />
          <span className="text-xs text-red-500">-{Math.abs(trend.changePercent).toFixed(2)}%</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-1">
          <Minus className="h-3 w-3 text-gray-500" />
          <span className="text-xs text-gray-500">0.00%</span>
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
      <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary animate-pulse">
        <div className="h-4 bg-background-tertiary rounded mb-2"></div>
        <div className="h-8 bg-background-tertiary rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-yellow-500/10 to-red-500/10 rounded-2xl p-4 border border-yellow-500/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <span className="text-sm font-bold text-yellow-500">BCV</span>
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Banco Central de Venezuela</h3>
            <p className="text-xs text-text-muted">Tasas oficiales</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowConverter(!showConverter)}
            className="p-2 rounded-lg bg-background-elevated hover:bg-background-tertiary transition-colors"
            title="Convertidor de Monedas"
          >
            <Calculator className="h-4 w-4 text-text-primary" />
          </button>
          <button
            onClick={fetchRates}
            disabled={loading}
            className="p-2 rounded-lg bg-background-elevated hover:bg-background-tertiary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-text-primary ${loading ? 'animate-spin' : ''}`} />
          </button>
          <a 
            href="https://www.bcv.org.ve" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-background-elevated hover:bg-background-tertiary transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-text-primary" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* USD Rate */}
        <div className="bg-background-elevated/50 rounded-xl p-3 border border-border-primary/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-text-primary">USD/VES</span>
            </div>
            {trends?.usd ? renderTrendIcon(trends.usd) : (
              <div className="flex items-center space-x-1">
                <Minus className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-500">0%</span>
              </div>
            )}
          </div>
          <p className="text-lg font-bold text-text-primary">Bs. {rates.usd.toFixed(2)}</p>
          <p className="text-xs text-text-muted">por 1 USD</p>
        </div>

        {/* EUR Rate */}
        <div className="bg-background-elevated/50 rounded-xl p-3 border border-border-primary/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Euro className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-text-primary">EUR/VES</span>
            </div>
            {trends?.eur ? renderTrendIcon(trends.eur) : (
              <div className="flex items-center space-x-1">
                <Minus className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-500">0%</span>
              </div>
            )}
          </div>
          <p className="text-lg font-bold text-text-primary">Bs. {rates.eur.toFixed(2)}</p>
          <p className="text-xs text-text-muted">por 1 EUR</p>
        </div>
      </div>

      {/* Currency Converter */}
      {showConverter && (
        <div className="bg-background-elevated/50 rounded-xl p-4 border border-border-primary/50 mb-4">
          <div className="flex items-center space-x-2 mb-4">
            <Calculator className="h-4 w-4 text-accent-primary" />
            <h4 className="font-medium text-text-primary">Conversión Rápida</h4>
          </div>
          
          <div className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Cantidad</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ingresa el monto"
                className="w-full px-3 py-2 bg-background-primary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-accent-primary focus:border-transparent"
              />
            </div>
            
            {/* From Currency */}
            <div className="grid grid-cols-5 gap-2 items-center">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-muted mb-2">De</label>
                <select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value as 'VES' | 'USD' | 'EUR')}
                  className="w-full px-3 py-2 bg-background-primary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                >
                  <option value="USD">USD - Dólar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="VES">VES - Bolívar</option>
                </select>
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={swapCurrencies}
                  className="p-2 rounded-lg bg-accent-primary/20 hover:bg-accent-primary/30 transition-colors"
                  title="Intercambiar monedas"
                >
                  <ArrowUpDown className="h-4 w-4 text-accent-primary" />
                </button>
              </div>
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-muted mb-2">A</label>
                <select
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value as 'VES' | 'USD' | 'EUR')}
                  className="w-full px-3 py-2 bg-background-primary border border-border-primary rounded-lg text-text-primary focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                >
                  <option value="USD">USD - Dólar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="VES">VES - Bolívar</option>
                </select>
              </div>
            </div>
            
            {/* Result */}
            <div className="bg-accent-primary/10 rounded-lg p-3 border border-accent-primary/20">
              <div className="text-center">
                <p className="text-sm text-text-muted mb-1">Resultado</p>
                <p className="text-2xl font-bold text-accent-primary">
                  {getCurrencySymbol(toCurrency)} {convertCurrency().toLocaleString('es-VE', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {amount} {fromCurrency} = {convertCurrency().toFixed(2)} {toCurrency}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Actualizado: {lastUpdated}</span>
          </div>
          {error && (
            <span className="text-red-400 bg-red-500/20 px-2 py-1 rounded">
              {error}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {isLive && (
            <span className="flex items-center space-x-1 text-green-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>EN VIVO</span>
            </span>
          )}
          <span className="text-yellow-600">bcv.org.ve</span>
        </div>
      </div>
    </div>
  );
}
