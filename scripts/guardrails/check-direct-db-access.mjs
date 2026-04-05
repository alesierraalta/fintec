import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const SKIP_DIRS = new Set([
  '.git',
  '.next',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'android',
  'ios',
]);

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);

const ALLOWED_PREFIXES = [
  'repositories/supabase/',
  'tests/',
  'supabase/functions/',
];

const ALLOWED_FILES = new Set([
  'lib/payment-orders/order-service.ts',
  'lib/supabase/subscriptions.ts',
  // Auth context needs direct user profile access for base_currency
  'contexts/auth-context.tsx',
  // Payment order route handler uses service client for admin operations
  'app/api/payment-orders/[id]/initiate-pagoflash/route.ts',
]);

const DB_CALL_PATTERNS = [/\.from\(\s*['"`]/g, /\.rpc\(\s*['"`]/g];

function toRelative(filePath) {
  return filePath.replaceAll('\\', '/');
}

function isSourceFile(filePath) {
  return SOURCE_EXTENSIONS.has(path.extname(filePath));
}

function shouldSkipDir(dirName) {
  return SKIP_DIRS.has(dirName);
}

function isAllowedPath(relativePath) {
  if (ALLOWED_FILES.has(relativePath)) {
    return true;
  }

  return ALLOWED_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

function walk(directory, files = []) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && shouldSkipDir(entry.name)) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(absolutePath, files);
      continue;
    }

    if (!entry.isFile() || !isSourceFile(absolutePath)) {
      continue;
    }

    files.push(absolutePath);
  }

  return files;
}

function findViolations(filePath) {
  const relativePath = toRelative(path.relative(ROOT, filePath));
  if (isAllowedPath(relativePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const violations = [];

  lines.forEach((line, index) => {
    for (const pattern of DB_CALL_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          path: relativePath,
          line: index + 1,
          code: line.trim(),
        });
      }
      pattern.lastIndex = 0;
    }
  });

  return violations;
}

const sourceFiles = walk(ROOT);
const violations = sourceFiles.flatMap(findViolations);

if (violations.length > 0) {
  console.error(
    'Direct DB calls detected outside allowed adapter boundaries:\n'
  );
  for (const violation of violations) {
    console.error(`${violation.path}:${violation.line}`);
    console.error(`  ${violation.code}`);
  }
  console.error(
    '\nMove DB access to repository adapters under repositories/supabase/ (or add a temporary allowlist entry with justification).'
  );
  process.exit(1);
}

console.log('DB access guard passed.');
