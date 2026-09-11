import { generateObject } from 'ai';
import { z } from 'zod';
import { getAIModel, AI_CONFIG } from '@/lib/ai/config';
import { CircuitBreaker } from '@/lib/ai/recovery/circuit-breaker';
import { logger } from '@/lib/utils/logger';
import { matchReceiptAccounts } from './account-matcher';
import type {
  AccountCandidate,
  ScannedReceiptResult,
  ScannedReceiptType,
} from './types';

const circuitBreaker = new CircuitBreaker(
  `${AI_CONFIG.provider}_receipt_scanner`
);

/**
 * Zod schema for structured output from the LLM
 */
export const receiptExtractionSchema = z.object({
  type: z
    .enum(['EXPENSE', 'INCOME', 'TRANSFER'])
    .describe(
      'Transaction type: EXPENSE if paid/debited/sent, INCOME if received/credited, TRANSFER if exchanging between currencies/accounts (e.g. Binance P2P buying or selling USDT, crypto conversion, or bank account transfer)'
    ),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('HIGH'),
  amount: z
    .number()
    .positive()
    .describe(
      'Main transaction amount in major units (e.g. 1500.50). Must be positive.'
    ),
  currency: z
    .string()
    .default('VES')
    .describe(
      'ISO 4217 currency code (e.g. VES, USD, USDT, EUR). Default VES for Venezuelan Pago Móvil.'
    ),
  targetAmount: z
    .number()
    .positive()
    .optional()
    .describe(
      'For currency exchange (e.g. Binance P2P): secondary amount received or sent (e.g. 1825.00 VES when selling 50.00 USDT)'
    ),
  targetCurrency: z
    .string()
    .optional()
    .describe(
      'For currency exchange: secondary currency code (e.g. VES if converting USD/USDT to VES)'
    ),
  exchangeRate: z
    .number()
    .positive()
    .optional()
    .describe('Explicit or calculated exchange rate (e.g. VES per USD/USDT)'),
  fee: z
    .number()
    .nonnegative()
    .optional()
    .describe(
      'Fee or commission charged by bank, exchange, or platform (e.g. 0.06 USDT on Binance P2P, or banking commission in VES/USD)'
    ),
  feeCurrency: z
    .string()
    .optional()
    .describe('Currency of the fee (e.g. USDT, VES, USD)'),
  netAmount: z
    .number()
    .positive()
    .optional()
    .describe(
      'Net amount received or released after deducting fees (e.g. 42.66 USDT if total was 42.72 and fee was 0.06)'
    ),
  date: z
    .string()
    .describe(
      'Transaction date in ISO format YYYY-MM-DD. If missing year, use current year.'
    ),
  time: z
    .string()
    .optional()
    .describe('Transaction time in HH:mm 24h format if visible'),
  referenceId: z
    .string()
    .optional()
    .describe(
      'Transaction confirmation reference code, bank reference number, or Binance order ID'
    ),
  paymentMethod: z
    .string()
    .optional()
    .describe(
      'Payment method: "Pago Móvil", "Binance P2P", "Transferencia Bancaria", "Zelle", "Punto de Venta", etc.'
    ),
  bankOrPlatform: z
    .string()
    .optional()
    .describe(
      'Bank or platform name: "Banesco", "Banco de Venezuela", "Mercantil", "Provincial", "Binance", "BNC", "Bancaribe", etc.'
    ),
  counterpartyName: z
    .string()
    .optional()
    .describe('Beneficiary, merchant, or sender name if shown'),
  counterpartyId: z
    .string()
    .optional()
    .describe('Cédula, RIF (e.g. V-12345678, J-12345678), or Tax ID'),
  counterpartyPhone: z
    .string()
    .optional()
    .describe('Phone number if Pago Móvil (e.g. 0414-1234567)'),
  counterpartyBank: z
    .string()
    .optional()
    .describe('Counterparty bank name if visible'),
  suggestedMotive: z
    .string()
    .optional()
    .describe(
      'Original motive/concept/description written in receipt if any, or brief description'
    ),
  suggestedCategory: z
    .string()
    .optional()
    .describe(
      'Suggested broad category: Alimentación, Servicios, Transporte, Compras, Inversiones, Salud, etc.'
    ),
  tags: z
    .array(z.string())
    .default([])
    .describe(
      'Relevant tags: e.g. ["pago-movil", "banesco", "ves"] or ["binance-p2p", "usdt"]'
    ),
});

export type RawReceiptExtraction = z.infer<typeof receiptExtractionSchema>;

