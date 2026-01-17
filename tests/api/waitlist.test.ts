/**
 * @jest-environment node
 */
import { POST } from '@/app/api/waitlist/route';
import { NextRequest } from 'next/server';
import { checkWaitlistRateLimit } from '@/lib/waitlist/rate-limiter';
import { createClient } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('@/lib/waitlist/rate-limiter', () => ({
    checkWaitlistRateLimit: jest.fn(),
}));

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(),
}));

describe('Waitlist API Route', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Supabase mock
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnValue({ error: null }),
        };
        (createClient as jest.Mock).mockReturnValue(mockSupabase);

        // Setup Rate Limiter mock default to success
        (checkWaitlistRateLimit as jest.Mock).mockResolvedValue({ success: true });
    });

    const createRequest = (body: any) => {
        // Basic mock of NextRequest
        return {
            json: async () => body,
            headers: {
                get: (key: string) => {
                    if (key.toLowerCase() === 'x-forwarded-for') return '127.0.0.1';
                    return null;
                }
            }
        } as unknown as NextRequest;
    };

    it('should return 201 for valid email', async () => {
        const req = createRequest({ email: 'test@example.com' });
        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(201);
        expect(data.success).toBe(true);
        expect(mockSupabase.from).toHaveBeenCalledWith('waitlist');
    });

    it('should return 400 for invalid email', async () => {
        const req = createRequest({ email: 'invalid-email' });
        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe('Invalid email address');
    });
});
