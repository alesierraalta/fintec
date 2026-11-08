import { RECONCILIATION_DESCRIPTION } from '@/lib/finance/reconciliation';
import type { Transaction } from '@/types/domain';
/** A past transaction of the user and the category they chose for it. */
export interface CaptureHistoryHint {
  description: string;
  category: string;
}

export const MAX_HISTORY_HINTS = 300;
// Recent transactions scanned for the user's own categorization convention.
// Evals: history in the prompt fixed 6/6 personal-convention cases vs 0/6.
export const HISTORY_LOOKBACK = 1000;
export const MAX_HINT_CHARS = 80;

/**
 * History text is user data (imported statements, earlier captures): it is
 * flattened to one line, capped, and JSON-quoted so it can never add prompt
 * lines or forge another "description -> category" mapping.
 */
function hintText(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return JSON.stringify(
    flat.length > MAX_HINT_CHARS
      ? `${flat.slice(0, MAX_HINT_CHARS - 1)}…`
      : flat
  );
}

/**
 * Prompt section with the user's distinct "description -> category"
 * conventions, or an empty string when there is no history. Shared by voice
 * capture and the chat agent.
 */
export function formatHistoryHints(history: CaptureHistoryHint[] = []): string {
  const hints = [
    ...new Set(
      history.map(
        (h) => `${hintText(h.description)} -> ${hintText(h.category)}`
      )
    ),
  ].slice(0, MAX_HISTORY_HINTS);
  if (hints.length === 0) return '';
  return (
    "The user's past transactions and the category they chose. When a movement matches one of them, follow the user's convention over a generic category:\n" +
    hints.map((hint) => `- ${hint}`).join('\n')
  );
}

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
