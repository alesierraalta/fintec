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

describe('/api/ai/scan-receipt Multipart Form-Data Route Suite', () => {
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

  const mockUser = { id: 'user-multipart-tester', email: 'tester@fintec.com' };

  const validScannedResult = {
    type: 'EXPENSE' as const,
    confidence: 'HIGH' as const,
    amount: 125.0,
    currency: 'USD',
    date: '2026-10-17',
    referenceId: 'FORM-DATA-99',
    suggestedDescription: 'Repuestos Automotrices',
    formattedNotes: 'Comprobante procesado en lote',
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
            id: 'acc-ves-1',
            name: 'Banesco Corriente',
            currencyCode: 'VES',
            type: 'CHECKING',
            active: true,
          },
        ]),
      },
      categories: {
        findActive: jest.fn().mockResolvedValue([
          {
            id: 'cat-auto-1',
            name: 'Transporte',
            kind: 'EXPENSE',
            icon: 'car',
          },
        ]),
      },
    } as any);
  });

  it('successfully processes multipart/form-data upload with a valid image file', async () => {
    const formData = new FormData();
    const imageBlob = new Blob(['fake-png-binary-data'], { type: 'image/png' });
    formData.append('file', imageBlob, 'factura-taller.png');
    formData.append('expectedType', 'EXPENSE');

    const req = new Request('http://localhost:3000/api/ai/scan-receipt', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(validScannedResult);

    expect(mockScanReceiptWithAI).toHaveBeenCalledWith(
      expect.objectContaining({
        image: expect.stringMatching(/^data:image\/png;base64,/),
        expectedType: 'EXPENSE',
      })
    );
  });

  it('returns 400 when multipart form data is missing the file field', async () => {
    const formData = new FormData();
    formData.append('expectedType', 'EXPENSE');

    const req = new Request('http://localhost:3000/api/ai/scan-receipt', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('No image file provided in form data');
  });

  it('returns 400 when multipart uploaded file is not an image (e.g. PDF or plain text)', async () => {
    const formData = new FormData();
    const textBlob = new Blob(['fake plain text invoice'], {
      type: 'text/plain',
    });
    formData.append('file', textBlob, 'factura.txt');

    const req = new Request('http://localhost:3000/api/ai/scan-receipt', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe(
      'El archivo debe ser una imagen válida (PNG, JPG, WEBP)'
    );
  });

  it('returns 400 when multipart image file exceeds the 10MB size limit', async () => {
    const formData = new FormData();
    const bigBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024); // 10MB + 1KB
    const bigBlob = new Blob([bigBuffer], { type: 'image/jpeg' });
    formData.append('file', bigBlob, 'huge-scan.jpg');

    const req = new Request('http://localhost:3000/api/ai/scan-receipt', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('La imagen excede el límite máximo de 10MB');
  });

  it('parses client-supplied accounts and categories from multipart form-data', async () => {
    const formData = new FormData();
    const imageBlob = new Blob(['sample-img'], { type: 'image/webp' });
    formData.append('file', imageBlob, 'factura.webp');

    const customAccounts = [
      {
        id: 'custom-acc-1',
        name: 'Zelle USD',
        currencyCode: 'USD',
        type: 'WALLET',
      },
    ];
    const customCategories = [
      {
        id: 'custom-cat-1',
        name: 'Mantenimiento',
        kind: 'EXPENSE',
        icon: 'wrench',
      },
    ];

    formData.append('accounts', JSON.stringify(customAccounts));
    formData.append('categories', JSON.stringify(customCategories));

    const req = new Request('http://localhost:3000/api/ai/scan-receipt', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockScanReceiptWithAI).toHaveBeenCalledWith(
      expect.objectContaining({
        accounts: customAccounts,
        categories: customCategories,
      })
    );
  });

  it('gracefully handles malformed JSON in accounts and categories form fields without crashing', async () => {
    const formData = new FormData();
    const imageBlob = new Blob(['sample-img'], { type: 'image/jpeg' });
    formData.append('file', imageBlob, 'recibo.jpg');
    formData.append('accounts', '{invalid-json');
    formData.append('categories', 'not-even-json');

    const req = new Request('http://localhost:3000/api/ai/scan-receipt', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // Repository fallback was used because parsing failed
    expect(mockScanReceiptWithAI).toHaveBeenCalledWith(
      expect.objectContaining({
        accounts: expect.arrayContaining([
          expect.objectContaining({ id: 'acc-ves-1' }),
        ]),
        categories: expect.arrayContaining([
          expect.objectContaining({ id: 'cat-auto-1' }),
        ]),
      })
    );
  });

  it('sanitizes unrecognized expectedType values in multipart requests', async () => {
    const formData = new FormData();
    const imageBlob = new Blob(['sample-img'], { type: 'image/png' });
    formData.append('file', imageBlob, 'recibo.png');
    formData.append('expectedType', 'UNKNOWN_TYPE_INJECTION');

    const req = new Request('http://localhost:3000/api/ai/scan-receipt', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockScanReceiptWithAI).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedType: undefined,
      })
    );
  });
});
