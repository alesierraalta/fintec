/**
 * #117: receipt photos are matched to the amount-less expenses the user
 * announced in the chat ("hice 3 gastos, te paso los tickets").
 */
import { matchReceiptsToPending } from '@/lib/ai/receipts/match-pending';

const pending = (id: string, name: string) => ({ id, name });
const scan = (index: number, text: string) => ({ index, text });

describe('matchReceiptsToPending (#117)', () => {
  it('pairs each receipt with the pending expense it describes, whatever the upload order', () => {
    const result = matchReceiptsToPending(
      [
        pending('p-farm', 'Farmacia'),
        pending('p-mkt', 'Mercado'),
        pending('p-gas', 'Gasolina'),
      ],
      [
        scan(0, 'Gasolinera PDV gasolina 95'),
        scan(1, 'Farmatodo farmacia'),
        scan(2, 'Mercado Central Madeirense'),
      ]
    );

    expect(result.assignments).toEqual([
      { scanIndex: 0, pendingId: 'p-gas', reason: 'description' },
      { scanIndex: 1, pendingId: 'p-farm', reason: 'description' },
      { scanIndex: 2, pendingId: 'p-mkt', reason: 'description' },
    ]);
    expect(result.unmatchedScans).toEqual([]);
    expect(result.unmatchedPending).toEqual([]);
  });

  it('fills generic placeholders ("Gasto 1", "Gasto 2") in upload order', () => {
    const result = matchReceiptsToPending(
      [pending('p-1', 'Gasto 1'), pending('p-2', 'Gasto 2')],
      [scan(0, 'Panadería La Espiga'), scan(1, 'Ferretería EPA')]
    );

    expect(result.assignments).toEqual([
      { scanIndex: 0, pendingId: 'p-1', reason: 'order' },
      { scanIndex: 1, pendingId: 'p-2', reason: 'order' },
    ]);
  });

  it('never assigns two receipts to the same pending expense, and reports what is left', () => {
    const result = matchReceiptsToPending(
      [pending('p-farm', 'Farmacia')],
      [
        scan(0, 'Farmatodo farmacia'),
        scan(1, 'Farmacia SAAS'),
        scan(2, 'Ferretería EPA'),
      ]
    );

    expect(result.assignments).toEqual([
      { scanIndex: 0, pendingId: 'p-farm', reason: 'description' },
    ]);
    expect(result.unmatchedScans).toEqual([1, 2]);
    expect(result.unmatchedPending).toEqual([]);
  });

  it('leaves a named pending expense open when no receipt resembles it', () => {
    const result = matchReceiptsToPending(
      [pending('p-farm', 'Farmacia'), pending('p-1', 'Gasto 1')],
      [scan(0, 'Ferretería EPA')]
    );

    expect(result.assignments).toEqual([
      { scanIndex: 0, pendingId: 'p-1', reason: 'order' },
    ]);
    expect(result.unmatchedPending).toEqual(['p-farm']);
  });
});
