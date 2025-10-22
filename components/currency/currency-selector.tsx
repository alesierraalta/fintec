'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  Search, 
  DollarSign, 
  Euro, 
  Bitcoin,
  Coins,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { currencyService, CryptoPrice, ExchangeRate } from '@/lib/services/currency-service';

interface CurrencySelectorProps {
  selectedCurrency: string;
  onCurrencySelect: (currency: string, type: 'fiat' | 'crypto') => void;
  showBalance?: boolean;
}

interface CurrencyOption {
  code: string;
  name: string;
  type: 'fiat' | 'crypto';
  icon?: React.ReactNode;
  price?: number;
  change24h?: number;
}

const currencyIcons: { [key: string]: React.ReactNode } = {
  USD: <DollarSign className="h-4 w-4" />,
  EUR: <Euro className="h-4 w-4" />,
  GBP: <span className="text-sm font-bold">£</span>,
  JPY: <span className="text-sm font-bold">¥</span>,
  VES: <span className="text-sm font-bold">Bs</span>,
  BTC: <Bitcoin className="h-4 w-4" />,
  ETH: <span className="text-sm font-bold">Ξ</span>,
  BNB: <Coins className="h-4 w-4" />,
  ADA: <span className="text-sm font-bold">₳</span>,
  SOL: <span className="text-sm font-bold">◎</span>,
  USDT: <span className="text-sm font-bold">₮</span>,
  USDC: <span className="text-sm font-bold">$</span>,
};

export function CurrencySelector({ selectedCurrency, onCurrencySelect, showBalance = false }: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [crypto, fiat] = await Promise.all([
          currencyService.fetchCryptoPrices(),
          currencyService.fetchExchangeRates()
        ]);

        setCryptoPrices(crypto);
        setExchangeRates(fiat);

        const allCurrencies: CurrencyOption[] = [
          // Fiat currencies
          { code: 'USD', name: 'US Dollar', type: 'fiat', icon: currencyIcons.USD },
          { code: 'EUR', name: 'Euro', type: 'fiat', icon: currencyIcons.EUR },
          { code: 'GBP', name: 'British Pound', type: 'fiat', icon: currencyIcons.GBP },
          { code: 'JPY', name: 'Japanese Yen', type: 'fiat', icon: currencyIcons.JPY },
          { code: 'VES', name: 'Venezuelan Bolívar', type: 'fiat', icon: currencyIcons.VES },
          // Crypto currencies
          ...crypto.map(c => ({
            code: c.symbol,
            name: c.name,
            type: 'crypto' as const,
            icon: currencyIcons[c.symbol] || <Coins className="h-4 w-4" />,
            price: c.price,
            change24h: c.change24h
          }))
        ];

        setCurrencies(allCurrencies);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredCurrencies = currencies.filter(currency =>
    currency.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCurrencyData = currencies.find(c => c.code === selectedCurrency);

  const handleSelect = (currency: CurrencyOption) => {
    onCurrencySelect(currency.code, currency.type);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 bg-background-elevated border border-border-primary rounded-xl text-text-primary hover:bg-background-tertiary transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-accent-primary/20 flex items-center justify-center text-accent-primary">
            {selectedCurrencyData?.icon || <DollarSign className="h-4 w-4" />}
          </div>
          <div className="text-left">
            <p className="font-medium">{selectedCurrency}</p>
            <p className="text-sm text-text-muted">{selectedCurrencyData?.name || 'Select Currency'}</p>
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background-elevated border border-border-primary rounded-xl shadow-2xl z-50 max-h-96 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-border-primary">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar divisa o cripto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background-primary border border-border-primary rounded-lg text-text-primary placeholder-text-muted focus:ring-2 focus:ring-accent-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Currency List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
                    <div className="w-8 h-8 bg-background-tertiary rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-background-tertiary rounded mb-1"></div>
                      <div className="h-3 bg-background-tertiary rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Fiat Currencies */}
                <div className="p-2">
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 px-2">Divisas Fiat</h4>
                  {filteredCurrencies.filter(c => c.type === 'fiat').map((currency) => (
                    <button
                      key={currency.code}
                      onClick={() => handleSelect(currency)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-background-tertiary transition-colors ${
                        selectedCurrency === currency.code ? 'bg-accent-primary/10 border border-accent-primary/20' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-background-primary flex items-center justify-center">
                          {currency.icon}
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-text-primary">{currency.code}</p>
                          <p className="text-sm text-text-muted">{currency.name}</p>
                        </div>
                      </div>
                      {currency.code === 'VES' && (
                        <div className="text-right">
                          <p className="text-sm font-medium text-yellow-600">BCV</p>
                          <p className="text-xs text-text-muted">Oficial</p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Crypto Currencies */}
                <div className="p-2 border-t border-border-primary">
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 px-2">Criptomonedas</h4>
                  {filteredCurrencies.filter(c => c.type === 'crypto').map((currency) => (
                    <button
                      key={currency.code}
                      onClick={() => handleSelect(currency)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-background-tertiary transition-colors ${
                        selectedCurrency === currency.code ? 'bg-accent-primary/10 border border-accent-primary/20' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-background-primary flex items-center justify-center">
                          {currency.icon}
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-text-primary">{currency.code}</p>
                          <p className="text-sm text-text-muted">{currency.name}</p>
                        </div>
                      </div>
                      {currency.price && (
                        <div className="text-right">
                          <p className="text-sm font-medium text-text-primary">
                            ${currency.price.toLocaleString()}
                          </p>
                          {currency.change24h !== undefined && (
                            <div className={`flex items-center space-x-1 text-xs ${
                              currency.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {currency.change24h >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              <span>{Math.abs(currency.change24h).toFixed(1)}%</span>
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
