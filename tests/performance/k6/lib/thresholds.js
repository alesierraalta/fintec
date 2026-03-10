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
  http_req_failed: ['rate<0.001'], // < 0.1% error rate (Near zero tolerance)
  http_req_duration: [
    'p(50)<50', // p50 < 50ms (Lightning fast average)
    'p(95)<100', // p95 < 100ms (Excellent 95th percentile)
    'p(99)<250', // p99 < 250ms (Extremely strict tail latency)
  ],
  http_req_waiting: ['p(95)<75'], // TTFB p95 < 75ms (Instant server response)
  http_reqs: ['rate>100'], // Throughput > 100 rps per container
};

// ──────────────────────────────────────────────────────────────
// Smoke Thresholds (Relaxed — PR pipeline)
// ──────────────────────────────────────────────────────────────
export const SMOKE_THRESHOLDS = {
  http_req_failed: ['rate<0.001'], // < 0.1% error rate
  http_req_duration: ['p(99)<500'], // p99 < 500ms (Even under smoke, must be fast)
};

// ──────────────────────────────────────────────────────────────
// Stress Thresholds (Relaxed — expect degradation under 2x load)
// ──────────────────────────────────────────────────────────────
export const STRESS_THRESHOLDS = {
  http_req_failed: ['rate<0.01'], // < 1% error rate
  http_req_duration: [
    'p(95)<250', // p95 < 250ms under stress (Must remain highly responsive)
    'p(99)<500', // p99 < 500ms
  ],
};

// ──────────────────────────────────────────────────────────────
// Spike Thresholds (Very relaxed — validates recovery, not peak)
// ──────────────────────────────────────────────────────────────
export const SPIKE_THRESHOLDS = {
  http_req_failed: [
    { threshold: 'rate<0.02', abortOnFail: true }, // 2% error = abort (Strict spike tolerance)
  ],
  http_req_duration: ['p(95)<800'], // p95 < 800ms
};

// ──────────────────────────────────────────────────────────────
// Soak Thresholds (Same as load — detect drift over time)
// ──────────────────────────────────────────────────────────────
export const SOAK_THRESHOLDS = {
  ...API_THRESHOLDS,
  // Soak-specific: memory leaks show as gradual latency increase
  http_req_duration: [
    'p(95)<150', // Barely degraded during long endurance runs
    'p(99)<350',
  ],
};

// ──────────────────────────────────────────────────────────────
// Browser / Frontend Thresholds (Core Web Vitals)
// ──────────────────────────────────────────────────────────────
export const BROWSER_THRESHOLDS = {
  browser_web_vital_fcp: ['p(95)<1000'], // FCP p95 < 1s (Instant paint)
  browser_web_vital_lcp: ['p(95)<1200'], // LCP p95 < 1.2s (Excellent LCP)
  browser_web_vital_cls: ['p(95)<0.05'], // CLS p95 < 0.05 (Zero shifts)
  browser_web_vital_inp: ['p(95)<50'], // INP p95 < 50ms (Perfect interaction)
};

// ──────────────────────────────────────────────────────────────
// Per-Endpoint Thresholds (Tagged metrics)
// ──────────────────────────────────────────────────────────────
export const ENDPOINT_THRESHOLDS = {
  'http_req_duration{endpoint:transactions}': ['p(95)<100'],
  'http_req_duration{endpoint:accounts}': ['p(95)<75'],
  'http_req_duration{endpoint:rates}': ['p(95)<150'],
  'http_req_duration{endpoint:auth}': ['p(95)<250'],
};
