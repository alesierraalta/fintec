/**
 * AI Receipt Scanner Type Definitions
 *
 * Covers extraction of Venezuelan banking receipts (Pago Móvil, transferencias),
 * Crypto exchanges (Binance P2P, Convert), and international payments (Zelle, etc.).
 */

export type ScannedReceiptType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export type AccountMatchConfidence = 'HIGH' | 'MEDIUM' | 'AMBIGUOUS' | 'NONE';

export interface AccountCandidate {
  id: string;
  name: string;
  currencyCode: string;
  type?: string;
  bankName?: string;
}

export interface CategoryCandidate {
  id: string;
  name: string;
  kind: 'EXPENSE' | 'INCOME';
  description?: string;
  icon?: string;
}

export interface CounterpartyInfo {
  name?: string;
  idNumber?: string; // Cédula (V-..., J-..., E-...) or Tax ID
  phone?: string; // Phone number for Pago Móvil (0414..., 0424..., etc.)
  bank?: string; // Destination/origin bank
  accountNumber?: string; // Full or masked account number
}

export interface ScannedReceiptResult {
  /** Detected transaction operation type */
  type: ScannedReceiptType;
  /** Overall confidence of receipt extraction */
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';

  /** Primary amount in major units (e.g. 150.50) */
  amount: number;
  /** Primary currency (ISO 4217, e.g. 'VES', 'USD', 'USDT', 'EUR') */
  currency: string;

  /** For transfers/exchanges: secondary/target amount (e.g. 1,825.00 VES) */
  targetAmount?: number;
  /** For transfers/exchanges: target currency (e.g. 'VES') */
  targetCurrency?: string;
  /** Exchange rate used or calculated (e.g. targetAmount / amount) */
  exchangeRate?: number;

  /** Fee or commission charged (e.g. 0.06 USDT, or banking commission in VES) */
  fee?: number;
  /** Currency of the fee (e.g. 'USDT', 'VES') */
  feeCurrency?: string;
  /** Net amount after deducting fees (e.g. release quantity 42.66 USDT) */
  netAmount?: number;

  /** Fiscal invoice breakdown & taxes */
  /** Base amount / Subtotal before taxes */
  subtotal?: number;
  /** Tax amount / IVA (e.g. 16% IVA) */
  taxAmount?: number;
  /** Tax rate percentage (e.g. 16 for 16%, 8 for 8%) */
  taxRate?: number;
  /** IGTF (Impuesto a las Grandes Transacciones Financieras, e.g. 3%) */
  igtfAmount?: number;
  /** Discount applied */
  discountAmount?: number;
  /** Fiscal invoice / control number (e.g. Factura N° 00049281) */
  invoiceNumber?: string;
  /** Fiscal identification / RIF / Tax ID (e.g. J-31415926-5) */
  taxId?: string;

  /** Extracted transaction date in YYYY-MM-DD */
  date: string;
  /** Extracted transaction time in HH:mm if available */
  time?: string;

  /** Unique transaction reference / confirmation / order ID */
  referenceId?: string;
  /** Payment method identified (e.g. 'Pago Móvil', 'Binance P2P', 'Transferencia Bancaria', 'Zelle', 'Punto de Venta') */
  paymentMethod?: string;
  /** Platform or banking institution (e.g. 'Banesco', 'Banco de Venezuela', 'Mercantil', 'Binance') */
  bankOrPlatform?: string;

  /** Counterparty / Beneficiary / Originator */
  counterparty?: CounterpartyInfo;

  /** Smart Account Resolution */
  suggestedAccountId?: string;
  suggestedToAccountId?: string;
  accountMatchConfidence: AccountMatchConfidence;
  accountMatchReason?: string;
  matchingAccountCandidates?: string[]; // IDs of candidate accounts if ambiguous

  /** Smart Category Resolution */
  suggestedCategoryId?: string;
  suggestedCategoryName?: string;
  categoryMatchConfidence?: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  categoryMatchReason?: string;

  /** Helpers for prefilling user forms */
  suggestedDescription: string;
  formattedNotes: string;
  tags: string[];

  /** Optional itemized line items extracted from invoices or physical receipts */
  items?: ReceiptLineItem[];

  /** Image metadata if available */
  receiptImageUrl?: string;
}

export interface ReceiptLineItem {
  description: string;
  quantity?: number | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
}

export interface ScanReceiptRequest {
  image: string; // Base64 data URL or public URL
  accounts?: AccountCandidate[];
  categories?: CategoryCandidate[];
  expectedType?: ScannedReceiptType;
}

export interface ScanReceiptResponse {
  success: boolean;
  data?: ScannedReceiptResult;
  error?: string;
}
