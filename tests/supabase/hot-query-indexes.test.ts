import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

function read(name: string): string {
  return readFileSync(join(MIGRATIONS_DIR, name), 'utf-8');
}

// The hot-query indexes are split across single-statement files because
// CREATE INDEX CONCURRENTLY cannot share the Supabase CLI statement pipeline
// with other statements (SQLSTATE 25001). The original single-file version
// also indexed user_id on transactions/transfers, columns those tables do not
// have (ownership resolves through accounts), so it could never apply.
const HOT_INDEX_FILES = [
  '20260528120000_add_hot_query_indexes.sql',
  '20260528120001_hot_idx_accounts.sql',
  '20260528120002_hot_idx_transfers_from.sql',
  '20260528120003_hot_idx_transfers_to.sql',
  '20260528120004_hot_idx_budgets.sql',
  '20260528120005_hot_idx_goals.sql',
  '20260528120006_hot_idx_analyze.sql',
];

describe('hot query indexes migrations', () => {
  let combined: string;

  beforeAll(() => {
    combined = HOT_INDEX_FILES.map(read).join('\n');
  });

  it('all seven migration files exist', () => {
    const files = readdirSync(MIGRATIONS_DIR);
    for (const name of HOT_INDEX_FILES) {
      expect(files).toContain(name);
    }
  });

  it('indexes transactions by account_id + created_at (transactions has no user_id column)', () => {
    expect(combined).toContain('idx_transactions_account_created');
    expect(combined).toContain('transactions(account_id, created_at DESC)');
    expect(combined).not.toContain('transactions(user_id');
  });

  it('indexes accounts, budgets and goals by user_id + created_at', () => {
    expect(combined).toContain('idx_accounts_user_created');
    expect(combined).toContain('accounts(user_id, created_at DESC)');
    expect(combined).toContain('idx_budgets_user_created');
    expect(combined).toContain('budgets(user_id, created_at DESC)');
    expect(combined).toContain('idx_goals_user_created');
    expect(combined).toContain('goals(user_id, created_at DESC)');
  });

  it('indexes transfers.from_transaction_id and defers to the pre-existing to_transaction_id index', () => {
    expect(combined).toContain('idx_transfers_from_transaction');
    expect(combined).toContain('transfers(from_transaction_id)');
    // transfers(to_transaction_id) is already covered by
    // idx_transfers_to_transaction_id (202604081614); the 20260528120003
    // file must stay a documented no-op instead of duplicating it.
    expect(read('20260528120003_hot_idx_transfers_to.sql')).not.toMatch(
      /^\s*CREATE INDEX/im
    );
    expect(combined).toContain('idx_transfers_to_transaction_id');
    expect(combined).not.toContain('transfers(user_id');
  });

  it('uses CONCURRENTLY for non-blocking creation, at most one per file', () => {
    for (const name of HOT_INDEX_FILES) {
      const sql = read(name);
      const concurrent = sql.match(/CREATE INDEX CONCURRENTLY IF NOT EXISTS/g) || [];
      expect(concurrent.length).toBeLessThanOrEqual(1);
      const plain = sql.match(/^\s*CREATE INDEX (?!CONCURRENTLY)/gim) || [];
      expect(plain.length).toBe(0);
    }
    expect(combined.match(/CREATE INDEX CONCURRENTLY IF NOT EXISTS/g) || []).toHaveLength(5);
  });

  it('analyzes all five tables after index creation', () => {
    const analyzeSql = read('20260528120006_hot_idx_analyze.sql');
    for (const table of ['transactions', 'accounts', 'transfers', 'budgets', 'goals']) {
      expect(analyzeSql).toContain(`ANALYZE public.${table}`);
    }
  });
});
