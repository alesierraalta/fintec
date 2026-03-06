/**
 * FinTec Performance — Automated Decision Engine
 *
 * Post-test processing script that evaluates k6 and Lighthouse CI results
 * to produce a pass/warn/fail decision for the deployment pipeline.
 *
 * Usage:
 *   node scripts/perf-decision.js \
 *     --k6-summary=tests/performance/reports/k6-load-summary.json \
 *     --lhci-dir=tests/performance/reports/lighthouse
 *
 * Exit codes:
 *   0 = All SLOs pass → auto-deploy
 *   1 = Any SLO failed → block deployment
 *   2 = Warnings present → manual approval recommended
 */

const fs = require('fs');
const path = require('path');

// ── Parse CLI arguments ──
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split('=');
  acc[key.replace('--', '')] = value;
  return acc;
}, {});

const DECISIONS = {
  ALL_PASS: { label: '🟢 ALL PASS', action: 'Auto-deploy', code: 0 },
  ANY_WARN: {
    label: '🟡 WARNINGS',
    action: 'Manual approval required',
    code: 2,
  },
  ANY_FAIL: { label: '🔴 FAILED', action: 'Block deployment', code: 1 },
};

// ── k6 Summary Evaluation ──
function evaluateK6(summaryPath) {
  if (!summaryPath || !fs.existsSync(summaryPath)) {
    console.log('[k6] No summary file found — skipping k6 evaluation.');
    return { pass: true, warnings: [], failures: [] };
  }

  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  const warnings = [];
  const failures = [];

  // Check threshold results
  if (summary.root_group && summary.root_group.checks) {
    const checks = summary.root_group.checks;
    for (const check of checks) {
      if (check.fails > 0) {
        const pct = (
          (check.fails / (check.passes + check.fails)) *
          100
        ).toFixed(1);
        if (parseFloat(pct) > 5) {
          failures.push(`Check "${check.name}" failed ${pct}% of the time`);
        } else {
          warnings.push(`Check "${check.name}" had ${pct}% failures`);
        }
      }
    }
  }

  // Check metrics thresholds
  if (summary.metrics) {
    for (const [name, metric] of Object.entries(summary.metrics)) {
      if (metric.thresholds) {
        for (const [threshold, result] of Object.entries(metric.thresholds)) {
          if (!result.ok) {
            failures.push(`Threshold "${name}: ${threshold}" breached`);
          }
        }
      }
    }
  }

  return {
    pass: failures.length === 0,
    warnings,
    failures,
  };
}

// ── Lighthouse CI Evaluation ──
function evaluateLHCI(lhciDir) {
  if (!lhciDir || !fs.existsSync(lhciDir)) {
    console.log(
      '[lhci] No reports directory found — skipping LHCI evaluation.'
    );
    return { pass: true, warnings: [], failures: [] };
  }

  const warnings = [];
  const failures = [];

  // Find assertion results
  const files = fs.readdirSync(lhciDir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    try {
      const report = JSON.parse(
        fs.readFileSync(path.join(lhciDir, file), 'utf-8')
      );

      if (report.categories && report.categories.performance) {
        const score = report.categories.performance.score;
        if (score < 0.9) {
          failures.push(
            `LHCI: ${file} performance score ${(score * 100).toFixed(0)} < 90`
          );
        } else if (score < 0.95) {
          warnings.push(
            `LHCI: ${file} performance score ${(score * 100).toFixed(0)} (near threshold)`
          );
        }
      }
    } catch {
      // Skip non-report JSON files
    }
  }

  return {
    pass: failures.length === 0,
    warnings,
    failures,
  };
}

// ── Main ──
function main() {
  console.log('═══════════════════════════════════════');
  console.log('  FinTec Performance Decision Engine');
  console.log('═══════════════════════════════════════\n');

  const k6Result = evaluateK6(args['k6-summary']);
  const lhciResult = evaluateLHCI(args['lhci-dir']);

  // Print results
  const allFailures = [...k6Result.failures, ...lhciResult.failures];
  const allWarnings = [...k6Result.warnings, ...lhciResult.warnings];

  if (allFailures.length > 0) {
    console.log('❌ FAILURES:');
    allFailures.forEach((f) => console.log(`   • ${f}`));
    console.log('');
  }

  if (allWarnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    allWarnings.forEach((w) => console.log(`   • ${w}`));
    console.log('');
  }

  // Determine decision
  let decision;
  if (allFailures.length > 0) {
    decision = DECISIONS.ANY_FAIL;
  } else if (allWarnings.length > 0) {
    decision = DECISIONS.ANY_WARN;
  } else {
    decision = DECISIONS.ALL_PASS;
  }

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`  Decision: ${decision.label}`);
  console.log(`  Action:   ${decision.action}`);
  console.log(`${'─'.repeat(40)}\n`);

  process.exit(decision.code);
}

main();
