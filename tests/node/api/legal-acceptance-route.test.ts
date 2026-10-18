import { GET, POST } from '@/app/api/legal/acceptance/route';
import { createClient } from '@/lib/supabase/server';
import { CURRENT_LEGAL_VERSION } from '@/lib/legal/legal-config';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

describe('legal acceptance route', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;

  const buildRequest = (body?: unknown) =>
    ({
      json: jest
        .fn()
        .mockImplementation(() =>
          body === undefined ? Promise.reject(new Error('no body')) : body
        ),
      headers: new Headers({ 'user-agent': 'jest' }),
    }) as any;

  const buildSupabase = (options: {
    user?: { id: string } | null;
    selectResult?: { data: unknown; error: unknown };
    upsertError?: unknown;
  }) => {
    const upsert = jest
      .fn()
      .mockResolvedValue({ error: options.upsertError ?? null });

    const maybeSingle = jest
      .fn()
      .mockResolvedValue(options.selectResult ?? { data: null, error: null });

    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle,
      upsert,
    };

    return {
      client: {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: options.user ?? null },
            error: options.user ? null : new Error('no session'),
          }),
        },
        from: jest.fn().mockReturnValue(chain),
      },
      upsert,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated reads', async () => {
    const { client } = buildSupabase({ user: null });
    mockCreateClient.mockResolvedValue(client as any);

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it('reports the current version as not accepted when no record exists', async () => {
    const { client } = buildSupabase({
      user: { id: 'user-1' },
      selectResult: { data: null, error: null },
    });
    mockCreateClient.mockResolvedValue(client as any);

    const response = await GET();
    const body = await response.json();

    expect(body).toEqual({
      currentVersion: CURRENT_LEGAL_VERSION,
      accepted: false,
      acceptedAt: null,
    });
  });

  it('reports acceptance when a record exists for the current version', async () => {
    const { client } = buildSupabase({
      user: { id: 'user-1' },
      selectResult: {
        data: {
          legal_version: CURRENT_LEGAL_VERSION,
          accepted_at: '2026-08-05T00:00:00.000Z',
        },
        error: null,
      },
    });
    mockCreateClient.mockResolvedValue(client as any);

    const body = await (await GET()).json();

    expect(body.accepted).toBe(true);
    expect(body.acceptedAt).toBe('2026-08-05T00:00:00.000Z');
  });

  it('rejects unauthenticated acceptance writes', async () => {
    const { client } = buildSupabase({ user: null });
    mockCreateClient.mockResolvedValue(client as any);

    const response = await POST(buildRequest({ source: 'signup' }));

    expect(response.status).toBe(401);
  });

  it('records the acceptance with the current version', async () => {
    const { client, upsert } = buildSupabase({ user: { id: 'user-1' } });
    mockCreateClient.mockResolvedValue(client as any);

    const response = await POST(buildRequest({ source: 'signup' }));

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        legal_version: CURRENT_LEGAL_VERSION,
        source: 'signup',
      }),
      expect.objectContaining({ onConflict: 'user_id,legal_version' })
    );
  });

  it('falls back to re-consent for an unknown source', async () => {
    const { client, upsert } = buildSupabase({ user: { id: 'user-1' } });
    mockCreateClient.mockResolvedValue(client as any);

    await POST(buildRequest({ source: 'not-a-source' }));

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ source: 're-consent' }),
      expect.anything()
    );
  });

  it('surfaces a failure to persist the acceptance', async () => {
    const { client } = buildSupabase({
      user: { id: 'user-1' },
      upsertError: new Error('db down'),
    });
    mockCreateClient.mockResolvedValue(client as any);

    const response = await POST(buildRequest({ source: 'signup' }));

    expect(response.status).toBe(500);
  });
});
