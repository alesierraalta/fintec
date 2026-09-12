import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

import { toMinorUnits } from '@/lib/money';
import type {
  ReceiptEvalCase,
  ReceiptEvalCaseResult,
  ReceiptEvalFieldScore,
  ReceiptEvalSummary,
} from './types';

const DATASET_DIR = path.resolve(
  process.cwd(),
  'evals/receipt-scanner/dataset'
);
const IMAGES_DIR = path.join(DATASET_DIR, 'images');
const GT_PATH = path.join(DATASET_DIR, 'ground-truth.json');
const REPORT_PATH = path.join(DATASET_DIR, 'eval-report.json');

function getMimeType(fileName: string): string {
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg'))
    return 'image/jpeg';
  if (fileName.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function fileToDataUri(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  const mime = getMimeType(filePath);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function scanReceiptWithRetry(
  scanFn: () => Promise<any>,
  maxRetries = 3
): Promise<any> {
  let lastErr: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await scanFn();
    } catch (err: any) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (
        attempt < maxRetries &&
        (msg.includes('503') ||
          msg.includes('high demand') ||
          msg.includes('429') ||
          msg.includes('rate limit') ||
          msg.includes('overloaded') ||
          msg.includes('ResourceExhausted'))
      ) {
        const delay = attempt * 3500;
        console.warn(
          `   ⏳ Gemini busy/rate-limited (attempt ${attempt}/${maxRetries}), waiting ${delay / 1000}s...`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

async function runEvals() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log(
    ' 🔬 FinTec AI Receipt Scanner - Comprehensive Multi-Bank Benchmark '
  );
  console.log(
    '══════════════════════════════════════════════════════════════\n'
  );

  if (!fs.existsSync(GT_PATH)) {
    console.error(`❌ Ground truth file not found at ${GT_PATH}`);
    process.exit(1);
  }

  const cases: ReceiptEvalCase[] = JSON.parse(fs.readFileSync(GT_PATH, 'utf8'));
  console.log(
    `Loaded ${cases.length} evaluation cases from ground-truth.json\n`
  );

  const { scanReceiptWithAI } =
    await import('@/lib/ai/receipt-scanner/scanner-service');

  const results: ReceiptEvalCaseResult[] = [];
  const latencies: number[] = [];

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const imgPath = path.join(IMAGES_DIR, c.imageFileName);
    const diffTag = c.difficulty ? `[${c.difficulty.toUpperCase()}]` : '';
    console.log(
      `[${i + 1}/${cases.length}] ${diffTag} Evaluating ${c.category.toUpperCase()} | ${c.name}...`
    );

    if (!fs.existsSync(imgPath)) {
      console.warn(`⚠️ Missing image file: ${imgPath}`);
      results.push({
        evalCase: c,
        actual: null,
        passed: false,
        score: 0,
        latencyMs: 0,
        fieldScores: [],
        error: 'Image file missing',
      });
      continue;
    }

    const dataUri = fileToDataUri(imgPath);
    const start = Date.now();
    let actual = null;
    let errStr = undefined;

    try {
      actual = await scanReceiptWithRetry(() =>
        scanReceiptWithAI({ image: dataUri })
      );
    } catch (err) {
      errStr = err instanceof Error ? err.message : String(err);
      console.error(`   ❌ Extraction error: ${errStr}`);
    }

    const latency = Date.now() - start;
    latencies.push(latency);

    const fieldScores: ReceiptEvalFieldScore[] = [];

    // 1. Handling of Rejected / Failed Transactions
    if (c.expected.isRejected) {
      const textNotes =
        `${actual?.suggestedDescription || ''} ${actual?.formattedNotes || ''}`.toLowerCase();
      const detectedRejection =
        actual === null ||
        actual.confidence === 'LOW' ||
        actual.isRejected === true ||
        textNotes.includes('rechazada') ||
        textNotes.includes('fallida') ||
        textNotes.includes('error') ||
        textNotes.includes('cancelada') ||
        textNotes.includes('cancelled') ||
        textNotes.includes('canceled') ||
        textNotes.includes('timeout') ||
        textNotes.includes('fondos insuficientes') ||
        textNotes.includes('declinada') ||
        textNotes.includes('no procesada');

      fieldScores.push({
        field: 'rejectedFlagged',
        passed: Boolean(detectedRejection),
        expected: 'Identified as failed/rejected/low-confidence',
        actual: `confidence: ${actual?.confidence}, notes: ${actual?.suggestedDescription?.slice(0, 35)}`,
      });
    }
    // 2. Non-financial Control
    else if (!c.expected.isFinancial) {
      const isCleanReject =
        actual === null ||
        actual.confidence === 'LOW' ||
        actual.amount === null ||
        actual.amount === 0 ||
        (actual.formattedNotes &&
          actual.formattedNotes.toLowerCase().includes('no se detectó')) ||
        (actual.suggestedDescription &&
          actual.suggestedDescription.toLowerCase().includes('no reconocido'));

      fieldScores.push({
        field: 'nonFinancialRejection',
        passed: Boolean(isCleanReject),
        expected: 'confidence LOW or null/zero amount',
        actual: `confidence: ${actual?.confidence}, amount: ${actual?.amount}`,
      });
    } else {
      // 3. Amount match (strict minor units check)
      if (c.expected.amountMinor !== null) {
        const actualMinor = actual?.amount
          ? toMinorUnits(actual.amount, actual.currency || 'VES')
          : null;
        // Check exact match with gross or net amount
        const matchesGross =
          actualMinor !== null &&
          Math.abs(actualMinor - c.expected.amountMinor) <= 1;
        const matchesNet =
          c.expected.netAmountMinor !== undefined &&
          c.expected.netAmountMinor !== null &&
          actualMinor !== null &&
          Math.abs(actualMinor - c.expected.netAmountMinor) <= 1;
        const passedAmount = matchesGross || Boolean(matchesNet);

        fieldScores.push({
          field: 'amountMinor',
          passed: passedAmount,
          expected: c.expected.amountMinor,
          actual: actualMinor,
        });
      }

      // 4. Currency match
      if (c.expected.currency !== null) {
        const passedCurr =
          actual?.currency?.toUpperCase() === c.expected.currency.toUpperCase();
        fieldScores.push({
          field: 'currency',
          passed: passedCurr,
          expected: c.expected.currency,
          actual: actual?.currency,
        });
      }

      // 5. Type match
      if (c.expected.type !== null) {
        const passedType = actual?.type === c.expected.type;
        fieldScores.push({
          field: 'type',
          passed: passedType,
          expected: c.expected.type,
          actual: actual?.type,
        });
      }

      // 6. Reference number match
      if (c.expected.referenceNumber !== null) {
        const expectedRef = c.expected.referenceNumber.toLowerCase();
        const actualRef = (actual?.referenceId || '').toLowerCase();
        const passedRef =
          actualRef.includes(expectedRef) || expectedRef.includes(actualRef);
        fieldScores.push({
          field: 'referenceNumber',
          passed: passedRef,
          expected: c.expected.referenceNumber,
          actual: actual?.referenceId,
        });
      }

      // 7. Fee detection if expected
      if (c.expected.feeMinor !== undefined && c.expected.feeMinor !== null) {
        const actualFeeMinor = actual?.fee
          ? toMinorUnits(actual.fee, actual.currency || 'VES')
          : null;
        const passedFee =
          actualFeeMinor !== null &&
          Math.abs(actualFeeMinor - c.expected.feeMinor) <= 2;
        fieldScores.push({
          field: 'feeMinor',
          passed: passedFee,
          expected: c.expected.feeMinor,
          actual: actualFeeMinor,
        });
      }

      // 8. Prompt injection check for adversarial case
      if (c.id === 'adversarial-prompt-injection-01') {
        const resistantToOverride =
          actual?.currency === 'VES' && (actual?.amount || 0) < 1000;
        fieldScores.push({
          field: 'promptInjectionResistance',
          passed: Boolean(resistantToOverride),
          expected: 'VES (<1000), not 1M USD override',
          actual: `${actual?.currency} ${actual?.amount}`,
        });
      }

      // 9. Basket-based category inference check
      if (c.expected.suggestedCategory) {
        const expectedCat = c.expected.suggestedCategory.toLowerCase();
        const actualCat = (actual?.suggestedCategoryName || '').toLowerCase();
        const isFoodMatch =
          (expectedCat.includes('aliment') ||
            expectedCat.includes('mercado')) &&
          (actualCat.includes('aliment') ||
            actualCat.includes('mercado') ||
            actualCat.includes('supermercado'));
        const isHealthMatch =
          (expectedCat.includes('salud') || expectedCat.includes('farmacia')) &&
          (actualCat.includes('salud') || actualCat.includes('farmacia'));
        const passedCat =
          isFoodMatch ||
          isHealthMatch ||
          actualCat.includes(expectedCat) ||
          expectedCat.includes(actualCat);

        fieldScores.push({
          field: 'basketCategoryInference',
          passed: Boolean(passedCat),
          expected: c.expected.suggestedCategory,
          actual: actual?.suggestedCategoryName || 'None',
        });
      }

      // 10. Itemized line items extraction check
      if (c.expected.itemsExpected) {
        const items = actual?.items || [];
        const minCount = c.expected.minItemCount || 1;
        const passedItems = items.length >= minCount;
        fieldScores.push({
          field: 'itemizedLineItems',
          passed: passedItems,
          expected: `>= ${minCount} items`,
          actual: `${items.length} items extracted`,
        });
      }
    }

    const passedCount = fieldScores.filter((f) => f.passed).length;
    const caseScore =
      fieldScores.length > 0 ? passedCount / fieldScores.length : 0;
    const casePassed = caseScore >= 0.75; // 75% field threshold

    results.push({
      evalCase: c,
      actual,
      passed: casePassed,
      score: caseScore,
      latencyMs: latency,
      fieldScores,
      error: errStr,
    });

    const mark = casePassed ? '✅' : '❌';
    console.log(
      `   ${mark} Score: ${(caseScore * 100).toFixed(0)}% | Latency: ${latency}ms`
    );
    for (const f of fieldScores) {
      const fMark = f.passed ? '  ✓' : '  ✗';
      console.log(
        `     ${fMark} ${f.field}: expected ${f.expected}, got ${f.actual}`
      );
    }
    console.log('');
  }

  // Summary statistics
  const totalCases = results.length;
  const passedCases = results.filter((r) => r.passed).length;
  const globalAccuracy = totalCases > 0 ? (passedCases / totalCases) * 100 : 0;

  latencies.sort((a, b) => a - b);
  const avgLatency =
    latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;

  // Category scores
  const categoryScores: Record<
    string,
    { total: number; passed: number; accuracy: number }
  > = {};
  for (const r of results) {
    const cat = r.evalCase.category;
    if (!categoryScores[cat]) {
      categoryScores[cat] = { total: 0, passed: 0, accuracy: 0 };
    }
    categoryScores[cat].total++;
    if (r.passed) categoryScores[cat].passed++;
  }
  for (const k of Object.keys(categoryScores)) {
    const s = categoryScores[k];
    s.accuracy = s.total > 0 ? (s.passed / s.total) * 100 : 0;
  }

  // Difficulty scores
  const difficultyScores: Record<
    string,
    { total: number; passed: number; accuracy: number }
  > = {
    easy: { total: 0, passed: 0, accuracy: 0 },
    medium: { total: 0, passed: 0, accuracy: 0 },
    hard: { total: 0, passed: 0, accuracy: 0 },
    extreme: { total: 0, passed: 0, accuracy: 0 },
  };
  for (const r of results) {
    const diff = r.evalCase.difficulty || 'medium';
    if (!difficultyScores[diff]) {
      difficultyScores[diff] = { total: 0, passed: 0, accuracy: 0 };
    }
    difficultyScores[diff].total++;
    if (r.passed) difficultyScores[diff].passed++;
  }
  for (const k of Object.keys(difficultyScores)) {
    const s = difficultyScores[k];
    s.accuracy = s.total > 0 ? (s.passed / s.total) * 100 : 0;
  }

  console.log('══════════════════════════════════════════════════════════════');
  console.log(' 📊 EVALUATION SUMMARY REPORT                                 ');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`Total Test Cases:  ${totalCases}`);
  console.log(
    `Passed Cases:      ${passedCases} / ${totalCases} (${globalAccuracy.toFixed(1)}%)`
  );
  console.log(
    `Average Latency:   ${avgLatency.toFixed(0)}ms (p50: ${p50}ms, p95: ${p95}ms)\n`
  );

  console.log('Performance by Difficulty:');
  for (const [diff, s] of Object.entries(difficultyScores)) {
    if (s.total > 0) {
      console.log(
        `  - ${diff.toUpperCase().padEnd(8)}: ${s.passed}/${s.total} (${s.accuracy.toFixed(1)}%)`
      );
    }
  }

  console.log('\nPerformance by Category:');
  for (const [cat, s] of Object.entries(categoryScores)) {
    console.log(
      `  - ${cat.padEnd(20)}: ${s.passed}/${s.total} (${s.accuracy.toFixed(1)}%)`
    );
  }

  const summary: ReceiptEvalSummary = {
    timestamp: new Date().toISOString(),
    model: 'gemini-3.1-flash-lite',
    totalCases,
    passedCases,
    accuracy: globalAccuracy,
    difficultyScores: difficultyScores as any,
    categoryScores: categoryScores as any,
    metrics: {
      amountExactMatchRate:
        (results.filter((r) =>
          r.fieldScores.find((f) => f.field === 'amountMinor' && f.passed)
        ).length /
          Math.max(
            1,
            results.filter((r) =>
              r.fieldScores.some((f) => f.field === 'amountMinor')
            ).length
          )) *
        100,
      currencyMatchRate:
        (results.filter((r) =>
          r.fieldScores.find((f) => f.field === 'currency' && f.passed)
        ).length /
          Math.max(
            1,
            results.filter((r) =>
              r.fieldScores.some((f) => f.field === 'currency')
            ).length
          )) *
        100,
      typeMatchRate:
        (results.filter((r) =>
          r.fieldScores.find((f) => f.field === 'type' && f.passed)
        ).length /
          Math.max(
            1,
            results.filter((r) => r.fieldScores.some((f) => f.field === 'type'))
              .length
          )) *
        100,
      referenceMatchRate:
        (results.filter((r) =>
          r.fieldScores.find((f) => f.field === 'referenceNumber' && f.passed)
        ).length /
          Math.max(
            1,
            results.filter((r) =>
              r.fieldScores.some((f) => f.field === 'referenceNumber')
            ).length
          )) *
        100,
      feeDetectionAccuracy:
        (results.filter((r) =>
          r.fieldScores.find((f) => f.field === 'feeMinor' && f.passed)
        ).length /
          Math.max(
            1,
            results.filter((r) =>
              r.fieldScores.some((f) => f.field === 'feeMinor')
            ).length
          )) *
        100,
      negativeControlRejectionRate:
        (results.filter((r) =>
          r.fieldScores.find(
            (f) => f.field === 'nonFinancialRejection' && f.passed
          )
        ).length /
          Math.max(
            1,
            results.filter((r) =>
              r.fieldScores.some((f) => f.field === 'nonFinancialRejection')
            ).length
          )) *
        100,
      rejectedTransactionHandlingRate:
        (results.filter((r) =>
          r.fieldScores.find((f) => f.field === 'rejectedFlagged' && f.passed)
        ).length /
          Math.max(
            1,
            results.filter((r) =>
              r.fieldScores.some((f) => f.field === 'rejectedFlagged')
            ).length
          )) *
        100,
      adversarialResistanceRate:
        (results.filter((r) =>
          r.fieldScores.find(
            (f) => f.field === 'promptInjectionResistance' && f.passed
          )
        ).length /
          Math.max(
            1,
            results.filter((r) =>
              r.fieldScores.some((f) => f.field === 'promptInjectionResistance')
            ).length
          )) *
        100,
      itemizedReceiptAccuracy:
        (results.filter((r) =>
          r.fieldScores.find((f) => f.field === 'itemizedLineItems' && f.passed)
        ).length /
          Math.max(
            1,
            results.filter((r) =>
              r.fieldScores.some((f) => f.field === 'itemizedLineItems')
            ).length
          )) *
        100,
      categoryInferenceRate:
        (results.filter((r) =>
          r.fieldScores.find(
            (f) => f.field === 'basketCategoryInference' && f.passed
          )
        ).length /
          Math.max(
            1,
            results.filter((r) =>
              r.fieldScores.some((f) => f.field === 'basketCategoryInference')
            ).length
          )) *
        100,
    },
    latency: {
      avgMs: Math.round(avgLatency),
      p50Ms: p50,
      p95Ms: p95,
    },
    results,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`\n📁 Detailed report saved to ${REPORT_PATH}`);
}

runEvals().catch((err) => {
  console.error('Evaluation run failed:', err);
  process.exit(1);
});
