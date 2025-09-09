// Currency service for exchange rates and crypto prices
import { bcvHistoryService, BCVTrend } from './bcv-history-service';

export interface ExchangeRate {
  currency: string;
  rate: number;
  lastUpdated: string;
  source: string;
}

export interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  lastUpdated: string;
}

export interface BCVRates {
  usd: number;
  eur: number;
  lastUpdated: string;
}

export interface BinanceRates {
  usd_ves: number;
  usdt_ves: number;
  sell_rate: number;  // Tasa de venta (más alta)
  buy_rate: number;   // Tasa de compra (más baja)
  spread: number;     // Diferencia entre compra y venta
  sell_prices_used: number;
  buy_prices_used: number;
  prices_used: number;
  price_range: {
    sell_min: number;
    sell_max: number;
    buy_min: number;
    buy_max: number;
    min: number;
    max: number;
  };
  lastUpdated: string;
};

class CurrencyService {
  private static instance: CurrencyService;
  private bcvRates: BCVRates | null = null;
  private binanceRates: BinanceRates | null = null;
  private cryptoPrices: Map<string, CryptoPrice> = new Map();
  private exchangeRates: Map<string, ExchangeRate> = new Map();

  private constructor() {}

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  // Scrape BCV rates (Banco Central de Venezuela)
  async fetchBCVRates(): Promise<BCVRates> {
    try {
      const response = await fetch('/api/bcv-rates', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const rates: BCVRates = {
          usd: result.data.usd,
          eur: result.data.eur,
          lastUpdated: result.data.lastUpdated || new Date().toISOString()
        };
        
        this.bcvRates = rates;
        
        // Save rates to history for trend analysis
        try {
          await bcvHistoryService.saveRates(rates.usd, rates.eur, result.data.source || 'BCV');
        } catch (error) {
        }
        
        return rates;
      } else {
        // Use fallback data if API returns error but has fallback
        if (result.fallback && result.data) {
          const fallbackRates: BCVRates = {
            usd: result.data.usd,
            eur: result.data.eur,
            lastUpdated: result.data.lastUpdated || new Date().toISOString()
          };
          
          this.bcvRates = fallbackRates;
          return fallbackRates;
        }
        
        throw new Error(result.error || 'Unknown error fetching BCV rates');
      }
    } catch (error) {
      
      // Return cached rates if available
      if (this.bcvRates) {
        return this.bcvRates;
      }
      
      // Last resort: hardcoded fallback
      const fallbackRates: BCVRates = {
        usd: 36.50,
        eur: 39.80,
        lastUpdated: new Date().toISOString()
      };
      
      this.bcvRates = fallbackRates;
      return fallbackRates;
    }
  }

