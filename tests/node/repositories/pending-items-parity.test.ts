// Polyfill IndexedDB for the node test env so Dexie can run.
import 'fake-indexeddb/auto';

import { RequestContext } from '@/lib/cache/request-context';
import { SupabasePendingItemsRepository } from '@/repositories/supabase/pending-items-repository-impl';
import { LocalPendingItemsRepository } from '@/repositories/local/pending-items-repository-impl';
import { db } from '@/repositories/local/db';

const USER_A = '11111111-1111-1111-1111-111111111111';
const USER_B = '22222222-2222-2222-2222-222222222222';

/**
 * Chainable PostgREST-style query mock. Every builder method records its
 * arguments (so tests can assert the exact payload sent to Supabase) and the
 * whole chain is awaitable, resolving to `result`.
 */
function createChainQuery(result: { data: unknown; error: unknown }) {
  const q: any = {};
  for (const method of [
    'select',
    'eq',
    'insert',
    'update',
    'order',
    'delete',
  ]) {
    q[method] = jest.fn((...args: unknown[]) => {
      q[`${method}Args`] = (q[`${method}Args`] ?? []).concat([args]);
      return q;
    });
  }
  q.single = jest.fn(() => Promise.resolve(result));
  q.then = (
    resolve: (value: unknown) => unknown,
    reject: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject);
  return q;
}

function createMockClient(query: any, authUserId: string | null): any {
  return {
    from: jest.fn(() => query),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: authUserId ? { id: authUserId } : null },
      }),
    },
  };
}

function makeSupabaseRepo(query: any, authUserId: string | null) {
  const client = createMockClient(query, authUserId);
  const repo = new SupabasePendingItemsRepository(
    client,
    new RequestContext(authUserId ?? '')
  );
  return { repo, client };
}

const baseRow = {
  id: 'pi-1',
  user_id: USER_A,
  kind: 'purchase' as const,
  name: 'Leche',
  amount_base_minor: 2500,
  done: false,
  done_at: null,
  converted_transaction_id: null,
  created_at: '2026-10-06T10:00:00.000Z',
};

describe('SupabasePendingItemsRepository — contract', () => {
  it('create with amount sends snake_case payload and maps row back to domain', async () => {
    const query = createChainQuery({ data: baseRow, error: null });
    const { repo } = makeSupabaseRepo(query, USER_A);

    const created = await repo.create(USER_A, {
      kind: 'purchase',
      name: 'Leche',
      amountBaseMinor: 2500,
    });

    expect(query.insertArgs[0][0][0]).toEqual({
      user_id: USER_A,
      kind: 'purchase',
      name: 'Leche',
      amount_base_minor: 2500,
    });
    expect(created).toEqual({
      id: 'pi-1',
      userId: USER_A,
      kind: 'purchase',
      name: 'Leche',
      amountBaseMinor: 2500,
      done: false,
      doneAt: null,
      convertedTransactionId: null,
      createdAt: '2026-10-06T10:00:00.000Z',
    });
  });

  it('create without amount inserts amount_base_minor null', async () => {
    const query = createChainQuery({
      data: { ...baseRow, amount_base_minor: null },
      error: null,
    });
    const { repo } = makeSupabaseRepo(query, USER_A);

    await repo.create(USER_A, { kind: 'payment', name: 'Suscripción' });

    expect(query.insertArgs[0][0][0].amount_base_minor).toBeNull();
  });

  it('negative control: same user reaches the table, cross-user is rejected before any query', async () => {
    const query = createChainQuery({ data: [baseRow], error: null });

    const { repo: sameUserRepo, client } = makeSupabaseRepo(query, USER_A);
    const rows = await sameUserRepo.findByUser(USER_A);
    expect(rows).toHaveLength(1);
    expect(client.from).toHaveBeenCalledWith('pending_items');

    const { repo: crossUserRepo, client: crossClient } = makeSupabaseRepo(
      createChainQuery({ data: [], error: null }),
      USER_B
    );
    await expect(crossUserRepo.findByUser(USER_A)).rejects.toThrow(
      'Unauthorized'
    );
    expect(crossClient.from).not.toHaveBeenCalled();
  });

  it('unauthenticated caller is rejected before any query', async () => {
    const query = createChainQuery({ data: [], error: null });
    const { repo, client } = makeSupabaseRepo(query, null);
    await expect(repo.findByUser(USER_A)).rejects.toThrow('Unauthorized');
    expect(client.from).not.toHaveBeenCalled();
  });

  it('toggle to done patches done=true with done_at, and back with done_at=null', async () => {
    const doneRow = {
      ...baseRow,
      done: true,
      done_at: '2026-10-06T11:00:00.000Z',
    };
    const query = createChainQuery({ data: doneRow, error: null });
    const { repo } = makeSupabaseRepo(query, USER_A);

    await repo.update('pi-1', { done: true });
    expect(query.updateArgs[0][0].done).toBe(true);
    expect(query.updateArgs[0][0].done_at).toEqual(expect.any(String));

    query.updateArgs = [];
    await repo.update('pi-1', { done: false });
    expect(query.updateArgs[0][0].done).toBe(false);
    expect(query.updateArgs[0][0].done_at).toBeNull();
  });

  it('conversion patch only touches converted_transaction_id', async () => {
    const linkedRow = { ...baseRow, converted_transaction_id: 'tx-9' };
    const query = createChainQuery({ data: linkedRow, error: null });
    const { repo } = makeSupabaseRepo(query, USER_A);

    await repo.update('pi-1', { convertedTransactionId: 'tx-9' });

    expect(query.updateArgs[0][0]).toEqual({
      converted_transaction_id: 'tx-9',
    });
  });

  it('deleteCompleted scopes by user, done, and kind only when provided', async () => {
    const query = createChainQuery({ data: null, error: null });
    const { repo } = makeSupabaseRepo(query, USER_A);

    await repo.deleteCompleted(USER_A, 'purchase');
    expect(query.eqArgs.map((call: unknown[]) => call.join(':'))).toEqual([
      'user_id:' + USER_A,
      'done:true',
      'kind:purchase',
    ]);

    query.eqArgs = [];
    await repo.deleteCompleted(USER_A);
    expect(query.eqArgs.map((call: unknown[]) => call.join(':'))).toEqual([
      'user_id:' + USER_A,
      'done:true',
    ]);
  });
});

