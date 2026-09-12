import type { Transaction } from '@/types/domain';

export interface DuplicateCandidate {
  id?: string;
  referenceId?: string | null;
  amountMinor?: number | null;
  currencyCode?: string | null;
  date?: string | null; // YYYY-MM-DD
  accountId?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
}

export type DuplicateMatchType =
  | 'EXACT_REFERENCE'
  | 'HIGH_FINGERPRINT'
  | 'SUSPECTED_DATE_AMOUNT'
  | 'INTRA_BATCH_REFERENCE'
  | 'INTRA_BATCH_FILE';

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  matchType?: DuplicateMatchType;
  matchedTransaction?: Transaction;
  matchedIndex?: number;
  reason?: string;
}

/**
 * Normalizes reference IDs for comparison:
 * - Removes leading zeros: "0028491823" -> "28491823"
 * - Removes punctuation, dashes, spaces: "#ZN-8839210" -> "zn8839210"
 * - Converts to lowercase
 */
export function normalizeReference(ref?: string | null): string {
  if (!ref) return '';
  return ref
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^0+/, '');
}

/**
 * Checks if a single candidate receipt matches an existing transaction in the user's history.
 */
export function detectHistoryDuplicate(
  candidate: DuplicateCandidate,
  existingTransactions: Transaction[]
): DuplicateDetectionResult {
  if (!existingTransactions || existingTransactions.length === 0) {
    return { isDuplicate: false };
  }

  const normCandidateRef = normalizeReference(candidate.referenceId);
  const hasValidRef = normCandidateRef.length >= 4;

  for (const tx of existingTransactions) {
    // 1. Exact Reference Match in note, description, or tags
    if (hasValidRef) {
      const txNote = (tx.note || '').toLowerCase();
      const txDesc = (tx.description || '').toLowerCase();
      const txTags = (tx.tags || []).map((t) => t.toLowerCase()).join(' ');

      const normTx = `${txNote} ${txDesc} ${txTags}`.replace(/[^a-z0-9]/g, '');

      if (normTx.includes(normCandidateRef)) {
        return {
          isDuplicate: true,
          matchType: 'EXACT_REFERENCE',
          matchedTransaction: tx,
          reason: `Ya existe una transacción con la referencia ${candidate.referenceId} registrada el ${tx.date}.`,
        };
      }
    }

    // 2. High Fingerprint Match: Same account + same date + same amountMinor + same currency
    if (
      candidate.amountMinor !== null &&
      candidate.amountMinor !== undefined &&
      candidate.amountMinor > 0 &&
      candidate.currencyCode &&
      candidate.date &&
      candidate.accountId &&
      tx.accountId === candidate.accountId &&
      tx.date === candidate.date &&
      tx.amountMinor === candidate.amountMinor &&
      tx.currencyCode?.toUpperCase() === candidate.currencyCode.toUpperCase()
    ) {
      return {
        isDuplicate: true,
        matchType: 'HIGH_FINGERPRINT',
        matchedTransaction: tx,
        reason: `Misma cuenta, fecha (${candidate.date}) y monto exacto en tu historial.`,
      };
    }

    // 3. Suspected Date & Amount Match (even if account is not yet selected, but currency matches)
    if (
      !hasValidRef &&
      candidate.amountMinor !== null &&
      candidate.amountMinor !== undefined &&
      candidate.amountMinor > 0 &&
      candidate.currencyCode &&
      candidate.date &&
      tx.date === candidate.date &&
      tx.amountMinor === candidate.amountMinor &&
      tx.currencyCode?.toUpperCase() === candidate.currencyCode.toUpperCase()
    ) {
      return {
        isDuplicate: true,
        matchType: 'SUSPECTED_DATE_AMOUNT',
        matchedTransaction: tx,
        reason: `Coincidencia exacta de fecha (${candidate.date}) y monto en tu historial.`,
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Checks for duplicates across items within the same batch.
 * If two items share the same reference or file, the latter item is flagged as a duplicate.
 */
export function detectIntraBatchDuplicates<T extends DuplicateCandidate>(
  items: T[]
): Map<string, DuplicateDetectionResult> {
  const duplicateMap = new Map<string, DuplicateDetectionResult>();

  for (let i = 0; i < items.length; i++) {
    const current = items[i];
    const currentRef = normalizeReference(current.referenceId);
    const hasValidRef = currentRef.length >= 4;

    for (let j = 0; j < i; j++) {
      const prev = items[j];
      const prevRef = normalizeReference(prev.referenceId);

      // Check identical reference
      if (hasValidRef && prevRef.length >= 4 && currentRef === prevRef) {
        duplicateMap.set(current.id || String(i), {
          isDuplicate: true,
          matchType: 'INTRA_BATCH_REFERENCE',
          matchedIndex: j,
          reason: `Misma referencia (${current.referenceId}) que el Comprobante #${j + 1} en este lote.`,
        });
        break;
      }

      // Check identical file (name + size)
      if (
        current.fileName &&
        prev.fileName &&
        current.fileName === prev.fileName &&
        current.fileSize &&
        prev.fileSize &&
        current.fileSize === prev.fileSize
      ) {
        duplicateMap.set(current.id || String(i), {
          isDuplicate: true,
          matchType: 'INTRA_BATCH_FILE',
          matchedIndex: j,
          reason: `Mismo archivo (${current.fileName}) que el Comprobante #${j + 1} en este lote.`,
        });
        break;
      }
    }
  }

  return duplicateMap;
}
