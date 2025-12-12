import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const rawArgs = process.argv.slice(2).map((a) => a.trim()).filter(Boolean);
const actions = new Set(rawArgs);

function printUsage() {
  // Keep output minimal; this is a utility script.
  // eslint-disable-next-line no-console
  console.log(
    [
      'Usage: node scripts/clean.mjs <actions...>',
      '',
      'Actions:',
      '  build       Remove .next/, out/, .swc/',
      '  deps-cache  Remove node_modules/.cache/',
      '  deps        Remove node_modules/',
      '  temp        Remove playwright-report/, test-results/, and *.test-results.json',
      '  docs        Remove *_ANALYSIS_*.md, *_SOLUCION_*.md, *_RESUMEN_*.md',
      '  ts          Remove *.tsbuildinfo',
      '  logs        Remove *.log',
      '  tooling     Remove .serena/cache/, .cursor/, .mcp_proj/, .playwright-mcp/',
    ].join('\n'),
  );
}

if (
  actions.size === 0 ||
  actions.has('-h') ||
  actions.has('--help') ||
  actions.has('help')
) {
  printUsage();
  process.exit(actions.size === 0 ? 1 : 0);
}

const repoRoot = process.cwd();

async function rmForce(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true });
}

const walkSkipDirs = new Set([
  '.git',
  'node_modules',
  '.next',
  'out',
  '.swc',
  'playwright-report',
  'test-results',
  '.serena',
]);

async function* walkFiles(dirPath) {
  let dirHandle;
  try {
    dirHandle = await fs.opendir(dirPath);
  } catch {
    return;
  }

  for await (const entry of dirHandle) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (walkSkipDirs.has(entry.name)) continue;
      yield* walkFiles(entryPath);
      continue;
    }
    if (entry.isFile()) {
      yield entryPath;
    }
  }
}

function shouldRemoveDocs(fileName) {
  if (!fileName.endsWith('.md')) return false;
  return (
    fileName.includes('_ANALYSIS_') ||
    fileName.includes('_SOLUCION_') ||
    fileName.includes('_RESUMEN_')
  );
}

function shouldRemoveTestResultsJson(fileName) {
  return fileName.endsWith('.test-results.json');
}

function shouldRemoveTsBuildInfo(fileName) {
  return fileName.endsWith('.tsbuildinfo');
}

function shouldRemoveLog(fileName) {
  return fileName.endsWith('.log');
}

const deletePaths = [];

if (actions.has('build')) {
  deletePaths.push('.next', 'out', '.swc');
}
if (actions.has('deps-cache')) {
  deletePaths.push(path.join('node_modules', '.cache'));
}
if (actions.has('deps')) {
  deletePaths.push('node_modules');
}
if (actions.has('temp')) {
  deletePaths.push('playwright-report', 'test-results');
}
if (actions.has('tooling')) {
  deletePaths.push(
    path.join('.serena', 'cache'),
    '.cursor',
    '.mcp_proj',
    '.playwright-mcp',
  );
}

for (const relPath of deletePaths) {
  await rmForce(path.join(repoRoot, relPath));
}

const filePredicates = [];

if (actions.has('docs')) {
  filePredicates.push(shouldRemoveDocs);
}
if (actions.has('temp')) {
  filePredicates.push(shouldRemoveTestResultsJson);
}
if (actions.has('ts')) {
  filePredicates.push(shouldRemoveTsBuildInfo);
}
if (actions.has('logs')) {
  filePredicates.push(shouldRemoveLog);
}

if (filePredicates.length > 0) {
  for await (const absPath of walkFiles(repoRoot)) {
    const baseName = path.basename(absPath);
    if (!filePredicates.some((p) => p(baseName))) continue;
    await rmForce(absPath);
  }
}