describe('LocalPendingItemsRepository — contract parity (real Dexie)', () => {
  let repo: LocalPendingItemsRepository;

  beforeEach(async () => {
    if (db.isOpen()) await db.delete();
    await db.open();
    await db.pendingItems.clear();
    repo = new LocalPendingItemsRepository();
  });

  afterAll(async () => {
    if (db.isOpen()) await db.delete();
  });

  it('create → findByUser round trip keeps fields and orders by createdAt', async () => {
    const first = await repo.create(USER_A, {
      kind: 'purchase',
      name: 'Leche',
      amountBaseMinor: 2500,
    });
    const second = await repo.create(USER_A, { kind: 'payment', name: 'Luz' });

    const rows = await repo.findByUser(USER_A);
    expect(rows.map((r) => r.id)).toEqual([first.id, second.id]);
    expect(rows[0]).toMatchObject({
      userId: USER_A,
      kind: 'purchase',
      name: 'Leche',
      amountBaseMinor: 2500,
      done: false,
      doneAt: null,
      convertedTransactionId: null,
    });
  });

  it('toggle cycle sets doneAt on done and clears it on undo — same contract as Supabase impl', async () => {
    const item = await repo.create(USER_A, { kind: 'purchase', name: 'Pan' });

    const done = await repo.update(item.id, { done: true });
    expect(done.done).toBe(true);
    expect(done.doneAt).toEqual(expect.any(String));

    const undone = await repo.update(item.id, { done: false });
    expect(undone.done).toBe(false);
    expect(undone.doneAt).toBeNull();
  });

  it('convertedTransactionId persists and the item keeps its done state', async () => {
    const item = await repo.create(USER_A, {
      kind: 'payment',
      name: 'Internet',
    });
    await repo.update(item.id, { done: true });

    const linked = await repo.update(item.id, {
      convertedTransactionId: 'tx-9',
    });
    expect(linked.convertedTransactionId).toBe('tx-9');
    expect(linked.done).toBe(true);

    const reloaded = (await repo.findByUser(USER_A)).find(
      (r) => r.id === item.id
    );
    expect(reloaded?.convertedTransactionId).toBe('tx-9');
  });

  it('deleteCompleted removes only done items of the given kind and keeps everything else', async () => {
    const activePurchase = await repo.create(USER_A, {
      kind: 'purchase',
      name: 'activa',
    });
    const donePurchase = await repo.create(USER_A, {
      kind: 'purchase',
      name: 'comprada',
    });
    await repo.update(donePurchase.id, { done: true });
    const donePayment = await repo.create(USER_A, {
      kind: 'payment',
      name: 'pagada',
    });
    await repo.update(donePayment.id, { done: true });

    await repo.deleteCompleted(USER_A, 'purchase');

    const remaining = await repo.findByUser(USER_A);
    expect(remaining.map((r) => r.id).sort()).toEqual(
      [activePurchase.id, donePayment.id].sort()
    );
  });

  it('multi-user isolation: findByUser of user B never returns user A items', async () => {
    await repo.create(USER_A, { kind: 'purchase', name: 'solo de A' });

    const rowsB = await repo.findByUser(USER_B);
    expect(rowsB).toHaveLength(0);
  });

  it('update of a non-existent id throws', async () => {
    await expect(repo.update('missing-id', { done: true })).rejects.toThrow(
      'Pending item not found'
    );
  });
});
