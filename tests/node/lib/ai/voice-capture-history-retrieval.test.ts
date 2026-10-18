import {
  cosineSimilarity,
  embeddingNeighbors,
  lexicalNeighbors,
  recategorize,
  trigramSimilarity,
} from '@/lib/ai/voice-capture/history-retrieval';
import type { CapturedTransaction } from '@/lib/ai/voice-capture/normalize';

const history = [
  { description: 'Pago a María Pérez', category: 'Alquiler' },
  { description: 'Farmacia SAAS', category: 'Salud' },
  { description: 'Cines Unidos', category: 'Salidas con pareja' },
  { description: 'Sueldo octubre', category: 'Salario' },
];

const categories = [
  { id: 'alquiler', name: 'Alquiler', kind: 'EXPENSE' as const },
  { id: 'transfer', name: 'Transferencias', kind: 'EXPENSE' as const },
  { id: 'salud', name: 'Salud', kind: 'EXPENSE' as const },
  { id: 'salario', name: 'Salario', kind: 'INCOME' as const },
];

const movement = (o: Partial<CapturedTransaction>): CapturedTransaction => ({
  date: '2026-10-03',
  dateInferred: false,
  amount: 100,
  currency: 'VES',
  type: 'EXPENSE',
  description: 'Pago',
  categoryId: 'transfer',
  accountId: null,
  sourceImage: 0,
  confidence: 'HIGH',
  merchant: 'PAGO MOVIL MARIA PEREZ',
  ...o,
});

describe('trigramSimilarity', () => {
  it('is 1 for texts equal after folding accents and case', () => {
    expect(trigramSimilarity('María Pérez', 'MARIA PEREZ')).toBe(1);
  });
  it('is symmetric, in [0,1], and 0 for unrelated or empty text', () => {
    const ab = trigramSimilarity('Farmatodo', 'Farmacia SAAS');
    expect(ab).toBe(trigramSimilarity('Farmacia SAAS', 'Farmatodo'));
    expect(ab).toBeGreaterThan(0);
    expect(ab).toBeLessThan(1);
    expect(trigramSimilarity('xyz', 'Cines')).toBe(0);
    expect(trigramSimilarity('', 'Cines')).toBe(0);
  });
});

describe('cosineSimilarity', () => {
  it('handles parallel, orthogonal and zero vectors', () => {
    expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('lexicalNeighbors', () => {
  it('ranks the closest history description first', () => {
    const [best] = lexicalNeighbors('PAGO MOVIL MARIA PEREZ', history, 2);
    expect(best.category).toBe('Alquiler');
    expect(lexicalNeighbors('x', history, 2)).toHaveLength(2);
  });
});

describe('embeddingNeighbors', () => {
  it('ranks by cosine using the injected embedder and caches documents', async () => {
    const vectors: Record<string, number[]> = {
      'Pago a María Pérez': [1, 0, 0],
      'Farmacia SAAS': [0, 1, 0],
      'Cines Unidos': [0, 0, 1],
      'Sueldo octubre': [0.5, 0.5, 0],
      FARMATODO: [0.1, 0.9, 0],
    };
    const embed = jest.fn(async (text: string) => vectors[text]);
    const cache = new Map<string, number[]>();
    const [best] = await embeddingNeighbors(
      'FARMATODO',
      history,
      1,
      embed,
      cache
    );
    expect(best).toMatchObject({ category: 'Salud' });
    await embeddingNeighbors('FARMATODO', history, 1, embed, cache);
    // 4 documents embedded once + the query twice.
    expect(embed).toHaveBeenCalledTimes(6);
  });
});

describe('recategorize', () => {
  it('applies the top neighbour category when it clears the threshold and matches the type', () => {
    const [tx] = recategorize(
      [movement({})],
      [
        [
          {
            description: 'Pago a María Pérez',
            category: 'Alquiler',
            score: 0.7,
          },
        ],
      ],
      categories,
      0.5
    );
    expect(tx.categoryId).toBe('alquiler');
  });

  it('keeps the model category below the threshold, for an unknown category, or a kind mismatch', () => {
    const result = recategorize(
      [
        movement({}),
        movement({}),
        movement({ type: 'INCOME', categoryId: 'salario' }),
      ],
      [
        [{ description: 'x', category: 'Alquiler', score: 0.3 }],
        [{ description: 'x', category: 'Gimnasio', score: 0.9 }],
        [{ description: 'x', category: 'Alquiler', score: 0.9 }],
      ],
      categories,
      0.5
    );
    expect(result.map((t) => t.categoryId)).toEqual([
      'transfer',
      'transfer',
      'salario',
    ]);
  });
});
