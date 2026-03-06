/**
 * FinTec Performance Testing — Shared Threshold Definitions
 *
 * SLI/SLO thresholds aligned with ADR-001.
 * These thresholds are the pass/fail criteria for automated CI gates.
 */

// ──────────────────────────────────────────────────────────────
// API Thresholds (Backend SLOs)
// ──────────────────────────────────────────────────────────────
export const API_THRESHOLDS = {
  http_req_failed: ['rate<0.005'], // < 0.5% error rate
  http_req_duration: [
    'p(50)<100', // p50 < 100ms
    'p(95)<300', // p95 < 300ms
    'p(99)<800', // p99 < 800ms
  ],
  http_req_waiting: ['p(95)<250'], // TTFB p95 < 250ms
  http_reqs: ['rate>50'], // Throughput > 50 rps
};

// ──────────────────────────────────────────────────────────────
// Smoke Thresholds (Relaxed — PR pipeline)
// ──────────────────────────────────────────────────────────────
export const SMOKE_THRESHOLDS = {
  http_req_failed: ['rate<0.01'], // < 1% error rate
  http_req_duration: ['p(99)<2000'], // p99 < 2s (very relaxed)
};

// ──────────────────────────────────────────────────────────────
// Stress Thresholds (Relaxed — expect degradation under 2x load)
// ──────────────────────────────────────────────────────────────
export const STRESS_THRESHOLDS = {
  http_req_failed: ['rate<0.02'], // < 2% error rate
  http_req_duration: [
    'p(95)<500', // p95 < 500ms
    'p(99)<1500', // p99 < 1.5s
  ],
};

// ──────────────────────────────────────────────────────────────
// Spike Thresholds (Very relaxed — validates recovery, not peak)
// ──────────────────────────────────────────────────────────────
export const SPIKE_THRESHOLDS = {
  http_req_failed: [
    { threshold: 'rate<0.05', abortOnFail: true }, // 5% error = abort
  ],
  http_req_duration: ['p(95)<2000'], // p95 < 2s
};

// ──────────────────────────────────────────────────────────────
// Soak Thresholds (Same as load — detect drift over time)
// ──────────────────────────────────────────────────────────────
export const SOAK_THRESHOLDS = {
  ...API_THRESHOLDS,
  // Soak-specific: memory leaks show as gradual latency increase
  http_req_duration: [
    'p(95)<400', // Slightly relaxed for long run
    'p(99)<1000',
  ],
};

// ──────────────────────────────────────────────────────────────
// Browser / Frontend Thresholds (Core Web Vitals)
// ──────────────────────────────────────────────────────────────
export const BROWSER_THRESHOLDS = {
  browser_web_vital_fcp: ['p(95)<1800'], // FCP p95 < 1.8s
  browser_web_vital_lcp: ['p(95)<2500'], // LCP p95 < 2.5s
  browser_web_vital_cls: ['p(95)<0.1'], // CLS p95 < 0.1
  browser_web_vital_inp: ['p(95)<200'], // INP p95 < 200ms
};

// ──────────────────────────────────────────────────────────────
// Per-Endpoint Thresholds (Tagged metrics)
// ──────────────────────────────────────────────────────────────
export const ENDPOINT_THRESHOLDS = {
  'http_req_duration{endpoint:transactions}': ['p(95)<200'],
  'http_req_duration{endpoint:accounts}': ['p(95)<150'],
  'http_req_duration{endpoint:rates}': ['p(95)<300'],
  'http_req_duration{endpoint:auth}': ['p(95)<500'],
};
