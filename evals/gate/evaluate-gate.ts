/**
 * ai-eval-harness req. 10: blocking CI gate grounded in the committed
 * baseline. Reads thresholds ONLY from `baseline.json` — no numeric
 * threshold literal belongs in CI configuration.
 */

export interface BaselineMetricEntry {
  value: number;
  n: number;
  tolerance: number;
  blocking: boolean;
}

export interface Baseline {
  schemaVersion: number;
  commit: string;
  runAt: string;
  transport: string;
  metrics: Record<string, BaselineMetricEntry>;
}

export interface GateFailure {
  metric: string;
  observed: number;
  threshold: number;
}

export interface GateReport {
  metric: string;
  observed: number;
  baselineValue: number;
}

export interface GateVerdict {
  passed: boolean;
  failures: GateFailure[];
  reported: GateReport[];
}

/**
 * Fails ONLY when `observed < value - tolerance AND blocking === true`.
 * A metric with `blocking: false` is reported (if regressed) but never
 * fails the gate, regardless of how far it regresses.
 */
export function evaluateGate(
  baseline: Baseline,
  observed: Record<string, number>
): GateVerdict {
  const failures: GateFailure[] = [];
  const reported: GateReport[] = [];

  for (const [metric, entry] of Object.entries(baseline.metrics)) {
    const observedValue = observed[metric];
    if (observedValue === undefined) continue;

    const threshold = entry.value - entry.tolerance;
    const regressed = observedValue < threshold;
    if (!regressed) continue;

    if (entry.blocking) {
      failures.push({ metric, observed: observedValue, threshold });
    } else {
      reported.push({
        metric,
        observed: observedValue,
        baselineValue: entry.value,
      });
    }
  }

  return { passed: failures.length === 0, failures, reported };
}
