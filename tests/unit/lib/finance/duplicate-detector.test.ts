import {
  normalizeReference,
  detectHistoryDuplicate,
  detectIntraBatchDuplicates,
  type DuplicateCandidate,
} from '@/lib/finance/duplicate-detector';
import type { Transaction } from '@/types/domain';
import { TransactionType } from '@/types/domain';

describe('Duplicate Detector Utility', () => {
  describe('normalizeReference', () => {
    it('strips leading zeroes', () => {
      expect(normalizeReference('0028491823')).toBe('28491823');
      expect(normalizeReference('000123')).toBe('123');
    });

    it('strips dashes, hashes, and non-alphanumerics', () => {
      expect(normalizeReference('#ZN-8839210')).toBe('zn8839210');
      expect(normalizeReference('Ref: 04928172')).toBe('ref04928172');
      expect(normalizeReference('0492-8172')).toBe('4928172');
    });

    it('handles null, undefined, or empty values safely', () => {
      expect(normalizeReference(null)).toBe('');
      expect(normalizeReference(undefined)).toBe('');
      expect(normalizeReference('')).toBe('');
      expect(normalizeReference('   ')).toBe('');
    });
  });

  describe('detectHistoryDuplicate', () => {
    const mockExistingTransactions: Transaction[] = [
      {
        id: 'tx-1',
        type: TransactionType.EXPENSE,
        accountId: 'acc-banesco-ves',
        currencyCode: 'VES',
        amountMinor: 150000,
        amountBaseMinor: 150000,
        exchangeRate: 1,
        date: '2026-09-11',
        description: 'Almuerzo',
        note: 'Comprobante Ref: 04928172\n• Banco: Banesco',
        tags: ['pago-movil', 'comprobante-ia'],
        createdAt: '2026-09-11T10:00:00Z',
        updatedAt: '2026-09-11T10:00:00Z',
      },
      {
        id: 'tx-2',
        type: TransactionType.EXPENSE,
        accountId: 'acc-zinli-usd',
        currencyCode: 'USD',
        amountMinor: 3500,
        amountBaseMinor: 3500,
        exchangeRate: 1,
        date: '2026-09-10',
        description: 'Envío Zinli',
        note: 'Transacción #ZN-8839210',
        tags: ['zinli'],
        createdAt: '2026-09-10T15:00:00Z',
        updatedAt: '2026-09-10T15:00:00Z',
      },
      {
        id: 'tx-3',
        type: TransactionType.EXPENSE,
        accountId: 'acc-bdv-ves',
        currencyCode: 'VES',
        amountMinor: 38050,
        amountBaseMinor: 38050,
        exchangeRate: 1,
        date: '2026-09-09',
        description: 'Farmacia',
        createdAt: '2026-09-09T12:00:00Z',
        updatedAt: '2026-09-09T12:00:00Z',
      },
    ];

    it('detects duplicate by exact reference match in note (even with leading zero variance)', () => {
      const candidate: DuplicateCandidate = {
        referenceId: '04928172',
        amountMinor: 150000,
        currencyCode: 'VES',
        date: '2026-09-11',
        accountId: 'acc-banesco-ves',
      };

      const result = detectHistoryDuplicate(
        candidate,
        mockExistingTransactions
      );
      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('EXACT_REFERENCE');
      expect(result.matchedTransaction?.id).toBe('tx-1');
      expect(result.reason).toContain('04928172');
    });

    it('detects duplicate by Zinli reference with prefix', () => {
      const candidate: DuplicateCandidate = {
        referenceId: 'ZN-8839210',
        amountMinor: 3500,
        currencyCode: 'USD',
        date: '2026-09-10',
      };

      const result = detectHistoryDuplicate(
        candidate,
        mockExistingTransactions
      );
      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('EXACT_REFERENCE');
      expect(result.matchedTransaction?.id).toBe('tx-2');
    });

    it('detects duplicate by fingerprint when reference is missing but account, date, and amount match', () => {
      const candidate: DuplicateCandidate = {
        referenceId: undefined,
        amountMinor: 38050,
        currencyCode: 'VES',
        date: '2026-09-09',
        accountId: 'acc-bdv-ves',
      };

      const result = detectHistoryDuplicate(
        candidate,
        mockExistingTransactions
      );
      expect(result.isDuplicate).toBe(true);
      expect(result.matchType).toBe('HIGH_FINGERPRINT');
      expect(result.matchedTransaction?.id).toBe('tx-3');
    });

    it('returns isDuplicate false for an unrelated new transaction', () => {
      const candidate: DuplicateCandidate = {
        referenceId: '99887766',
        amountMinor: 95000,
        currencyCode: 'VES',
        date: '2026-09-11',
        accountId: 'acc-banesco-ves',
      };

      const result = detectHistoryDuplicate(
        candidate,
        mockExistingTransactions
      );
      expect(result.isDuplicate).toBe(false);
      expect(result.matchedTransaction).toBeUndefined();
    });

    it('returns isDuplicate false when existing transactions list is empty', () => {
      const candidate: DuplicateCandidate = {
        referenceId: '04928172',
      };

      const result = detectHistoryDuplicate(candidate, []);
      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('detectIntraBatchDuplicates', () => {
    it('detects when two items in the same batch share the same reference number', () => {
      const batchItems: DuplicateCandidate[] = [
        {
          id: 'item-1',
          referenceId: '04928172',
          fileName: 'banesco-1.png',
          fileSize: 10240,
        },
        {
          id: 'item-2',
          referenceId: '99281029',
          fileName: 'mercantil.png',
          fileSize: 15200,
        },
        {
          id: 'item-3',
          referenceId: '04928172', // Same reference as item-1
          fileName: 'banesco-copy.png',
          fileSize: 10400,
        },
      ];

      const dupMap = detectIntraBatchDuplicates(batchItems);
      expect(dupMap.has('item-1')).toBe(false); // First is original
      expect(dupMap.has('item-2')).toBe(false); // Distinct
      expect(dupMap.has('item-3')).toBe(true); // Duplicate of item-1
      expect(dupMap.get('item-3')?.matchedIndex).toBe(0);
      expect(dupMap.get('item-3')?.matchType).toBe('INTRA_BATCH_REFERENCE');
    });

    it('detects when the same file is selected twice in the same batch', () => {
      const batchItems: DuplicateCandidate[] = [
        {
          id: 'item-a',
          referenceId: undefined, // Scan pending
          fileName: 'recibo.jpg',
          fileSize: 45000,
        },
        {
          id: 'item-b',
          referenceId: undefined, // Scan pending
          fileName: 'recibo.jpg', // Duplicate file selection
          fileSize: 45000,
        },
      ];

      const dupMap = detectIntraBatchDuplicates(batchItems);
      expect(dupMap.has('item-a')).toBe(false);
      expect(dupMap.has('item-b')).toBe(true);
      expect(dupMap.get('item-b')?.matchType).toBe('INTRA_BATCH_FILE');
    });
  });
});
