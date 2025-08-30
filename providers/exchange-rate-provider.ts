// Exchange rate provider interface and implementations

export interface ExchangeRateProvider {
  name: string;
  getRate(baseCurrency: string, quoteCurrency: string, date?: string): Promise<number>;
  getRates(baseCurrency: string, quoteCurrencies: string[], date?: string): Promise<Record<string, number>>;
  getSupportedCurrencies(): Promise<string[]>;
  isAvailable(): Promise<boolean>;
}

// Static provider for development and fallback
export class StaticExchangeRateProvider implements ExchangeRateProvider {
  name = 'Static';

  private readonly staticRates: Record<string, Record<string, number>> = {
    'USD': {
      'EUR': 0.85,
      'GBP': 0.73,
      'JPY': 110.0,
      'CAD': 1.25,
      'AUD': 1.35,
      'CHF': 0.92,
      'CNY': 6.45,
      'INR': 74.5,
      'BRL': 5.2,
      'MXN': 20.1,
      'ARS': 98.5,
      'CLP': 800.0,
      'COP': 3800.0,
      'PEN': 3.6,
    },
    'EUR': {
      'USD': 1.18,
      'GBP': 0.86,
      'JPY': 129.5,
    },
    'GBP': {
      'USD': 1.37,
      'EUR': 1.16,
    },
  };

  async getRate(baseCurrency: string, quoteCurrency: string, date?: string): Promise<number> {
    if (baseCurrency === quoteCurrency) return 1;

    // Direct rate
    const rate = this.staticRates[baseCurrency]?.[quoteCurrency];
    if (rate) return rate;

    // Inverse rate
    const inverseRate = this.staticRates[quoteCurrency]?.[baseCurrency];
    if (inverseRate) return 1 / inverseRate;

    // Cross rate via USD
    if (baseCurrency !== 'USD' && quoteCurrency !== 'USD') {
      const baseToUsd = await this.getRate(baseCurrency, 'USD', date);
      const usdToQuote = await this.getRate('USD', quoteCurrency, date);
      return baseToUsd * usdToQuote;
    }

    return 1; // Fallback
  }

  async getRates(baseCurrency: string, quoteCurrencies: string[], date?: string): Promise<Record<string, number>> {
    const rates: Record<string, number> = {};
    
    for (const quoteCurrency of quoteCurrencies) {
      rates[quoteCurrency] = await this.getRate(baseCurrency, quoteCurrency, date);
    }
    
    return rates;
  }

