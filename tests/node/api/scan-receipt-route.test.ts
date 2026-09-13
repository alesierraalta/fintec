import { POST } from '@/app/api/ai/scan-receipt/route';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import { scanReceiptWithAI } from '@/lib/ai/receipt-scanner/scanner-service';
import { createServerAppRepository } from '@/repositories/factory';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/ai/rate-limiter', () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock('@/lib/ai/receipt-scanner/scanner-service', () => ({
  scanReceiptWithAI: jest.fn(),
}));

jest.mock('@/repositories/factory', () => ({
  createServerAppRepository: jest.fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('/api/ai/scan-receipt API Route', () => {
  const mockCreateClient = createClient as jest.MockedFunction<
    typeof createClient
  >;
  const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<
    typeof checkRateLimit
  >;
  const mockScanReceiptWithAI = scanReceiptWithAI as jest.MockedFunction<
    typeof scanReceiptWithAI
  >;
  const mockCreateServerAppRepository =
    createServerAppRepository as jest.MockedFunction<
      typeof createServerAppRepository
    >;

  const mockUser = { id: 'user-test-123', email: 'test@example.com' };

  const validScannedResult = {
    type: 'EXPENSE' as const,
    confidence: 'HIGH' as const,
    amount: 50.0,
    currency: 'USD',
    date: '2026-09-12',
    referenceId: 'REF-12345',
    suggestedDescription: 'Compra de suministros',
    formattedNotes: 'Comprobante procesado',
    tags: ['comprobante-digital'],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    } as any);

    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60000,
    } as any);

    mockScanReceiptWithAI.mockResolvedValue(validScannedResult as any);

    mockCreateServerAppRepository.mockReturnValue({
      accounts: {
        findByUserId: jest.fn().mockResolvedValue([
          {
            id: 'acc-1',
            name: 'Banesco',
            currencyCode: 'VES',
            type: 'CHECKING',
            active: true,
          },
          {
            id: 'acc-2',
            name: 'Zelle USD',
            currencyCode: 'USD',
            type: 'WALLET',
            active: true,
          },
          {
            id: 'acc-3',
            name: 'Old Account',
            currencyCode: 'USD',
            type: 'SAVINGS',
            active: false,
          },
        ]),
      },
      categories: {
        findActive: jest.fn().mockResolvedValue([
          {
            id: 'cat-1',
            name: 'Alimentación',
            kind: 'EXPENSE',
            active: true,
          },
          {
            id: 'cat-2',
            name: 'Salario',
            kind: 'INCOME',
            active: true,
          },
        ]),
      },
    } as any);
  });

  it('returns 401 Unauthorized when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Auth session missing'),
        }),
      },
    } as any);

    const req = new Request('http://localhost:3000/api/ai/scan-receipt', {
      method: 'POST',
      body: JSON.stringify({ image: 'data:image/png;base64,AAAA' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 60000,
    } as any);

    const req = new Request('http://localhost:3000/api/ai/scan-receipt', {
      method: 'POST',
      body: JSON.stringify({ image: 'data:image/png;base64,AAAA' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Rate limit exceeded');
  });

  it('returns 400 when JSON body is missing image', async () => {
    const req = new Request('http://localhost:3000/api/ai/scan-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Missing or invalid image');
  });

  it('returns 400 when image format is not data:image/ or URL', async () => {
    const req = new Request('http://localhost:3000/api/ai/scan-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: 'not-a-valid-image-format' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('El formato de imagen no es válido');
  });

  it('returns 413 Payload Too Large when base64 string exceeds 14MB', async () => {
    // 15MB dummy string
    const oversizedString =
      'data:image/png;base64,' + 'A'.repeat(15 * 1024 * 1024);

    const req = new Request('http://localhost:3000/api/ai/scan-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: oversizedString }),
    });

    const res = await POST(req);
    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('10MB');
  });

  it('processes valid JSON request and loads server accounts when accounts array is empty', async () => {
    const req = new Request('http://localhost:3000/api/ai/scan-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        expectedType: 'EXPENSE',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data).toEqual(validScannedResult);

    expect(mockScanReceiptWithAI).toHaveBeenCalledWith({
      image: expect.stringContaining('data:image/png;base64,'),
      accounts: [
        { id: 'acc-1', name: 'Banesco', currencyCode: 'VES', type: 'CHECKING' },
        { id: 'acc-2', name: 'Zelle USD', currencyCode: 'USD', type: 'WALLET' },
      ],
      categories: [
        {
          id: 'cat-1',
          name: 'Alimentación',
          kind: 'EXPENSE',
          description: undefined,
          icon: undefined,
        },
        {
          id: 'cat-2',
          name: 'Salario',
          kind: 'INCOME',
          description: undefined,
          icon: undefined,
        },
      ],
      expectedType: 'EXPENSE',
    });
  });

  it('passes client-provided categories directly without repository fallback', async () => {
    const customCategories = [
      { id: 'custom-1', name: 'Farmacia', kind: 'EXPENSE' as const },
    ];

    const req = new Request('http://localhost:3000/api/ai/scan-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        categories: customCategories,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockScanReceiptWithAI).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: customCategories,
      })
    );
  });

  it('returns 500 when scanReceiptWithAI encounters an error', async () => {
    mockScanReceiptWithAI.mockRejectedValue(
      new Error('AI extraction failed: Vision model timeout')
    );

    const req = new Request('http://localhost:3000/api/ai/scan-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('AI extraction failed: Vision model timeout');
  });
});