const SYSTEM_INSTRUCTION = `You are a financial receipt and screenshot OCR extraction engine specialized in Venezuelan banking, payment systems, and cryptocurrency exchanges.

Your goal is to accurately read and classify financial transaction screenshots, such as:
1. Venezuelan Pago Móvil receipts (Banco de Venezuela BDV, Banesco, Mercantil, Provincial BBVA, BNC, Bancaribe, Bancamiga, etc.).
   - If the receipt says "Operación exitosa", "Transferido a", "Débito", "Pago realizado", "Monto debitado", classify as EXPENSE.
   - If the receipt says "Crédito", "Abono", "Pago móvil recibido", "Has recibido un pago", classify as INCOME.
   - Currency is usually VES (Bolívares / Bs.).
   - Look for: Número de referencia, Fecha y hora, Banco emisor, Banco destino, Cédula/RIF, Teléfono, Monto.

2. Cryptocurrency / Exchange screenshots (Binance P2P, Binance Convert, El Dorado, etc.):
   - If the screenshot shows a P2P trade (e.g. "Vender USDT" / "Sell USDT" for Bolívares or "Comprar USDT" / "Buy USDT" with Bolívares), classify as TRANSFER (currency exchange).
   - For "Sell USDT":
     - amount: Total crypto sold (e.g. 42.72), currency: "USDT".
     - targetAmount: Fiat amount received (e.g. 41000), targetCurrency: "VES" (Bs).
     - exchangeRate: Price per unit (e.g. 961.05).
     - fee: Any platform commission shown (e.g. "Fee: 0.06 USDT" -> fee: 0.06, feeCurrency: "USDT").
     - netAmount: The release quantity if distinct (e.g. "Release Quantity: 42.66 USDT" -> netAmount: 42.66).
     - paymentMethod: "Binance P2P".
     - bankOrPlatform: "Binance".
     - counterpartyBank: The destination bank name (e.g. "Mercantil VES" -> counterpartyBank: "Mercantil").
   - Extract the Binance Order ID as referenceId.

3. Point of sale / Invoice / Zelle / Bank Transfer screenshots:
   - Identify whether money exited (EXPENSE) or entered (INCOME).
   - Extract exact numeric amount and currency.
   - Always extract any fee/comisión if present (e.g. bank fee, network fee, IVA/ITF).

Always return clean, validated data. If a field is not present in the image, leave it null/undefined.`;

function formatReceiptNotes(raw: RawReceiptExtraction): string {
  const lines: string[] = ['🧾 Comprobante analizado con IA'];

  if (raw.referenceId) {
    lines.push(`• Referencia: ${raw.referenceId}`);
  }
  if (raw.paymentMethod) {
    lines.push(`• Método: ${raw.paymentMethod}`);
  }
  if (raw.bankOrPlatform) {
    lines.push(`• Banco/Plataforma: ${raw.bankOrPlatform}`);
  }
  if (raw.counterpartyName || raw.counterpartyId || raw.counterpartyPhone) {
    const parts = [
      raw.counterpartyName,
      raw.counterpartyId ? `CI/RIF: ${raw.counterpartyId}` : null,
      raw.counterpartyPhone ? `Telf: ${raw.counterpartyPhone}` : null,
    ].filter(Boolean);
    lines.push(`• Beneficiario/Contraparte: ${parts.join(' - ')}`);
  }
  if (raw.date) {
    lines.push(
      `• Fecha comprobante: ${raw.date}${raw.time ? ' ' + raw.time : ''}`
    );
  }
  if (raw.exchangeRate) {
    lines.push(`• Tasa calculada: ${raw.exchangeRate.toFixed(4)}`);
  }
  if (raw.fee !== undefined && raw.fee > 0) {
    lines.push(
      `• Comisión / Fee: ${raw.fee} ${raw.feeCurrency || raw.currency || ''}`
    );
  }
  if (raw.netAmount) {
    lines.push(`• Monto neto (Release): ${raw.netAmount} ${raw.currency}`);
  }
  if (raw.suggestedMotive) {
    lines.push(`• Concepto original: ${raw.suggestedMotive}`);
  }

  return lines.join('\n');
}

/**
 * Scan a receipt image using multimodal LLM and perform smart account matching.
 */
