#!/usr/bin/env node

const TRUTHY = new Set(['1', 'true', 'yes']);
const VALID_LANES = new Set(['no-auth', 'auth-required']);

function isTruthy(value) {
  return TRUTHY.has((value ?? '').toLowerCase());
}

function fail(message) {
  console.error(`[playwright-lane] ${message}`);
  process.exit(1);
}

const lane = process.env.PLAYWRIGHT_LANE ?? 'no-auth';

if (!VALID_LANES.has(lane)) {
  fail(`Invalid PLAYWRIGHT_LANE="${lane}". Use "no-auth" or "auth-required".`);
}

const bypassEnabled = isTruthy(process.env.FRONTEND_AUTH_BYPASS);
const skipSetupEnabled = isTruthy(process.env.PLAYWRIGHT_NO_AUTH_SETUP);
const isProduction =
  (process.env.NODE_ENV ?? '').toLowerCase() === 'production';

if (lane === 'auth-required' && bypassEnabled) {
  fail('FRONTEND_AUTH_BYPASS must be disabled in auth-required lane.');
}

if (lane === 'auth-required' && skipSetupEnabled) {
  fail('PLAYWRIGHT_NO_AUTH_SETUP cannot be enabled in auth-required lane.');
}

if (lane === 'no-auth' && !skipSetupEnabled) {
  fail('PLAYWRIGHT_NO_AUTH_SETUP must be enabled in no-auth lane.');
}

if (isProduction && bypassEnabled) {
  fail('FRONTEND_AUTH_BYPASS must never be enabled when NODE_ENV=production.');
}

console.log(
  `[playwright-lane] OK lane=${lane} bypass=${bypassEnabled ? 'on' : 'off'} skipSetup=${skipSetupEnabled ? 'on' : 'off'}`
);
