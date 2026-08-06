/**
 * Unit tests for `streamWithFallback`, moved verbatim (no logic changes)
 * from app/api/chat/route.ts:269-326 to lib/ai/stream-with-fallback.ts.
 *
 * Covers:
 *   - Non-google providers call `streamText` once with the given model and
 *     `params.onFinish` passed through unchanged.
 *   - Google provider walks `getGoogleModelFallbackChain()`'s chain on a
 *     quota-exceeded error, falling back to the next model.
 *   - A non-quota error is NOT retried and propagates immediately.
 */

const mockStreamText = jest.fn();
const mockGoogle = jest.fn((modelName: string) => ({ modelName }));
const mockGetGoogleModelFallbackChain = jest.fn();
const mockIsQuotaExceededError = jest.fn();

jest.mock('ai', () => ({
  streamText: (...args: unknown[]) => mockStreamText(...args),
  stepCountIs: (n: number) => ({ stepCountIs: n }),
}));

jest.mock('@ai-sdk/google', () => ({
  google: (...args: unknown[]) => mockGoogle(...(args as [string])),
}));

jest.mock('@/lib/ai/config', () => ({
  AI_CONFIG: { provider: 'openai' },
  getGoogleModelFallbackChain: () => mockGetGoogleModelFallbackChain(),
  isQuotaExceededError: (...args: unknown[]) =>
    mockIsQuotaExceededError(...args),
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { streamWithFallback } from '@/lib/ai/stream-with-fallback';
import { AI_CONFIG } from '@/lib/ai/config';

describe('streamWithFallback — non-google provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AI_CONFIG as any).provider = 'openai';
  });

  it('calls streamText once with the given model, passing onFinish through unchanged', async () => {
    const onFinish = jest.fn();
    const model = { name: 'gpt-5' };
    mockStreamText.mockReturnValue({ result: 'ok' });

    const result = await streamWithFallback({
      model,
      messages: [],
      system: 'sys',
      tools: {},
      temperature: 0.7,
      userId: 'user-1',
      onFinish,
    });

    expect(mockStreamText).toHaveBeenCalledTimes(1);
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({ model, system: 'sys', onFinish })
    );
    expect(result).toEqual({ result: 'ok' });
  });
});

describe('streamWithFallback — google provider fallback chain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AI_CONFIG as any).provider = 'google';
    mockGetGoogleModelFallbackChain.mockReturnValue({
      primary: 'gemini-3-flash',
      fallbacks: ['gemini-2.5-flash'],
    });
  });

  it('falls back to the next model in the chain on a quota-exceeded error', async () => {
    mockIsQuotaExceededError.mockReturnValue(true);
    mockStreamText
      .mockImplementationOnce(() => {
        throw new Error('quota exceeded');
      })
      .mockImplementationOnce(() => ({ result: 'fallback-ok' }));

    const result = await streamWithFallback({
      model: { name: 'primary-model' },
      messages: [],
      system: 'sys',
      tools: {},
      temperature: 0.7,
      userId: 'user-1',
    });

    expect(mockStreamText).toHaveBeenCalledTimes(2);
    expect(mockGoogle).toHaveBeenCalledWith('gemini-2.5-flash');
    expect(result).toEqual({ result: 'fallback-ok' });
  });

  it('propagates a non-quota error immediately without retrying', async () => {
    mockIsQuotaExceededError.mockReturnValue(false);
    mockStreamText.mockImplementationOnce(() => {
      throw new Error('some other failure');
    });

    await expect(
      streamWithFallback({
        model: { name: 'primary-model' },
        messages: [],
        system: 'sys',
        tools: {},
        temperature: 0.7,
        userId: 'user-1',
      })
    ).rejects.toThrow('some other failure');

    expect(mockStreamText).toHaveBeenCalledTimes(1);
  });
});
