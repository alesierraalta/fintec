#!/usr/bin/env node

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const playwrightCli = require.resolve('@playwright/test/cli');

const DEFAULT_COMMAND_TIMEOUT_MS = process.env.CI
  ? 20 * 60 * 1000
  : 12 * 60 * 1000;
const timeoutMs =
  Number.parseInt(process.env.PLAYWRIGHT_COMMAND_TIMEOUT_MS ?? '', 10) ||
  DEFAULT_COMMAND_TIMEOUT_MS;

const args = process.argv.slice(2);

const child = spawn(process.execPath, [playwrightCli, 'test', ...args], {
  stdio: 'inherit',
  env: process.env,
  detached: process.platform !== 'win32',
});

let terminating = false;
let forcedByTimeout = false;

function killTree(signal = 'SIGTERM') {
  if (!child.pid) {
    return;
  }

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      process.kill(child.pid, signal);
    } catch {
      // Process already exited.
    }
  }
}

function requestShutdown(signal) {
  if (terminating) {
    return;
  }

  terminating = true;
  killTree(signal);

  setTimeout(() => {
    killTree('SIGKILL');
  }, 5_000).unref();
}

const timeoutHandle = setTimeout(() => {
  forcedByTimeout = true;
  console.error(
    `[playwright-guard] Timeout after ${timeoutMs}ms. Terminating Playwright and web server process tree.`
  );
  requestShutdown('SIGTERM');
}, timeoutMs);

process.on('SIGINT', () => requestShutdown('SIGINT'));
process.on('SIGTERM', () => requestShutdown('SIGTERM'));

child.on('exit', (code, signal) => {
  clearTimeout(timeoutHandle);

  if (forcedByTimeout) {
    process.exit(124);
  }

  if (typeof code === 'number') {
    process.exit(code);
  }

  console.error(
    `[playwright-guard] Playwright exited due to signal ${signal ?? 'unknown'}.`
  );
  process.exit(1);
});
