/**
 * @jest-environment node
 */
import { POST } from '@/app/api/waitlist/route';
import { NextRequest } from 'next/server';
import { checkWaitlistRateLimit } from '@/lib/waitlist/rate-limiter';
import { createClient } from '@/lib/supabase/server';
import { createServerWaitlistRepository } from '@/repositories/factory';

jest.mock('@/lib/waitlist/rate-limiter', () => ({
  checkWaitlistRateLimit: jest.fn(),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerWaitlistRepository: jest.fn(),
}));

describe('waitlist route handler', () => {
  let mockSupabase: any;
  let mockWaitlistRepository: { create: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = { from: jest.fn().mockReturnThis() };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    mockWaitlistRepository = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    (createServerWaitlistRepository as jest.Mock).mockReturnValue(
      mockWaitlistRepository
    );

    (checkWaitlistRateLimit as jest.Mock).mockResolvedValue({ success: true });
  });

  const createRequest = (
    bodyOrFactory: any,
    forwardedFor: string | null = '127.0.0.1'
  ) =>
    ({
      json:
        typeof bodyOrFactory === 'function'
          ? bodyOrFactory
          : async () => bodyOrFactory,
      headers: {
        get: (key: string) => {
          if (key.toLowerCase() === 'x-forwarded-for') return forwardedFor;
          return null;
        },
      },
    }) as unknown as NextRequest;

  it('returns 201 for valid email', async () => {
    const req = createRequest({ email: 'test@example.com' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(checkWaitlistRateLimit).toHaveBeenCalledWith('127.0.0.1');
    expect(createServerWaitlistRepository).toHaveBeenCalledWith({
      supabase: mockSupabase,
    });
    expect(mockWaitlistRepository.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      source: 'landing',
      referrer: null,
    });
  });

  it('falls back to unknown IP when proxy header is absent', async () => {
    const res = await POST(createRequest({ email: 'test@example.com' }, null));

    expect(res.status).toBe(201);
    expect(checkWaitlistRateLimit).toHaveBeenCalledWith('unknown');
  });

  it('persists referrer metadata when provided', async () => {
    const res = await POST(
      createRequest({ email: 'test@example.com', referrer: 'campaign-1' })
    );

    expect(res.status).toBe(201);
    expect(mockWaitlistRepository.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      source: 'landing',
      referrer: 'campaign-1',
    });
  });

  it('returns 429 when rate limit check fails', async () => {
    (checkWaitlistRateLimit as jest.Mock).mockResolvedValue({ success: false });

    const res = await POST(createRequest({ email: 'test@example.com' }));

    expect(res.status).toBe(429);
    expect(mockWaitlistRepository.create).not.toHaveBeenCalled();
  });

  it('returns fake success for honeypot submissions without persisting', async () => {
    const res = await POST(
      createRequest({ email: 'bot@example.com', honeypot: 'spam-link' })
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(mockWaitlistRepository.create).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid email', async () => {
    const req = createRequest({ email: 'invalid-email' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid email address');
  });

  it('returns 409 for duplicate email registration', async () => {
    mockWaitlistRepository.create.mockRejectedValue(new Error('duplicate key'));

    const res = await POST(createRequest({ email: 'test@example.com' }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('Email already registered');
  });

  it('returns 500 for repository failures', async () => {
    mockWaitlistRepository.create.mockRejectedValue(new Error('db offline'));

    const res = await POST(createRequest({ email: 'test@example.com' }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Failed to join waitlist. Please try again.');
  });

  it('returns 500 when request body parsing explodes', async () => {
    const res = await POST(
      createRequest(() => Promise.reject(new Error('invalid json')))
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('returns 500 when rate limit infrastructure throws', async () => {
    (checkWaitlistRateLimit as jest.Mock).mockRejectedValue(
      new Error('upstash offline')
    );

    const res = await POST(createRequest({ email: 'test@example.com' }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
