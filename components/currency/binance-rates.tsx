'use client';

import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  DollarSign, 
  Clock,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  ArrowUpDown
} from 'lucide-react';
import { currencyService } from '@/lib/services/currency-service';
import type { BinanceRates } from '@/lib/services/currency-service';

export function BinanceRates() {
  const [rates, setRates] = useState<BinanceRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLive, setIsLive] = useState(false);

  const fetchRates = async () => {
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
  };

  useEffect(() => {
    fetchRates();
    
    // Auto-refresh every 2 minutes for P2P data
    const interval = setInterval(fetchRates, 120000);
    return () => clearInterval(interval);
  }, []);

  if (!rates) {
    return (
      <div className="bg-background-elevated rounded-2xl p-4 border border-border-primary animate-pulse">
        <div className="h-4 bg-background-tertiary rounded mb-2"></div>
        <div className="h-8 bg-background-tertiary rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-2xl p-4 border border-orange-500/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <span className="text-sm font-bold text-orange-500">P2P</span>
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Binance P2P</h3>
            <p className="text-xs text-text-muted">Compra vs Venta USD/VES</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchRates}
            disabled={loading}
            className="p-2 rounded-lg bg-background-elevated hover:bg-background-tertiary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-text-primary ${loading ? 'animate-spin' : ''}`} />
          </button>
          <a 
            href="https://p2p.binance.com/es/trade/sell/USDT?fiat=VES&payment=all" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-background-elevated hover:bg-background-tertiary transition-colors"
          >
            <ExternalLink className="h-4 w-4 text-text-primary" />
          </a>
        </div>
      </div>

      {/* USD/VES Rates - Compra y Venta */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* VENTA (Sell) - Precio más alto */}
        <div className="bg-background-elevated/50 rounded-xl p-3 border border-red-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-text-primary">VENTA</span>
            </div>
            {isLive && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-500">VIVO</span>
              </div>
            )}
          </div>
          <p className="text-xl font-bold text-red-500 mb-1">
            Bs. {rates.sell_rate.toFixed(2)}
          </p>
          <p className="text-xs text-text-muted">Vendedores piden</p>
          <p className="text-xs text-gray-500 mt-1">{rates.sell_prices_used} ofertas</p>
        </div>

        {/* COMPRA (Buy) - Precio más bajo */}
        <div className="bg-background-elevated/50 rounded-xl p-3 border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-text-primary">COMPRA</span>
            </div>
            {isLive && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-500">VIVO</span>
              </div>
            )}
          </div>
          <p className="text-xl font-bold text-green-500 mb-1">
            Bs. {rates.buy_rate.toFixed(2)}
          </p>
          <p className="text-xs text-text-muted">Compradores ofrecen</p>
          <p className="text-xs text-gray-500 mt-1">{rates.buy_prices_used} ofertas</p>
        </div>
      </div>

      {/* Spread y Promedio */}
      <div className="bg-background-elevated/50 rounded-xl p-3 border border-border-primary/50 mb-4">
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <p className="text-text-muted mb-1">Promedio</p>
            <p className="font-bold text-accent-primary">Bs. {rates.usd_ves.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-text-muted mb-1">Spread</p>
            <p className="font-bold text-orange-500">
              <ArrowUpDown className="h-3 w-3 inline mr-1" />
              Bs. {rates.spread.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-text-muted mb-1">Ofertas Total</p>
            <p className="font-bold text-text-primary">{rates.prices_used}</p>
          </div>
        </div>
      </div>

      {/* Explicación del mercado */}
      <div className="bg-accent-primary/10 rounded-lg p-3 mb-4 border border-accent-primary/20">
        <p className="text-xs text-text-muted text-center">
          <strong className="text-red-500">VENTA:</strong> Lo que pides si vendes dólares · 
          <strong className="text-green-500 ml-1">COMPRA:</strong> Lo que pagas si compras dólares
        </p>
        <p className="text-xs text-text-muted text-center mt-1">
          Diferencia (Spread): <strong>Bs. {rates.spread.toFixed(2)}</strong> - Entre compradores y vendedores
        </p>
      </div>

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
          <span className="text-orange-600">Binance P2P Venezuela</span>
        </div>
      </div>
    </div>
  );
}