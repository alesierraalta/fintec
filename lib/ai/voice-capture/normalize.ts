import { parseStatementDate } from '@/lib/finance/statement-import';

export const MAX_CAPTURED_TRANSACTIONS = 200;
const DEFAULT_DESCRIPTION = 'Movimiento';

export type CapturedType = 'EXPENSE' | 'INCOME';
export type CapturedConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

/** Shape the model returns for each movement it finds. */
export interface RawCapturedTransaction {
  date: string | null;
  amount: number;
  currency: string;
  type: CapturedType;
  description: string;
  suggestedCategoryId: string | null;
  suggestedAccountId: string | null;
  sourceImage: number | null;
  confidence: CapturedConfidence;
}

export interface CapturedTransaction {
  date: string;
  /** True when the model gave no usable date and today was used instead. */
  dateInferred: boolean;
  amount: number;
  currency: string;
  type: CapturedType;
  description: string;
  categoryId: string | null;
  accountId: string | null;
  sourceImage: number | null;
  confidence: CapturedConfidence;
}

export interface NormalizeContext {
  accounts: { id: string; currencyCode: string }[];
  categories: { id: string; kind: CapturedType }[];
  today: string;
  imageCount: number;
}

/**
 * Turns untrusted model output into reviewable movements: drops non-positive
 * amounts, keeps only account/category ids owned by the user (and categories
 * of the matching kind), and repairs dates, text and image indexes.
 */
export function normalizeCapturedTransactions(
  raw: RawCapturedTransaction[],
  ctx: NormalizeContext
): CapturedTransaction[] {
  const accountIds = new Set(ctx.accounts.map((a) => a.id));
  const categoryKinds = new Map(ctx.categories.map((c) => [c.id, c.kind]));
  const result: CapturedTransaction[] = [];

  for (const item of raw) {
    if (result.length >= MAX_CAPTURED_TRANSACTIONS) break;
    if (!Number.isFinite(item.amount) || item.amount <= 0) continue;

    const ownAccountId =
      item.suggestedAccountId && accountIds.has(item.suggestedAccountId)
        ? item.suggestedAccountId
        : null;
    const ownAccount = ctx.accounts.find((a) => a.id === ownAccountId);

    let currency = (item.currency ?? '').trim().toUpperCase();
    if (!/^[A-Z]{3,5}$/.test(currency)) {
      currency = ownAccount?.currencyCode ?? 'USD';
    }

    const sameCurrency = ctx.accounts.filter(
      (a) => a.currencyCode === currency
    );
    const accountId =
      ownAccountId ?? (sameCurrency.length === 1 ? sameCurrency[0].id : null);

    const categoryId =
      item.suggestedCategoryId &&
      categoryKinds.get(item.suggestedCategoryId) === item.type
        ? item.suggestedCategoryId
        : null;

    const date = item.date ? parseStatementDate(item.date) : null;
    const sourceImage =
      Number.isInteger(item.sourceImage) &&
      (item.sourceImage as number) >= 0 &&
      (item.sourceImage as number) < ctx.imageCount
        ? item.sourceImage
        : null;

    result.push({
      date: date ?? ctx.today,
      dateInferred: date === null,
      amount: item.amount,
      currency,
      type: item.type,
      description: item.description?.trim() || DEFAULT_DESCRIPTION,
      categoryId,
      accountId,
      sourceImage,
      confidence: item.confidence,
    });
  }

  return result;
}
