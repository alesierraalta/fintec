import {
  ANALYSIS_TIMEOUT_MS,
  POST,
  maxDuration,
} from '@/app/api/ai/capture-batch/route';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/ai/rate-limiter';
import {
  extractCapturedTransactions,
  isAudioCaptureAvailable,
} from '@/lib/ai/voice-capture/capture-service';
import { createServerAppRepository } from '@/repositories/factory';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/lib/ai/rate-limiter', () => ({ checkRateLimit: jest.fn() }));
jest.mock('@/lib/ai/voice-capture/capture-service', () => ({
  extractCapturedTransactions: jest.fn(),
  isAudioCaptureAvailable: jest.fn(),
}));
jest.mock('@/repositories/factory', () => ({
  createServerAppRepository: jest.fn(),
}));
jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockCreateClient = createClient as jest.Mock;
const mockRateLimit = checkRateLimit as jest.Mock;
const mockExtract = extractCapturedTransactions as jest.Mock;
const mockAudioAvailable = isAudioCaptureAvailable as jest.Mock;
const mockRepo = createServerAppRepository as jest.Mock;

const image = (name = 'shot.png', type = 'image/png', size = 10) =>
  new File([new Uint8Array(size)], name, { type });

function request(fields: Record<string, (File | string)[]>) {
  const form = new FormData();
  for (const [key, values] of Object.entries(fields)) {
    for (const value of values) form.append(key, value);
  }
  return new Request('http://localhost/api/ai/capture-batch', {
    method: 'POST',
    body: form,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    },
  });
  mockRateLimit.mockResolvedValue({ success: true });
  mockAudioAvailable.mockReturnValue(true);
  mockRepo.mockReturnValue({
    accounts: {
      findByUserId: jest.fn().mockResolvedValue([
        { id: 'acc', name: 'Binance', currencyCode: 'USDT', active: true },
        { id: 'old', name: 'Old', currencyCode: 'USD', active: false },
      ]),
    },
    categories: {
      findActive: jest
        .fn()
        .mockResolvedValue([{ id: 'cine', name: 'Cine', kind: 'EXPENSE' }]),
    },
  });
  mockExtract.mockResolvedValue([{ amount: 5 }]);
});

describe('POST /api/ai/capture-batch', () => {
  it('rejects unauthenticated requests', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    });
    const res = await POST(request({ images: [image()] }));
    expect(res.status).toBe(401);
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('rejects when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ success: false });
    const res = await POST(request({ images: [image()] }));
    expect(res.status).toBe(429);
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('requires at least one screenshot', async () => {
    const res = await POST(request({ note: ['todo es del cine'] }));
    expect(res.status).toBe(400);
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('rejects more than 10 screenshots', async () => {
    const res = await POST(
      request({ images: Array.from({ length: 11 }, () => image()) })
    );
    expect(res.status).toBe(400);
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('rejects a non-image screenshot and a non-audio recording', async () => {
    const badImage = await POST(
      request({ images: [image('a.pdf', 'application/pdf')] })
    );
    const badAudio = await POST(
      request({
        images: [image()],
        audio: [image('nota.png', 'image/png')],
      })
    );
    expect([badImage.status, badAudio.status]).toEqual([400, 400]);
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('rejects files over the size limits', async () => {
    const bigImage = await POST(
      request({ images: [image('big.png', 'image/png', 10 * 1024 * 1024 + 1)] })
    );
    const bigAudio = await POST(
      request({
        images: [image()],
        audio: [image('n.webm', 'audio/webm', 15 * 1024 * 1024 + 1)],
      })
    );
    expect([bigImage.status, bigAudio.status]).toEqual([413, 413]);
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('returns 503 for audio when no audio-capable model is configured', async () => {
    mockAudioAvailable.mockReturnValue(false);
    const res = await POST(
      request({
        images: [image()],
        audio: [image('n.webm', 'audio/webm')],
      })
    );
    expect(res.status).toBe(503);
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('allows well over the slowest observed analysis (58 s) and stops before the platform kills it', () => {
    expect(maxDuration).toBeGreaterThanOrEqual(120);
    expect(maxDuration).toBeLessThanOrEqual(300); // Vercel Hobby + Fluid max
    expect(ANALYSIS_TIMEOUT_MS).toBeLessThan(maxDuration * 1000);
    expect(ANALYSIS_TIMEOUT_MS).toBeGreaterThanOrEqual(110_000);
  });

  // AbortError is what a real aborted Gemini call raised in the TSP run.
  it.each(['TimeoutError', 'AbortError'])(
    'passes an abort signal and answers 504 with a clear message on %s',
    async (errorName) => {
      mockExtract.mockImplementation(async () => {
        throw new DOMException('timed out', errorName);
      });
      const res = await POST(request({ images: [image()] }));
      expect(res.status).toBe(504);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/menos capturas/);
      expect(mockExtract.mock.calls[0][0].abortSignal).toBeInstanceOf(
        AbortSignal
      );
    }
  );

  it('uses only the server-side accounts and categories, ignoring client ones', async () => {
    const res = await POST(
      request({
        images: [image(), image('b.jpg', 'image/jpeg')],
        audio: [image('n.webm', 'audio/webm;codecs=opus')],
        note: ['lo del 3 fue el cine'],
        accounts: [JSON.stringify([{ id: 'stolen', currencyCode: 'USD' }])],
      })
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: [{ amount: 5 }],
    });
    const args = mockExtract.mock.calls[0][0];
    expect(args.accounts).toEqual([
      { id: 'acc', name: 'Binance', currencyCode: 'USDT' },
    ]);
    expect(args.categories).toEqual([
      { id: 'cine', name: 'Cine', kind: 'EXPENSE' },
    ]);
    expect(args.images).toHaveLength(2);
    expect(args.images[1].mediaType).toBe('image/jpeg');
    expect(args.audio.mediaType).toBe('audio/webm');
    expect(args.note).toBe('lo del 3 fue el cine');
  });
});