export async function scanReceiptWithAI(params: {
  image: string; // Base64 data URL or URL
  accounts?: AccountCandidate[];
  expectedType?: ScannedReceiptType;
}): Promise<ScannedReceiptResult> {
  const { image, accounts = [], expectedType } = params;

  return await circuitBreaker.execute(async () => {
    const model = getAIModel();

    let userPrompt =
      'Please extract all financial transaction details from this receipt screenshot.';
    if (expectedType) {
      userPrompt += ` The user expects this to be a ${expectedType}.`;
    }
    if (accounts.length > 0) {
      const accountsSummary = accounts
        .map(
          (a) => `• ID: ${a.id}, Nombre: "${a.name}", Moneda: ${a.currencyCode}`
        )
        .join('\n');
      userPrompt += `\n\nThe user has the following registered accounts/wallets:\n${accountsSummary}\nHelp infer which account is most relevant if mentioned in the screenshot.`;
    }

    logger.info('[ReceiptScanner] Sending image to AI for extraction...');

    const result = await generateObject({
      model,
      schema: receiptExtractionSchema,
      messages: [
        {
          role: 'system',
          content: SYSTEM_INSTRUCTION,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt,
            },
            {
              type: 'image',
              image: image,
            },
          ],
        },
      ],
    });

    const raw = result.object;

    // Calculate exchange rate if missing but both amounts exist
    let exchangeRate = raw.exchangeRate;
    if (!exchangeRate && raw.amount && raw.targetAmount && raw.amount > 0) {
      exchangeRate = Number((raw.targetAmount / raw.amount).toFixed(6));
    }

    // Run smart account matching algorithm
    const match = matchReceiptAccounts(
      {
        type: raw.type,
        currency: raw.currency,
        targetCurrency: raw.targetCurrency,
        bankOrPlatform: raw.bankOrPlatform,
        paymentMethod: raw.paymentMethod,
        counterparty: {
          bank: raw.counterpartyBank,
        },
      },
      accounts
    );

    // Build suggested description / motive
    let suggestedDescription = raw.suggestedMotive || '';
    if (!suggestedDescription) {
      if (raw.type === 'TRANSFER') {
        const toCur = raw.targetCurrency || raw.currency;
        suggestedDescription = `Transferencia ${raw.paymentMethod || 'cambio'} ${raw.currency} a ${toCur}`;
      } else if (raw.paymentMethod) {
        suggestedDescription = `${raw.paymentMethod}${raw.bankOrPlatform ? ' ' + raw.bankOrPlatform : ''}`;
      } else {
        suggestedDescription =
          raw.type === 'EXPENSE' ? 'Gasto registrado' : 'Ingreso registrado';
      }
    }

    const formattedNotes = formatReceiptNotes(raw);

    // Combine tags
    const allTags = Array.from(
      new Set(
        [
          ...raw.tags,
          raw.paymentMethod?.toLowerCase().replace(/\s+/g, '-'),
          raw.bankOrPlatform?.toLowerCase().replace(/\s+/g, '-'),
          'comprobante-ia',
        ].filter(Boolean) as string[]
      )
    );

    const scannedResult: ScannedReceiptResult = {
      type: raw.type,
      confidence: raw.confidence,
      amount: raw.amount,
      currency: raw.currency.toUpperCase(),
      targetAmount: raw.targetAmount,
      targetCurrency: raw.targetCurrency?.toUpperCase(),
      exchangeRate,
      fee: raw.fee,
      feeCurrency:
        raw.feeCurrency?.toUpperCase() ||
        (raw.fee ? raw.currency.toUpperCase() : undefined),
      netAmount: raw.netAmount,
      date: raw.date,
      time: raw.time,
      referenceId: raw.referenceId,
      paymentMethod: raw.paymentMethod,
      bankOrPlatform: raw.bankOrPlatform,
      counterparty: {
        name: raw.counterpartyName,
        idNumber: raw.counterpartyId,
        phone: raw.counterpartyPhone,
        bank: raw.counterpartyBank,
      },
      suggestedAccountId: match.suggestedAccountId,
      suggestedToAccountId: match.suggestedToAccountId,
      accountMatchConfidence: match.confidence,
      accountMatchReason: match.reason,
      matchingAccountCandidates: match.candidateIds,
      suggestedDescription,
      suggestedCategoryName: raw.suggestedCategory,
      formattedNotes,
      tags: allTags,
    };

    logger.info('[ReceiptScanner] Successfully extracted receipt details', {
      type: scannedResult.type,
      amount: scannedResult.amount,
      currency: scannedResult.currency,
      referenceId: scannedResult.referenceId,
      accountConfidence: scannedResult.accountMatchConfidence,
    });

    return scannedResult;
  });
}
