/**
 * Crypto Prices Service
 * Handles fetching and caching cryptocurrency prices
 * Extracted from currency-service.ts as part of Phase 3 refactoring
 */

import { logger } from '@/lib/utils/logger';

/**
 * Cryptocurrency price interface
 */
export interface CryptoPrice {
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    lastUpdated: string;
}

class CryptoPricesService {
    private static instance: CryptoPricesService;
    private cachedPrices: Map<string, CryptoPrice> = new Map();

    private constructor() { }

    static getInstance(): CryptoPricesService {
        if (!CryptoPricesService.instance) {
            CryptoPricesService.instance = new CryptoPricesService();
        }
        return CryptoPricesService.instance;
    }

    /**
     * Fetch cryptocurrency prices
     * @param symbols - Array of crypto symbols to fetch (default: ['BTC', 'ETH', 'BNB', 'ADA', 'SOL'])
     * @returns Promise<CryptoPrice[]>
     * 
     * TODO: Replace mock data with real API (CoinGecko, CoinMarketCap, etc.)
     */
    async fetchPrices(symbols: string[] = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL']): Promise<CryptoPrice[]> {
        try {
            // * Mock crypto prices - in a real app, use CoinGecko or similar API
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

            // * Filter by requested symbols
            const filteredPrices = mockPrices.filter(price =>
                symbols.includes(price.symbol)
            );

            // * Update cache
            filteredPrices.forEach(price => {
                this.cachedPrices.set(price.symbol, price);
            });

            return filteredPrices;
        } catch (error) {
            logger.error('[CryptoPricesService] Error fetching prices:', error);
            throw new Error('Failed to fetch cryptocurrency prices');
        }
    }

    /**
     * Get cached price for a specific cryptocurrency
     * @param symbol - Crypto symbol (e.g., 'BTC', 'ETH')
     * @returns CryptoPrice | null
     */
    getCachedPrice(symbol: string): CryptoPrice | null {
        return this.cachedPrices.get(symbol.toUpperCase()) || null;
    }

    /**
     * Get all cached cryptocurrency prices
     * @returns Map<string, CryptoPrice>
     */
    getAllCachedPrices(): Map<string, CryptoPrice> {
        return new Map(this.cachedPrices);
    }

    /**
     * Clear cached prices
     */
    clearCache(): void {
        this.cachedPrices.clear();
    }

    /**
     * Get supported cryptocurrency symbols
     * @returns string[]
     */
    getSupportedSymbols(): string[] {
        return ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'USDT', 'USDC'];
    }

    /**
     * Check if a symbol is supported
     * @param symbol - Crypto symbol
     * @returns boolean
     */
    isSupported(symbol: string): boolean {
        return this.getSupportedSymbols().includes(symbol.toUpperCase());
    }
}

export const cryptoPricesService = CryptoPricesService.getInstance();
export { CryptoPricesService };
