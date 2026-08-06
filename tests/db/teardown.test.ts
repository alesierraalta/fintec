import { setRagTransport } from '@/lib/ai/rag/transport';
import { seedEvalDataset } from '@/evals/fixtures/seed';
import { teardownEvalDataset } from '@/evals/fixtures/teardown';
import { createServiceRoleClient } from './support/auth-client';
import { createFixtureRagTransport } from './support/fixture-transport';

describe('teardownEvalDataset', () => {
  const client = createServiceRoleClient();

  beforeAll(() => {
    setRagTransport(createFixtureRagTransport());
  });

  afterAll(() => {
    setRagTransport();
  });

  it('leaves no cross-cycle state: seed -> assert -> teardown twice in sequence produces identical golden-label counts both times', async () => {
    const first = await seedEvalDataset(client, {
      userKey: 'teardown-cycle',
    });
    expect(first.goldenLabels.length).toBeGreaterThan(0);
    expect(first.transactionIds.length).toBe(first.goldenLabels.length);

    await teardownEvalDataset(client, first.userId);

    // Confirm the fixture's account (and by cascade, its transactions) is
    // actually gone before re-seeding — the cycle proves nothing if
    // teardown silently no-ops.
    const { data: leftoverAccounts, error: leftoverError } = await client
      .from('accounts')
      .select('id')
      .eq('user_id', first.userId);
    expect(leftoverError).toBeNull();
    expect(leftoverAccounts ?? []).toHaveLength(0);

    const second = await seedEvalDataset(client, {
      userKey: 'teardown-cycle',
    });

    expect(second.goldenLabels.length).toBe(first.goldenLabels.length);
    expect(second.transactionIds.length).toBe(first.transactionIds.length);
    // A fresh auth user after a full teardown — proves the cycle isn't
    // silently reusing leftover state from the first run.
    expect(second.userId).not.toBe(first.userId);

    await teardownEvalDataset(client, second.userId);

    const { data: leftoverAfterSecond, error: leftoverAfterSecondError } =
      await client.from('accounts').select('id').eq('user_id', second.userId);
    expect(leftoverAfterSecondError).toBeNull();
    expect(leftoverAfterSecond ?? []).toHaveLength(0);
  });
});
