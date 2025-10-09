// Subscription domain types

export type SubscriptionTier = 'free' | 'base' | 'premium';

export type SubscriptionStatus = 
  | 'active' 
  | 'cancelled' 
  | 'past_due' 
  | 'paused' 
  | 'trialing';

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  lemonSqueezySubscriptionId?: string;
  lemonSqueezyCustomerId?: string;
  lemonSqueezyOrderId?: string;
  customerPortalUrl?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageTracking {
  id: string;
  userId: string;
  monthYear: string; // Format: YYYY-MM
  transactionCount: number;
  backupCount: number;
  apiCalls: number;
  exportCount: number;
  aiRequests: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionLimits {
  transactions: number | 'unlimited';
  backups: number | 'unlimited';
  dataHistory: number | 'unlimited'; // months
  exports: number | 'unlimited';
  apiCalls: number | 'unlimited';
  aiRequests: number | 'unlimited';
}

export const TIER_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    transactions: 500,
    backups: 4, // 1 per week
    dataHistory: 6, // 6 months
    exports: 5,
    apiCalls: 0,
    aiRequests: 0,
  },
  base: {
    transactions: 'unlimited',
    backups: 'unlimited',
    dataHistory: 'unlimited',
    exports: 'unlimited',
    apiCalls: 0,
    aiRequests: 0,
  },
  premium: {
    transactions: 'unlimited',
    backups: 'unlimited',
    dataHistory: 'unlimited',
    exports: 'unlimited',
    apiCalls: 1000,
    aiRequests: 'unlimited',
  },
};

export interface TierFeatures {
  name: string;
  price: number; // in cents
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  highlighted?: boolean;
}

export const TIER_FEATURES: Record<SubscriptionTier, TierFeatures> = {
  free: {
    name: 'Gratis',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [
      'Cuentas ilimitadas',
      '500 transacciones/mes',
      'Reportes y análisis básicos',
      'Categorías y presupuestos',
      'Metas de ahorro',
      'Historial de 6 meses',
      'Respaldo manual (1/semana)',
      'Tasas de cambio básicas',
    ],
  },
  base: {
    name: 'Base',
    price: 499, // $4.99
    currency: 'USD',
    interval: 'month',
    features: [
      'Todo lo de Gratis',
      'Transacciones ilimitadas',
      'Historial completo (ilimitado)',
      'Reportes avanzados con exportación',
      'Respaldos automáticos diarios',
      'Múltiples monedas en tiempo real',
      'Soporte prioritario',
      'Automatización de transacciones recurrentes',
      'Alertas de saldo',
    ],
    highlighted: true,
  },
  premium: {
    name: 'Premium',
    price: 999, // $9.99
    currency: 'USD',
    interval: 'month',
    features: [
      'Todo lo de Base',
      '🤖 Categorización automática con IA',
      '📈 Predicciones de gastos',
      '💡 Consejos financieros personalizados',
      '🔍 Detección de anomalías',
      '🎯 Optimización de presupuestos',
      '🏆 Insights de cumplimiento de metas',
      'Dashboard de análisis avanzado',
      'Acceso a API',
      'Reportes con marca blanca',
      'Soporte premium (respuesta en 24h)',
    ],
  },
};

export type Feature = 
  | 'unlimited_transactions'
  | 'unlimited_history'
  | 'advanced_reports'
  | 'export_data'
  | 'automatic_backups'
  | 'realtime_rates'
  | 'recurring_automation'
  | 'balance_alerts'
  | 'ai_categorization'
  | 'ai_predictions'
  | 'ai_advice'
  | 'anomaly_detection'
  | 'budget_optimization'
  | 'goal_insights'
  | 'api_access'
  | 'white_label_reports'
  | 'premium_support';

export const FEATURE_ACCESS: Record<SubscriptionTier, Feature[]> = {
  free: [],
  base: [
    'unlimited_transactions',
    'unlimited_history',
    'advanced_reports',
    'export_data',
    'automatic_backups',
    'realtime_rates',
    'recurring_automation',
    'balance_alerts',
  ],
  premium: [
    'unlimited_transactions',
    'unlimited_history',
    'advanced_reports',
    'export_data',
    'automatic_backups',
    'realtime_rates',
    'recurring_automation',
    'balance_alerts',
    'ai_categorization',
    'ai_predictions',
    'ai_advice',
    'anomaly_detection',
    'budget_optimization',
    'goal_insights',
    'api_access',
    'white_label_reports',
    'premium_support',
  ],
};

export interface SubscriptionCheckoutSession {
  sessionId: string;
  url: string;
}

export interface UsageStatus {
  transactions: {
    current: number;
    limit: number | 'unlimited';
    percentage: number;
  };
  backups: {
    current: number;
    limit: number | 'unlimited';
    percentage: number;
  };
  exports: {
    current: number;
    limit: number | 'unlimited';
    percentage: number;
  };
  aiRequests: {
    current: number;
    limit: number | 'unlimited';
    percentage: number;
  };
}