  // Get cryptocurrency prices
  async fetchCryptoPrices(symbols: string[] = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL']): Promise<CryptoPrice[]> {
    try {
      // Mock crypto prices - in a real app, use CoinGecko or similar API
      const mockPrices: CryptoPrice[] = [
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          price: 43250.00,
          change24h: 2.5,
          lastUpdated: new Date().toISOString()
        },
        {
          symbol: 'ETH',
          name: 'Ethereum',
          price: 2650.00,
          change24h: -1.2,
          lastUpdated: new Date().toISOString()
        },
        {
          symbol: 'BNB',
          name: 'BNB',
          price: 315.50,
          change24h: 0.8,
          lastUpdated: new Date().toISOString()
        },
        {
          symbol: 'ADA',
          name: 'Cardano',
          price: 0.45,
          change24h: 3.2,
          lastUpdated: new Date().toISOString()
        },
        {
          symbol: 'SOL',
          name: 'Solana',
          price: 98.75,
          change24h: -2.1,
          lastUpdated: new Date().toISOString()
        },
        {
          symbol: 'USDT',
          name: 'Tether',
          price: 1.00,
          change24h: 0.0,
          lastUpdated: new Date().toISOString()
        },
        {
          symbol: 'USDC',
          name: 'USD Coin',
          price: 1.00,
          change24h: 0.0,
          lastUpdated: new Date().toISOString()
        }
      ];

      mockPrices.forEach(price => {
        this.cryptoPrices.set(price.symbol, price);
      });

      return mockPrices;
    } catch (error) {
      throw new Error('Failed to fetch cryptocurrency prices');
    }
  }

  // Get fiat exchange rates from BCV API
  async fetchExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRate[]> {
    try {
      // Use BCV rates for VES and fallback rates for others
      const bcvRates = await this.fetchBCVRates();
      
      const rates: ExchangeRate[] = [
        {
          currency: 'VES',
          rate: bcvRates.usd,
          lastUpdated: bcvRates.lastUpdated,
          source: 'BCV'
        }
      ];

      rates.forEach(rate => {
        this.exchangeRates.set(rate.currency, rate);
      });

      return rates;
    } catch (error) {
      // Return minimal fallback
      return [{
        currency: 'VES',
        rate: 36.50,
        lastUpdated: new Date().toISOString(),
        source: 'Fallback'
      }];
    }
  }

  // Convert amount between currencies
  convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) return amount;

    const fromRate = this.exchangeRates.get(fromCurrency);
    const toRate = this.exchangeRates.get(toCurrency);

    if (!fromRate || !toRate) {
      throw new Error(`Exchange rate not found for ${fromCurrency} or ${toCurrency}`);
    }

    // Convert to USD first, then to target currency
    const usdAmount = amount / fromRate.rate;
    return usdAmount * toRate.rate;
  }

  // Get cached BCV rates
  getBCVRates(): BCVRates | null {
    return this.bcvRates;
  }

  // Get BCV trends (requires rates to be saved in history)
  async getBCVTrends(): Promise<{ usd: BCVTrend; eur: BCVTrend } | null> {
    try {
      return await bcvHistoryService.calculateTrends();
    } catch (error) {
      return null;
    }
  }

  // Fetch Binance rates
  async fetchBinanceRates(): Promise<BinanceRates> {
    try {
      const response = await fetch('/api/binance-rates', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const rates: BinanceRates = {
          usd_ves: result.data.usd_ves,
          usdt_ves: result.data.usdt_ves,
          sell_rate: result.data.sell_rate,
          buy_rate: result.data.buy_rate,
          spread: result.data.spread,
          sell_prices_used: result.data.sell_prices_used,
          buy_prices_used: result.data.buy_prices_used,
          prices_used: result.data.prices_used,
          price_range: result.data.price_range,
          lastUpdated: result.data.lastUpdated || new Date().toISOString()
        };
        
        this.binanceRates = rates;
        return rates;
      } else {
        // Use fallback data if API returns error but has fallback
        if (result.fallback && result.data) {
          const fallbackRates: BinanceRates = {
        usd_ves: 228.25,
        usdt_ves: 228.25,
        sell_rate: 228.50,
        buy_rate: 228.00,
        spread: 0.50,
        sell_prices_used: 0,
        buy_prices_used: 0,
        prices_used: 0,
        price_range: {
          sell_min: 228.50, sell_max: 228.50,
          buy_min: 228.00, buy_max: 228.00,
          min: 228.00, max: 228.50
        },
        lastUpdated: new Date().toISOString()
      };
          
          this.binanceRates = fallbackRates;
          return fallbackRates;
        }
        
        throw new Error(result.error || 'Unknown error fetching Binance rates');
      }
    } catch (error) {
      // Return cached rates if available
      if (this.binanceRates) {
        return this.binanceRates;
      }
      
      // Last resort: hardcoded fallback
      const fallbackRates: BinanceRates = {
        usd_ves: 228.50,
        usdt_ves: 228.50,
        sell_rate: 228.50,
        buy_rate: 228.50,
        spread: 0,
        sell_prices_used: 0,
        buy_prices_used: 0,
        prices_used: 0,
        price_range: { 
          sell_min: 228.50, 
          sell_max: 228.50, 
          buy_min: 228.50, 
          buy_max: 228.50, 
          min: 228.50, 
          max: 228.50 
        },
        lastUpdated: new Date().toISOString()
      };
      
      this.binanceRates = fallbackRates;
      return fallbackRates;
    }
  }

  // Get cached Binance rates
  getBinanceRates(): BinanceRates | null {
    return this.binanceRates;
  }

  // Get cached crypto price
  getCryptoPrice(symbol: string): CryptoPrice | null {
    return this.cryptoPrices.get(symbol) || null;
  }

  // Get cached exchange rate
  getExchangeRate(currency: string): ExchangeRate | null {
    return this.exchangeRates.get(currency) || null;
  }

  // Format currency display
  formatCurrency(amount: number, currency: string, locale: string = 'en-US'): string {
    const isCrypto = this.cryptoPrices.has(currency);
    
    if (isCrypto) {
      return `${amount.toFixed(8)} ${currency}`;
    }

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  }

  // Get supported currencies
  getSupportedCurrencies(): { fiat: string[], crypto: string[] } {
    return {
      fiat: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'VES'],
      crypto: ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'USDT', 'USDC']
    };
  }
}

export const currencyService = CurrencyService.getInstance();
