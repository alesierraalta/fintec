/**
 * Centralized type definitions for exchange rates and cryptocurrency prices
 * This file consolidates interfaces that were previously duplicated across multiple files
 * 
 * Note: Generic ExchangeRate and CryptoPrice are defined in domain.ts
 * This file contains only BCV/Binance specific interfaces
 */

// * BCV (Banco Central de Venezuela) Rates
export interface BCVRates {
    usd: number;
    eur: number;
    lastUpdated: string;
    source?: string;
    cached?: boolean;
    cacheAge?: number;
    fallback?: boolean;
    fallbackReason?: string;
    dataAge?: number;
}

// * Binance P2P Exchange Rates
export interface BinanceRates {
    usd_ves: number;
    usdt_ves: number;
    busd_ves: number;
    sell_rate: {
        min: number;
        avg: number;
        max: number;
    };
    buy_rate: {
        min: number;
        avg: number;
        max: number;
    };
    spread: number;
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
    source?: string;
    cached?: boolean;
    cacheAge?: number;
    fallback?: boolean;
    fallbackReason?: string;
}

// * WebSocket Exchange Rate Data
export interface ExchangeRateData {
    usd_ves: number;
    usdt_ves: number;
    busd_ves: number;
    sell_rate: number;
    buy_rate: number;
    lastUpdated: string;
    source: string;
}

// * BCV Trend Data
export interface BCVTrend {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
}

// * Binance Trend Data
export interface BinanceTrend {
    current: number;
    high: number;
    low: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
}