  async getSupportedCurrencies(): Promise<string[]> {
    const currencies = new Set<string>();
    
    for (const base of Object.keys(this.staticRates)) {
      currencies.add(base);
      for (const quote of Object.keys(this.staticRates[base])) {
        currencies.add(quote);
      }
    }
    
    return Array.from(currencies).sort();
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

// HTTP provider for real exchange rates
export class HttpExchangeRateProvider implements ExchangeRateProvider {
  name = 'HTTP';
  
  private readonly baseUrl = 'https://api.exchangerate.host';
  private readonly cacheKey = 'exchange-rates-cache';
  private readonly cacheExpiryHours = 24;

  async getRate(baseCurrency: string, quoteCurrency: string, date?: string): Promise<number> {
    if (baseCurrency === quoteCurrency) return 1;

    try {
      const cacheKey = `${baseCurrency}-${quoteCurrency}-${date || 'latest'}`;
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        return cached;
      }

      const url = date 
        ? `${this.baseUrl}/${date}?base=${baseCurrency}&symbols=${quoteCurrency}`
        : `${this.baseUrl}/latest?base=${baseCurrency}&symbols=${quoteCurrency}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.info || 'API request failed');
      }

      const rate = data.rates?.[quoteCurrency];
      if (!rate) {
        throw new Error(`Rate not found for ${baseCurrency}/${quoteCurrency}`);
      }

      this.setCache(cacheKey, rate);
      return rate;
      
    } catch (error) {
      
      // Fallback to static provider
      const fallback = new StaticExchangeRateProvider();
      return fallback.getRate(baseCurrency, quoteCurrency, date);
    }
  }

  async getRates(baseCurrency: string, quoteCurrencies: string[], date?: string): Promise<Record<string, number>> {
    if (quoteCurrencies.length === 0) return {};

    try {
      const symbols = quoteCurrencies.join(',');
      const cacheKey = `${baseCurrency}-${symbols}-${date || 'latest'}`;
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        return cached;
      }

      const url = date 
        ? `${this.baseUrl}/${date}?base=${baseCurrency}&symbols=${symbols}`
        : `${this.baseUrl}/latest?base=${baseCurrency}&symbols=${symbols}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.info || 'API request failed');
      }

      const rates = data.rates || {};
      this.setCache(cacheKey, rates);
      return rates;
      
    } catch (error) {
      
      // Fallback to individual requests
      const rates: Record<string, number> = {};
      for (const quoteCurrency of quoteCurrencies) {
        rates[quoteCurrency] = await this.getRate(baseCurrency, quoteCurrency, date);
      }
      return rates;
    }
  }

  async getSupportedCurrencies(): Promise<string[]> {
    try {
      const cached = this.getFromCache('supported-currencies');
      if (cached) {
        return cached;
      }

      const response = await fetch(`${this.baseUrl}/symbols`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.info || 'API request failed');
      }

      const currencies = Object.keys(data.symbols || {}).sort();
      this.setCache('supported-currencies', currencies);
      return currencies;
      
    } catch (error) {
      
      // Fallback to static provider
      const fallback = new StaticExchangeRateProvider();
      return fallback.getSupportedCurrencies();
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/latest?base=USD&symbols=EUR`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Cache management
  private getFromCache(key: string): any {
    try {
      const cached = localStorage.getItem(`${this.cacheKey}-${key}`);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      const expiryTime = timestamp + (this.cacheExpiryHours * 60 * 60 * 1000);

      if (now > expiryTime) {
        localStorage.removeItem(`${this.cacheKey}-${key}`);
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  private setCache(key: string, data: any): void {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(`${this.cacheKey}-${key}`, JSON.stringify(cacheData));
    } catch (error) {
    }
  }
}

// Composite provider that tries multiple providers
export class CompositeExchangeRateProvider implements ExchangeRateProvider {
  name = 'Composite';
  
  private providers: ExchangeRateProvider[];

  constructor(providers: ExchangeRateProvider[] = []) {
    this.providers = providers.length > 0 ? providers : [
      new HttpExchangeRateProvider(),
      new StaticExchangeRateProvider(),
    ];
  }

  async getRate(baseCurrency: string, quoteCurrency: string, date?: string): Promise<number> {
    for (const provider of this.providers) {
      try {
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) continue;

        const rate = await provider.getRate(baseCurrency, quoteCurrency, date);
        return rate;
      } catch (error) {
        continue;
      }
    }

    return 1; // Final fallback
  }

  async getRates(baseCurrency: string, quoteCurrencies: string[], date?: string): Promise<Record<string, number>> {
    for (const provider of this.providers) {
      try {
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) continue;

        const rates = await provider.getRates(baseCurrency, quoteCurrencies, date);
        return rates;
      } catch (error) {
        continue;
      }
    }

    
    // Final fallback: individual requests
    const rates: Record<string, number> = {};
    for (const quoteCurrency of quoteCurrencies) {
      rates[quoteCurrency] = 1; // Fallback rate
    }
    return rates;
  }

  async getSupportedCurrencies(): Promise<string[]> {
    for (const provider of this.providers) {
      try {
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) continue;

        const currencies = await provider.getSupportedCurrencies();
        return currencies;
      } catch (error) {
        continue;
      }
    }

    // Final fallback
    return ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'];
  }

  async isAvailable(): Promise<boolean> {
    for (const provider of this.providers) {
      const isAvailable = await provider.isAvailable();
      if (isAvailable) return true;
    }
    return false;
  }
}

// Default provider instance
let defaultProvider: ExchangeRateProvider | null = null;

export function getExchangeRateProvider(): ExchangeRateProvider {
  if (!defaultProvider) {
    defaultProvider = new CompositeExchangeRateProvider();
  }
  return defaultProvider;
}

export function setExchangeRateProvider(provider: ExchangeRateProvider): void {
  defaultProvider = provider;
}
