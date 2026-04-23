import { execSync } from 'child_process';

import fs from 'fs';
import os from 'os';

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';
const DEFAULT_SUPABASE_URL = 'http://127.0.0.1:54321';
const WARMUP_PATHS = [
  '/api/scrapers/health',
  '/api/binance-rates',
  '/api/bcv-rates',
];

function resolveBaseUrl() {
  return process.env.BASE_URL || DEFAULT_BASE_URL;
}

function resolveSupabaseUrl() {
  return (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  );
}

async function probe(url) {
  try {
    const response = await fetch(url);
    return response.status === 200;
  } catch {
    return false;
  }
}

async function checkServer(baseUrl) {
  return probe(`${baseUrl}/api/scrapers/health`);
}

async function checkSupabase(supabaseUrl) {
  return probe(supabaseUrl);
}

async function warmUpRoutes(baseUrl) {
  console.log('🔥 [Pre-commit] Warming up local API routes before measuring latency...');

  for (const path of WARMUP_PATHS) {
    const url = `${baseUrl}${path}`;
    const startedAt = Date.now();

    try {
      const response = await fetch(url);
      const elapsed = Date.now() - startedAt;
      console.log(
        `   ↳ Warmed ${path} (${response.status}) in ${elapsed}ms`
      );
    } catch (error) {
      const elapsed = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : String(error);
      console.log(
        `   ↳ Warm-up request for ${path} failed after ${elapsed}ms: ${message}`
      );
    }
  }
}

function getK6Command() {
  try {
    execSync('k6 version', { stdio: 'ignore' });
    return 'k6';
  } catch {
    if (os.platform() === 'win32') {
      const winPath = 'C:\\Program Files\\k6\\k6.exe';
      if (fs.existsSync(winPath)) {
        return `"${winPath}"`;
      }
    }
    return null;
  }
}

function runSmokeTest(k6Cmd, skipAuth) {
  const cmd =
    k6Cmd === 'k6'
      ? 'npm run perf:smoke'
      : `${k6Cmd} run tests/performance/k6/scenarios/smoke.js`;

  execSync(cmd, {
    stdio: 'inherit',
    env: {
      ...process.env,
      K6_SKIP_AUTH_SETUP: skipAuth ? '1' : process.env.K6_SKIP_AUTH_SETUP || '0',
    },
  });
}

async function run() {
  console.log('🔍 [Pre-commit] Checking performance testing environment...');

  const k6Cmd = getK6Command();
  if (!k6Cmd) {
    console.log('⚠️  [Pre-commit] k6 is not installed locally. Skipping performance smoke tests.');
    process.exit(0);
  }

  const baseUrl = resolveBaseUrl();
  const isRunning = await checkServer(baseUrl);
  if (!isRunning) {
    console.log(
      `⚠️  [Pre-commit] Dev server (${baseUrl}) is not running. Skipping performance smoke tests.`
    );
    process.exit(0);
  }

  await warmUpRoutes(baseUrl);

  const supabaseUrl = resolveSupabaseUrl();
  const canReachSupabase = await checkSupabase(supabaseUrl);

  if (!canReachSupabase) {
    console.log(
      `⚠️  [Pre-commit] Supabase (${supabaseUrl}) is unreachable. Running unauthenticated smoke coverage only.`
    );
  }

  console.log('🔥 [Pre-commit] Running performance smoke tests...');
  try {
    runSmokeTest(k6Cmd, !canReachSupabase);
    console.log('✅ [Pre-commit] Performance smoke tests passed!');
  } catch {
    console.error(
      '❌ [Pre-commit] Performance smoke tests failed! Please fix performance regressions before committing.'
    );
    process.exit(1);
  }
}

run();
