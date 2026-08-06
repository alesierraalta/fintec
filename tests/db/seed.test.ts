import * as backfillModule from '@/scripts/backfill-embeddings';
import { setRagTransport } from '@/lib/ai/rag/transport';
import { seedEvalDataset } from '@/evals/fixtures/seed';
import { teardownEvalDataset } from '@/evals/fixtures/teardown';
import { createServiceRoleClient } from './support/auth-client';
import { createFixtureRagTransport } from './support/fixture-transport';

describe('seedEvalDataset', () => {
  const client = createServiceRoleClient();
  const seededUserIds: string[] = [];

  beforeAll(() => {
    setRagTransport(createFixtureRagTransport());
  });

  afterAll(async () => {
    setRagTransport();
    for (const userId of seededUserIds) {
      await teardownEvalDataset(client, userId);
    }
  });

  it('reuses runBackfill for embedding generation — no second embedding path', async () => {
    const backfillSpy = jest.spyOn(backfillModule, 'runBackfill');

    const result = await seedEvalDataset(client, { userKey: 'seed-wiring' });
    seededUserIds.push(result.userId);

    expect(backfillSpy).toHaveBeenCalledWith(
      expect.objectContaining({ client, dryRun: false })
    );
    expect(result.userId).toEqual(expect.any(String));
    expect(result.transactionIds.length).toBeGreaterThan(0);
    expect(result.goldenLabels.length).toBe(result.transactionIds.length);

    backfillSpy.mockRestore();
  });

  it('is idempotent: a second seed call does not error or duplicate rows', async () => {
    const first = await seedEvalDataset(client, { userKey: 'seed-idempotent' });
    seededUserIds.push(first.userId);

    const second = await seedEvalDataset(client, {
      userKey: 'seed-idempotent',
    });

    expect(second.userId).toBe(first.userId);
    expect([...second.transactionIds].sort()).toEqual(
      [...first.transactionIds].sort()
    );

    const { data: accounts, error: accountsError } = await client
      .from('accounts')
      .select('id')
      .eq('user_id', first.userId);
    expect(accountsError).toBeNull();
    const accountIds = (accounts ?? []).map((a) => a.id as string);

    const { count, error: countError } = await client
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .in('account_id', accountIds);
    expect(countError).toBeNull();
    expect(count).toBe(first.transactionIds.length);
  });
});
