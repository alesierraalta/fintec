/**
 * BCV Rates Service
 * Handles fetching, caching, and managing Banco Central de Venezuela exchange rates
 * Extracted from currency-service.ts as part of Phase 3 refactoring
 */

import type { BCVRates } from '@/types/rates';
import { bcvHistoryService, BCVTrend } from './bcv-history-service';
import { logger } from '@/lib/utils/logger';
import { STATIC_BCV_FALLBACK_RATES, isFallbackSource } from './rates-fallback';

class BCVRatesService {
    private static instance: BCVRatesService;
    private cachedRates: BCVRates | null = null;

    private constructor() { }

    static getInstance(): BCVRatesService {
        if (!BCVRatesService.instance) {
            BCVRatesService.instance = new BCVRatesService();
        }
        return BCVRatesService.instance;
    }

    /**
     * Fetch BCV rates from API with fallback strategies
     * @returns Promise<BCVRates>
     */
    async fetchRates(): Promise<BCVRates> {
        const nowIso = () => new Date().toISOString();

        const parseTimestampMs = (iso: string | undefined): number => {
            if (!iso) return 0;
            const ms = new Date(iso).getTime();
            return Number.isFinite(ms) ? ms : 0;
        };

        const buildRatesFromApi = (result: any): BCVRates => {
            const data = result?.data;
            const usd = Number(data?.usd);
            const eur = Number(data?.eur);

            if (!Number.isFinite(usd) || !Number.isFinite(eur)) {
                throw new Error('Invalid BCV rates payload');
            }

            const source = typeof data?.source === 'string' ? data.source : 'BCV';
            const isFallback = result?.fallback === true || isFallbackSource(source);

            const cacheAge = Number(result?.cacheAge);
            const dataAge = Number(result?.dataAge);

            return {
                usd,
                eur,
                lastUpdated: data?.lastUpdated || nowIso(),
                source,
                cached: result?.cached === true ? true : undefined,
                cacheAge: Number.isFinite(cacheAge) ? cacheAge : undefined,
                fallback: isFallback ? true : undefined,
                fallbackReason:
                    typeof result?.fallbackReason === 'string'
                        ? result.fallbackReason
                        : undefined,
                dataAge: Number.isFinite(dataAge) ? dataAge : undefined,
            };
        };

        const tryHistoryFallback = async (): Promise<BCVRates | null> => {
            const hasIndexedDb = typeof (globalThis as any).indexedDB !== 'undefined';
            if (!hasIndexedDb) return null;

            const latest = await bcvHistoryService.getLatestRate();
            if (!latest) return null;

            const lastUpdatedMs = parseTimestampMs(latest.timestamp);

            return {
                usd: latest.usd,
                eur: latest.eur,
                lastUpdated: latest.timestamp || nowIso(),
                source: 'BCV (fallback - history)',
                fallback: true,
                fallbackReason: 'history',
                dataAge: lastUpdatedMs
                    ? Math.max(0, Math.round((Date.now() - lastUpdatedMs) / 1000))
                    : undefined,
            };
        };

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

            if (result?.data) {
                const apiRates = buildRatesFromApi(result);
                this.cachedRates = apiRates;

                const isFreshSuccess = result?.success === true && apiRates.fallback !== true;
                if (isFreshSuccess) {
                    try {
                        await bcvHistoryService.saveRates(
                            apiRates.usd,
                            apiRates.eur,
                            result.data.source || 'BCV'
                        );
                    } catch {
                        // * Ignore history save errors
                    }
                }

                return apiRates;
            }

            throw new Error(result?.error || 'Unknown error fetching BCV rates');
        } catch (error) {
            // Try cache first
            if (this.cachedRates) {
                const lastUpdatedMs = parseTimestampMs(this.cachedRates.lastUpdated);
                const computedAge = lastUpdatedMs
                    ? Math.max(0, Math.round((Date.now() - lastUpdatedMs) / 1000))
                    : undefined;

                return {
                    ...this.cachedRates,
                    cached: true,
                    fallback: true,
                    fallbackReason: 'cache',
                    dataAge: this.cachedRates.dataAge ?? computedAge,
                    source: this.cachedRates.source || 'BCV (fallback - cache)',
                };
            }

            // Try history fallback
            const historyRates = await tryHistoryFallback();
            if (historyRates) {
                this.cachedRates = historyRates;
                return historyRates;
            }

            // Last resort: static fallback
            const fallbackRates: BCVRates = {
                usd: STATIC_BCV_FALLBACK_RATES.usd,
                eur: STATIC_BCV_FALLBACK_RATES.eur,
                lastUpdated: nowIso(),
                source: 'BCV (fallback - static)',
                fallback: true,
                fallbackReason: 'static',
            };

            this.cachedRates = fallbackRates;
            return fallbackRates;
        }
    }

    /**
     * Get cached BCV rates
     * @returns BCVRates | null
     */
    getCachedRates(): BCVRates | null {
        return this.cachedRates;
    }

    /**
     * Get BCV trends from history
     * @returns Promise<{ usd: BCVTrend; eur: BCVTrend } | null>
     */
    async getTrends(): Promise<{ usd: BCVTrend; eur: BCVTrend } | null> {
        try {
            return await bcvHistoryService.calculateTrends();
        } catch (error) {
            logger.error('[BCVRatesService] Error getting trends:', error);
            return null;
        }
    }

    /**
     * Clear cached rates (useful for testing or forcing refresh)
     */
    clearCache(): void {
        this.cachedRates = null;
    }
}

export const bcvRatesService = BCVRatesService.getInstance();
export { BCVRatesService };
