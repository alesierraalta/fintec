/**
 * Throughput of the deterministic capture code (no network).
 *
 *   npx tsx evals/voice-capture/bench-parsers.ts
 *
 * Inputs are generated from a seeded PRNG so runs are comparable. Each case
 * runs warm-up iterations, then reports the median and p95 of timed runs.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { performance } from 'node:perf_hooks';
import { parseQuickEntries } from '@/lib/finance/quick-entry';
import {
  guessColumnMapping,
  mapStatementRows,
  parseCsv,
} from '@/lib/finance/statement-import';
import { lexicalNeighbors } from '@/lib/ai/voice-capture/history-retrieval';
import {
  normalizeCapturedTransactions,
  type RawCapturedTransaction,
} from '@/lib/ai/voice-capture/normalize';
import { percentile } from './scoring';

function prng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const MERCHANTS = [
  'Farmatodo',
  'Locatel',
  'Pago móvil María Pérez',
  'Cinex Líder',
  'Ridery',
  'Yummy Rides',
  'Automercado Plaza',
  'Panadería La Mejor',
  'Movistar recarga',
  'Binance P2P',
  'Zelle John',
  'Gimnasio Fit',
  'Netflix',
  'Spotify',
  'CANTV',
];

function csv(rows: number, rand: () => number): string {
  const lines = ['Fecha;Referencia;Concepto;Débito;Crédito;Saldo'];
  for (let i = 0; i < rows; i++) {
    const day = String(1 + Math.floor(rand() * 28)).padStart(2, '0');
    const amount = (rand() * 5000).toFixed(2).replace('.', ',');
    const debit = rand() < 0.8;
    lines.push(
      `${day}/09/2026;${100000 + i};"${MERCHANTS[i % MERCHANTS.length]}";${debit ? amount : ''};${debit ? '' : amount};1.234,56`
    );
  }
  return lines.join('\n');
}

function quickText(items: number, rand: () => number): string {
  return Array.from(
    { length: items },
    (_, i) =>
      `${MERCHANTS[i % MERCHANTS.length]} ${(rand() * 50).toFixed(2).replace('.', ',')}`
  ).join(', ');
}

function rawMovements(n: number, rand: () => number): RawCapturedTransaction[] {
  return Array.from({ length: n }, (_, i) => ({
    date: `2026-09-${String(1 + (i % 28)).padStart(2, '0')}`,
    amount: Number((rand() * 100).toFixed(2)),
    currency: i % 3 === 0 ? 'Bs.' : 'USDT',
    type: i % 5 === 0 ? 'INCOME' : 'EXPENSE',
    description: MERCHANTS[i % MERCHANTS.length],
    suggestedCategoryId: i % 2 ? 'salud' : 'nope',
    suggestedAccountId: null,
    sourceImage: 0,
    confidence: 'HIGH',
    merchant: MERCHANTS[i % MERCHANTS.length],
  }));
}

function history(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    description: `${MERCHANTS[i % MERCHANTS.length]} ${i}`,
    category: i % 2 ? 'Salud' : 'Transporte',
  }));
}

function bench(name: string, size: number, fn: () => unknown, iterations = 15) {
  for (let i = 0; i < 3; i++) fn();
  const times: number[] = [];
  let sink = 0;
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    const out = fn();
    times.push(performance.now() - t0);
    sink += Array.isArray(out) ? out.length : 1; // keep results observable
  }
  const median = percentile(times, 0.5);
  return {
    name,
    size,
    medianMs: Number(median.toFixed(3)),
    p95Ms: Number(percentile(times, 0.95).toFixed(3)),
    perItemUs: Number(((median * 1000) / size).toFixed(3)),
    sink,
  };
}

const results = [];
for (const rows of [1_000, 10_000, 50_000]) {
  const text = csv(rows, prng(rows));
  results.push(
    bench(
      'statement csv: parse+map',
      rows,
      () => {
        const parsed = parseCsv(text);
        return mapStatementRows(parsed, guessColumnMapping(parsed[0]), {
          hasHeader: true,
        }).rows;
      },
      rows >= 50_000 ? 5 : 15
    )
  );
}
for (const items of [100, 1_000, 10_000]) {
  const text = quickText(items, prng(items));
  results.push(
    bench('quick entry: parse', items, () => parseQuickEntries(text).entries)
  );
}
const ctx = {
  accounts: [
    { id: 'usdt', currencyCode: 'USDT' },
    { id: 'ves', currencyCode: 'VES' },
  ],
  categories: [{ id: 'salud', kind: 'EXPENSE' as const }],
  today: '2026-10-17',
  imageCount: 1,
};
for (const n of [200, 10_000]) {
  const raw = rawMovements(n, prng(n));
  results.push(
    bench('capture normalize', n, () => normalizeCapturedTransactions(raw, ctx))
  );
}
for (const n of [100, 1_000, 10_000]) {
  const h = history(n);
  results.push(
    bench('lexical neighbours (1 query)', n, () =>
      lexicalNeighbors('FARMATODO C.A.', h, 3)
    )
  );
  results.push(
    bench(
      'lexical re-categorize 20 movements',
      n,
      () => MERCHANTS.slice(0, 20).map((m) => lexicalNeighbors(m, h, 3)),
      n >= 10_000 ? 5 : 15
    )
  );
}

console.log('| benchmark | size | median ms | p95 ms | µs / item |');
console.log('|---|---|---|---|---|');
for (const r of results) {
  console.log(
    `| ${r.name} | ${r.size} | ${r.medianMs} | ${r.p95Ms} | ${r.perItemUs} |`
  );
}
fs.writeFileSync(
  path.join(__dirname, 'bench-report.json'),
  JSON.stringify(
    { timestamp: new Date().toISOString(), node: process.version, results },
    null,
    2
  )
);
