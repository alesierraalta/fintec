import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROUNDING_PATH =
  'supabase/migrations/20260714010000_fix_settle_debt_base_rounding.sql';
const JSON_RETURN_PATH =
  'supabase/migrations/20260714010001_fix_settle_debt_json_return.sql';
const BASELINE_PATH =
  'supabase/migrations/20260707023350_partial_debt_settlements.sql';

function abs(p: string) {
  return join(process.cwd(), p);
}

describe('Migration structural coverage', () => {
  it(`${BASELINE_PATH} exists`, () => {
    expect(existsSync(abs(BASELINE_PATH))).toBe(true);
  });
  it(`${ROUNDING_PATH} exists`, () => {
    expect(existsSync(abs(ROUNDING_PATH))).toBe(true);
  });
  it(`${JSON_RETURN_PATH} exists`, () => {
    expect(existsSync(abs(JSON_RETURN_PATH))).toBe(true);
  });

  it(`${ROUNDING_PATH} uses VARCHAR(20)`, () => {
    const sql = readFileSync(abs(ROUNDING_PATH), 'utf8');
    expect(sql).toContain('v_tx_type VARCHAR(20)');
    expect(sql).toMatch(
      /v_new_paid_base\s*:=\s*v_debt_row\.amount_base_minor\s*-\s*ROUND/
    );
  });
  it(`${JSON_RETURN_PATH} declares v_result JSON`, () => {
    const sql = readFileSync(abs(JSON_RETURN_PATH), 'utf8');
    expect(sql).toContain('v_result JSON');
    expect(sql).toContain('RETURN v_result');
    expect(sql).toMatch(/SELECT row_to_json\(t\) INTO v_result/);
  });
});
