import { RequestContext } from '@/lib/cache/request-context';
import { SupabaseFeedbacksRepository } from '@/repositories/supabase/feedback-repository-impl';
import { LocalFeedbacksRepository } from '@/repositories/local/feedback-repository-impl';

function createMockQuery(result: { data: unknown; error: unknown }) {
  const q: any = {};
  q.select = jest.fn(() => q);
  q.eq = jest.fn(() => q);
  q.insert = jest.fn(() => q);
  q.single = jest.fn(() => Promise.resolve(result));
  return q;
}

function createMockClient(query: any) {
  return {
    from: jest.fn(() => query),
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
  } as any;
}

describe('Feedbacks RLS — SupabaseFeedbacksRepository', () => {
  const userA = 'user-a-uuid';
  const userB = 'user-b-uuid';
  const dto = { target_type: 'report', target_id: 'r-123', sentiment: 'up' as const, comment: null };

  it('create returns row with id/created_at', async () => {
    const row = { id: 'fb-1', user_id: userA, target_type: dto.target_type, target_id: dto.target_id, sentiment: 'up', comment: null, created_at: new Date().toISOString() };
    const query = createMockQuery({ data: row, error: null });
    const client = {
      from: jest.fn(() => ({ insert: jest.fn(() => ({ select: jest.fn(() => query) })) })),
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userA } } }) },
    } as any;
    const repo = new SupabaseFeedbacksRepository(client, new RequestContext(userA));
    const result = await repo.create(userA, dto);
    expect(result.id).toBe('fb-1');
    expect(result.created_at).toBeDefined();
    expect(result.user_id).toBe(userA);
  });

  it('duplicate (user,target) surfaces 23505', async () => {
    const dupError: any = { code: '23505', message: 'duplicate key' };
    const query = createMockQuery({ data: null, error: dupError });
    const client = {
      from: jest.fn(() => ({ insert: jest.fn(() => ({ select: jest.fn(() => query) })) })),
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: userA } } }) },
    } as any;
    const repo = new SupabaseFeedbacksRepository(client, new RequestContext(userA));
    await expect(repo.create(userA, dto)).rejects.toMatchObject({ code: '23505' });
  });

  it('RLS: user B cannot query user A (Unauthorized) and same-user not found returns null', async () => {
    const notFound: any = { code: 'PGRST116', message: 'no rows' };
    const query = createMockQuery({ data: null, error: notFound });
    const client = createMockClient(query);
    const repo = new SupabaseFeedbacksRepository(client, new RequestContext(userB));
    await expect(repo.findByUserAndTarget(userA, dto.target_type, dto.target_id)).rejects.toThrow('Unauthorized');
    const sameUserNull = await repo.findByUserAndTarget(userB, dto.target_type, dto.target_id);
    expect(sameUserNull).toBeNull();
  });

  it('findByUserAndTarget returns row when exists', async () => {
    const row = { id: 'fb-1', user_id: userA, target_type: dto.target_type, target_id: dto.target_id, sentiment: 'up', comment: 'great', created_at: new Date().toISOString() };
    const query = createMockQuery({ data: row, error: null });
    const client = createMockClient(query);
    const repo = new SupabaseFeedbacksRepository(client, new RequestContext(userA));
    const found = await repo.findByUserAndTarget(userA, dto.target_type, dto.target_id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe('fb-1');
  });
});

describe('Feedbacks — LocalFeedbacksRepository (fallback when no real Supabase)', () => {
  it('create returns row with id/created_at and findByUserAndTarget scopes correctly', async () => {
    const repo = new LocalFeedbacksRepository();
    const userA = 'user-a';
    const userB = 'user-b';
    const localDto = { target_type: 'report', target_id: 'r-123', sentiment: 'up' as const, comment: null };
    const created = await repo.create(userA, localDto);
    expect(created.id).toBeDefined();
    expect(created.created_at).toBeDefined();
    expect(created.user_id).toBe(userA);
    const foundA = await repo.findByUserAndTarget(userA, localDto.target_type, localDto.target_id);
    expect(foundA).not.toBeNull();
    expect(foundA!.id).toBe(created.id);
    const foundB = await repo.findByUserAndTarget(userB, localDto.target_type, localDto.target_id);
    expect(foundB).toBeNull();
  });

  it('duplicate (user,target) throws 23505', async () => {
    const repo = new LocalFeedbacksRepository();
    const userA = 'user-a';
    const localDto = { target_type: 'report', target_id: 'dup-1', sentiment: 'down' as const };
    await repo.create(userA, localDto);
    await expect(repo.create(userA, localDto)).rejects.toMatchObject({ code: '23505' });
  });
});
