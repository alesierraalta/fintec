import { RECONCILIATION_DESCRIPTION } from '@/lib/finance/reconciliation';
import type { Transaction } from '@/types/domain';
import { MAX_HISTORY_HINTS, type CaptureHistoryHint } from './capture-service';

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/**
 * Turns the user's past transactions (most recent first) into distinct
 * "description -> category" hints. Transfers, reconciliation adjustments and
 * rows without a description or a known category teach no convention.
 */
export function buildHistoryHints(
  transactions: Pick<
    Transaction,
    'description' | 'categoryId' | 'transferId'
  >[],
  categories: { id: string; name: string }[]
): CaptureHistoryHint[] {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const seen = new Set<string>();
  const hints: CaptureHistoryHint[] = [];
  for (const tx of transactions) {
    if (hints.length >= MAX_HISTORY_HINTS) break;
    const description = tx.description?.trim();
    const category = tx.categoryId ? names.get(tx.categoryId) : undefined;
    if (!description || !category || tx.transferId) continue;
    if (description === RECONCILIATION_DESCRIPTION) continue;
    const key = `${fold(description)}\u0000${category}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hints.push({ description, category });
  }
  return hints;
}
