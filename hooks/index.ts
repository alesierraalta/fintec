/**
 * Barrel export file for custom React hooks
 * This file provides a centralized export point for all hooks in the application
 */

// Authentication & User
export { useAuth } from './use-auth';
export { useSubscription, useUpgrade, useManageSubscription } from './use-subscription';

// Data Management
export { useOptimizedData } from './use-optimized-data';

// Currency & Rates
export { useBCVRates } from './use-bcv-rates';
export { useBinanceRates } from './use-binance-rates';
export { useCurrencyConverter } from './use-currency-converter';
export { useRateTrends } from './use-rate-trends';
export { useRealtimeRates } from './use-realtime-rates';

// Features
export { useAutoBackup } from './use-auto-backup';
export { useBalanceAlerts } from './use-balance-alerts';
export { useCheckLimit } from './use-check-limit';

// Forms
export { useTransactionForm, TRANSACTION_TYPES } from './use-transaction-form';
export type { TransactionFormData, UseTransactionFormReturn } from './use-transaction-form';

// UI & UX
export { useModal } from './use-modal';
export { useTutorial } from './use-tutorial';
export { useMediaQuery } from './use-media-query';
export { useViewportHeight } from './use-viewport-height';
