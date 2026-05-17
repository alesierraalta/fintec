/**
 * Static import guard for RLS / Service-Role boundary.
 *
 * Runs as part of `npm run verify:boundary` to ensure no forbidden
 * @/lib/supabase/admin imports exist in app/api/ paths (except whitelisted
 * webhooks/ and admin/ paths).
 *
 * Uses simple regex + filesystem scan — no ESLint dependency.
 * Deterministic, fast, and testable via unit tests.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const TARGET_MODULE = '@/lib/supabase/admin';
const WHITELIST_PREFIXES = [
  'app/api/webhooks/',
  'app/api/admin/',
  // Admin-only payment order operations that legitimately need service-role access
  'app/api/payment-orders/[id]/approve/',
  'app/api/payment-orders/[id]/reject/',
  // Order reconciliation for webhooks
  'app/api/orders/[id]/reconcile/',
];
const SCAN_ROOTS = ['app/api'];

function isWhitelisted(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return WHITELIST_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function isApiRoute(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return SCAN_ROOTS.some((root) => normalized.startsWith(root + '/'));
}

function scanContent(filePath, content) {
  const normalized = filePath.replace(/\\/g, '/');
  if (!isApiRoute(normalized)) return [];
  if (isWhitelisted(normalized)) return [];

  const violations = [];

  // Match both static and dynamic imports of the service-role client.
  // Static:  import ... from '@/lib/supabase/admin'
  // Dynamic: await import('@/lib/supabase/admin')
  const importRe =
    /(?:import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]@\/lib\/supabase\/admin['"]|import\(\s*['"]@\/lib\/supabase\/admin['"]\s*\))/g;
  let match;
  while ((match = importRe.exec(content)) !== null) {
    violations.push({
      file: filePath,
      line: content.substring(0, match.index).split('\n').length,
      match: match[0],
    });
  }

  return violations;
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return scanContent(filePath, content);
}

function scanDirectory(dir) {
  const violations = [];
  if (!fs.existsSync(dir)) return violations;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      violations.push(...scanDirectory(fullPath));
    } else if (entry.isFile() && /\.(ts|js|tsx|jsx)$/.test(entry.name)) {
      violations.push(...scanFile(fullPath));
    }
  }
  return violations;
}

function runCheck() {
  const allViolations = [];
  for (const root of SCAN_ROOTS) {
    allViolations.push(...scanDirectory(root));
  }

  if (allViolations.length > 0) {
    console.error('❌ RLS Boundary Violations Found:\n');
    for (const v of allViolations) {
      console.error(`  ${v.file}:${v.line} — ${v.match}`);
    }
    console.error(
      '\nService-role client imports are forbidden in user-facing API routes.'
    );
    console.error('Whitelisted paths:', WHITELIST_PREFIXES.join(', '));
    process.exit(1);
  } else {
    console.log('✅ No RLS boundary violations found.');
    process.exit(0);
  }
}

// Export for unit testing
module.exports = { scanContent, scanFile, isApiRoute, isWhitelisted, runCheck };

// CLI execution
if (require.main === module) {
  runCheck();
}
