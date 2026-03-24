#!/usr/bin/env node

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const mode = args.includes('--staged') ? 'staged' : 'prepush';
const filesArg = args.find((arg) => arg.startsWith('--files='));

const CORE_SUPABASE_TESTS = [
  'tests/node/api/testing-bootstrap-route.test.ts',
  'tests/node/support/auth/bootstrap.test.ts',
  'tests/node/support/auth/ensure-canonical-auth-user.test.ts',
];

const SUPABASE_RELEVANT_PATTERNS = [
  /^supabase\//,
  /^lib\/supabase\//,
  /^repositories\/supabase\//,
  /^app\/api\/testing\/bootstrap\//,
  /^tests\/support\/auth\//,
  /^tests\/auth\.setup\.ts$/,
  /^playwright\.config\.ts$/,
  /^scripts\/testing\//,
  /^\.husky\//,
  /^package\.json$/,
];

const CODE_FILE_PATTERN = /\.(ts|tsx|js|jsx|mjs|cjs)$/i;
const MIGRATION_FILE_PATTERN = /^supabase\/migrations\/.*\.sql$/i;
const repoRoot = process.cwd();
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function log(message) {
  console.log(`[supabase-hook] ${message}`);
}

function quoteArg(value) {
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

function run(command, commandArgs) {
  if (process.platform === 'win32') {
    execSync([command, ...commandArgs].map(quoteArg).join(' '), {
      cwd: repoRoot,
      stdio: 'inherit',
      encoding: 'utf8',
    });
    return;
  }

  execFileSync(command, commandArgs, {
    cwd: repoRoot,
    stdio: 'inherit',
    encoding: 'utf8',
  });
}

function readGit(commandArgs) {
  return execFileSync('git', commandArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function splitLines(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function parseExplicitFiles(rawValue) {
  return rawValue
    .split(',')
    .map((entry) => normalizePath(entry.trim()))
    .filter(Boolean);
}

function getChangedFiles() {
  if (filesArg) {
    return parseExplicitFiles(filesArg.slice('--files='.length));
  }

  if (mode === 'staged') {
    return splitLines(
      readGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
    );
  }

  try {
    const upstream = readGit([
      'rev-parse',
      '--abbrev-ref',
      '--symbolic-full-name',
      '@{upstream}',
    ]);

    return splitLines(
      readGit(['diff', '--name-only', '--diff-filter=ACMR', `${upstream}...HEAD`])
    );
  } catch {}

  for (const candidate of ['origin/main', 'origin/master']) {
    try {
      const mergeBase = readGit(['merge-base', 'HEAD', candidate]);
      return splitLines(
        readGit(['diff', '--name-only', '--diff-filter=ACMR', `${mergeBase}...HEAD`])
      );
    } catch {}
  }

  return splitLines(
    readGit(['diff-tree', '--no-commit-id', '--name-only', '--diff-filter=ACMR', '-r', 'HEAD'])
  );
}

function isSupabaseRelevant(filePath) {
  return SUPABASE_RELEVANT_PATTERNS.some((pattern) => pattern.test(filePath));
}

function walk(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  if (!existsSync(absoluteDir)) {
    return [];
  }

  const entries = readdirSync(absoluteDir);
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(absoluteDir, entry);
    const relativePath = normalizePath(path.relative(repoRoot, absolutePath));
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      files.push(...walk(relativePath));
      continue;
    }

    files.push(relativePath);
  }

  return files;
}

function collectMigrationTests(migrationFiles) {
  const testCandidates = walk('tests/node').filter(
    (filePath) => filePath.endsWith('.test.ts') && /migration/i.test(path.basename(filePath))
  );

  const matchedTests = new Set();

  for (const migrationFile of migrationFiles) {
    const matches = testCandidates.filter((testFile) =>
      readFileSync(path.join(repoRoot, testFile), 'utf8').includes(migrationFile)
    );

    if (matches.length === 0) {
      throw new Error(
        `No migration coverage test references ${migrationFile}. Add or update a tests/node/**/*migration*.test.ts file before committing.`
      );
    }

    matches.forEach((match) => matchedTests.add(match));
  }

  return [...matchedTests];
}

function unique(items) {
  return [...new Set(items)];
}

const changedFiles = unique(getChangedFiles().map(normalizePath));
const relevantFiles = changedFiles.filter(isSupabaseRelevant);

if (relevantFiles.length === 0) {
  log(`No Supabase-relevant changes detected for ${mode}. Skipping targeted checks.`);
  process.exit(0);
}

log(`Detected Supabase-relevant changes (${mode}): ${relevantFiles.join(', ')}`);

const migrationFiles = relevantFiles.filter((filePath) => MIGRATION_FILE_PATTERN.test(filePath));
const codeFiles = relevantFiles.filter((filePath) => CODE_FILE_PATTERN.test(filePath));
const migrationTests = collectMigrationTests(migrationFiles);
const byPathTests = unique([...CORE_SUPABASE_TESTS, ...migrationTests]);

if (codeFiles.length > 0) {
  log(`Running related Supabase Jest tests for changed code files...`);
  run(npmCommand, ['run', 'test:supabase', '--', '--findRelatedTests', ...codeFiles]);
}

if (byPathTests.length > 0) {
  log(`Running core Supabase Jest coverage checks...`);
  run(npmCommand, ['run', 'test:supabase', '--', '--runTestsByPath', ...byPathTests]);
}

if (mode === 'prepush') {
  log('Running real auth/Supabase smoke check...');
  run(npmCommand, ['run', 'e2e:smoke:auth-required']);
}

log(`Supabase hook checks passed for ${mode}.`);
