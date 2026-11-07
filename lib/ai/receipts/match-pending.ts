import { trigramSimilarity } from '@/lib/ai/voice-capture/history-retrieval';

export interface PendingReceiptSlot {
  id: string;
  name: string;
}

export interface ScannedReceiptText {
  /** Position of the photo in the upload. */
  index: number;
  /** Merchant, motive and line items read from the receipt. */
  text: string;
}

export interface PendingReceiptMatch {
  assignments: Array<{
    scanIndex: number;
    pendingId: string;
    reason: 'description' | 'order';
  }>;
  unmatchedScans: number[];
  unmatchedPending: string[];
}

const MATCH_THRESHOLD = 0.6;
const GENERIC_NAME = /^gasto(\s*(#?\d+|sin nombre))?$/;

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Placeholder names the agent gives amount-less expenses ("Gasto 1"). */
export function isGenericPendingName(name: string): boolean {
  return GENERIC_NAME.test(fold(name));
}

/** Mean, over the pending name's words, of the best word match in the receipt. */
function similarity(name: string, receiptText: string): number {
  const nameWords = fold(name)
    .split(' ')
    .filter((w) => w.length >= 3);
  const receiptWords = fold(receiptText).split(' ').filter(Boolean);
  if (nameWords.length === 0 || receiptWords.length === 0) return 0;
  const total = nameWords.reduce(
    (sum, word) =>
      sum + Math.max(...receiptWords.map((r) => trigramSimilarity(word, r))),
    0
  );
  return total / nameWords.length;
}

/**
 * Assigns each scanned receipt to at most one pending expense: named pending
 * items take the most similar receipt, then generic placeholders take the
 * remaining receipts in upload order. Nothing is ever assigned twice.
 */
export function matchReceiptsToPending(
  pending: PendingReceiptSlot[],
  scans: ScannedReceiptText[]
): PendingReceiptMatch {
  const named = pending.filter((p) => !isGenericPendingName(p.name));
  const generic = pending.filter((p) => isGenericPendingName(p.name));

  const candidates = named
    .flatMap((p) =>
      scans.map((s) => ({
        pendingId: p.id,
        scanIndex: s.index,
        score: similarity(p.name, s.text),
      }))
    )
    .filter((c) => c.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score || a.scanIndex - b.scanIndex);

  const usedScans = new Set<number>();
  const usedPending = new Set<string>();
  const assignments: PendingReceiptMatch['assignments'] = [];
  for (const c of candidates) {
    if (usedScans.has(c.scanIndex) || usedPending.has(c.pendingId)) continue;
    usedScans.add(c.scanIndex);
    usedPending.add(c.pendingId);
    assignments.push({
      scanIndex: c.scanIndex,
      pendingId: c.pendingId,
      reason: 'description',
    });
  }

  const openGeneric = generic.filter((p) => !usedPending.has(p.id));
  for (const s of [...scans].sort((a, b) => a.index - b.index)) {
    if (usedScans.has(s.index) || openGeneric.length === 0) continue;
    const slot = openGeneric.shift()!;
    usedScans.add(s.index);
    usedPending.add(slot.id);
    assignments.push({
      scanIndex: s.index,
      pendingId: slot.id,
      reason: 'order',
    });
  }

  return {
    assignments: assignments.sort((a, b) => a.scanIndex - b.scanIndex),
    unmatchedScans: scans
      .map((s) => s.index)
      .filter((i) => !usedScans.has(i))
      .sort((a, b) => a - b),
    unmatchedPending: pending
      .map((p) => p.id)
      .filter((id) => !usedPending.has(id)),
  };
}
