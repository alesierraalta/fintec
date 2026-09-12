import type { ScannedReceiptResult } from '@/lib/ai/receipt-scanner/types';

export type ReceiptEvalCategory =
  | 'pagomovil'
  | 'p2p'
  | 'international'
  | 'paper_pos'
  | 'ambiguous'
  | 'visual_degradation'
  | 'rejected'
  | 'negative_control'
  | 'adversarial';

export type ReceiptEvalDifficulty = 'easy' | 'medium' | 'hard' | 'extreme';

export interface ReceiptGroundTruthExpected {
  /** Expected transaction type (EXPENSE, INCOME, TRANSFER, or null if non-financial/rejected) */
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER' | null;
  /** Expected amount in minor units (e.g. 1250.00 VES -> 125000) */
  amountMinor: number | null;
  /** Expected currency code: "VES" | "USD" | "USDT" | "EUR" */
  currency: string | null;
  /** Expected reference or order number */
  referenceNumber: string | null;
  /** Expected payment method or platform: "Pago Móvil" | "Binance P2P" | "Zelle" | "Punto de Venta" | etc. */
  paymentMethod: string | null;
  /** Expected bank name or institution if applicable (e.g. "Banco de Venezuela", "Banesco") */
  bankName: string | null;
  /** Expected fee/commission in minor units, if present */
  feeMinor?: number | null;
  /** Expected net amount in minor units, if present */
  netAmountMinor?: number | null;
  /** Expected exchange rate, if present */
  exchangeRate?: number | null;
  /** Whether the image represents a valid, successful financial voucher */
  isFinancial: boolean;
  /** Whether this transaction was rejected/failed */
  isRejected?: boolean;
  /** Expected category inferred from receipt/basket (e.g. "Alimentación", "Salud", etc.) */
  suggestedCategory?: string | null;
  /** Whether line items are expected to be extracted */
  itemsExpected?: boolean;
  /** Minimum number of line items expected */
  minItemCount?: number;
  /** Difficulty rating */
  difficulty?: ReceiptEvalDifficulty;
}

export interface ReceiptEvalCase {
  id: string;
  name: string;
  category: ReceiptEvalCategory;
  imageFileName: string;
  description: string;
  difficulty: ReceiptEvalDifficulty;
  expected: ReceiptGroundTruthExpected;
}

export interface ReceiptEvalFieldScore {
  field: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  notes?: string;
}

export interface ReceiptEvalCaseResult {
  evalCase: ReceiptEvalCase;
  actual: ScannedReceiptResult | null;
  passed: boolean;
  score: number; // 0.0 - 1.0
  latencyMs: number;
  fieldScores: ReceiptEvalFieldScore[];
  error?: string;
}

export interface ReceiptEvalSummary {
  timestamp: string;
  model: string;
  totalCases: number;
  passedCases: number;
  accuracy: number;
  difficultyScores: Record<
    ReceiptEvalDifficulty,
    {
      total: number;
      passed: number;
      accuracy: number;
    }
  >;
  categoryScores: Record<
    ReceiptEvalCategory,
    {
      total: number;
      passed: number;
      accuracy: number;
    }
  >;
  metrics: {
    amountExactMatchRate: number;
    currencyMatchRate: number;
    typeMatchRate: number;
    referenceMatchRate: number;
    feeDetectionAccuracy: number;
    negativeControlRejectionRate: number;
    rejectedTransactionHandlingRate: number;
    adversarialResistanceRate: number;
    itemizedReceiptAccuracy: number;
    categoryInferenceRate: number;
  };
  latency: {
    avgMs: number;
    p50Ms: number;
    p95Ms: number;
  };
  results: ReceiptEvalCaseResult[];
}
