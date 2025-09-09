'use client';

import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface BinanceRates {
  usd_ves: number;
  usdt_ves: number;
  lastUpdated: string;
}

export function BinanceRates() {
  const [rates, setRates] = useState<BinanceRates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchRates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/binance-rates');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setRates(data.data);
    } catch (err) {
      setError('Error al cargar las tasas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-orange-600">💰</span>
            <span className="font-semibold text-gray-800">Tasas Binance P2P</span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <span className="text-sm">
              {isExpanded ? 'Minimizar' : 'Expandir'}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className={`p-4 transition-all duration-200 ${isExpanded ? 'block' : 'hidden'}`}>
        {loading ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
            <p className="text-gray-600 mt-2 text-sm">Cargando tasas...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-red-600 text-sm">{error}</p>
            <button 
              onClick={fetchRates}
              className="mt-2 text-orange-600 hover:text-orange-700 text-sm underline"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current rates */}
            <div className="grid grid-cols-1 gap-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">USD/VES</span>
                <span className="text-lg font-bold text-gray-900">
                  Bs {rates?.usd_ves?.toFixed(2) || '--'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">USDT/VES</span>
                <span className="text-lg font-bold text-gray-900">
                  Bs {rates?.usdt_ves?.toFixed(2) || '--'}
                </span>
              </div>
            </div>
            
            {/* Last updated */}
            <div className="text-xs text-gray-500 text-center">
              {rates?.lastUpdated && (
                <>Actualizado: {new Date(rates.lastUpdated).toLocaleTimeString()}</>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
