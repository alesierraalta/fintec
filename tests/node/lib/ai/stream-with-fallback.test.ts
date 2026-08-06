/**
 * Unit tests for `streamWithFallback` (lib/ai/stream-with-fallback.ts).
 *
 * Covers:
 *   - Providers with an empty fallback list call `streamText` once with the
 *     given model and `params.onFinish` passed through unchanged.
 *   - Adapter provider options are forwarded to `streamText`.
 *   - A provider with fallback models walks the chain on a transient
 *     (quota) error, building fallback models through the adapter factory.
 *   - A non-transient error is NOT retried and propagates immediately.
 */

const mockStreamText = jest.fn();
const mockGetProviderAdapter = jest.fn();

jest.mock('ai', () => ({
  streamText: (...args: unknown[]) => mockStreamText(...args),
  stepCountIs: (n: number) => ({ stepCountIs: n }),
}));

jest.mock('@/lib/ai/providers', () => ({
  getProviderAdapter: (...args: unknown[]) => mockGetProviderAdapter(...args),
}));

jest.mock('@/lib/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { streamWithFallback } from '@/lib/ai/stream-with-fallback';

const baseParams = {
  messages: [],
  system: 'sys',
  tools: {},
  temperature: 0.7,
  userId: 'user-1',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('streamWithFallback — provider without fallback models', () => {
  it('calls streamText once with the given model, passing onFinish through unchanged', async () => {
    mockGetProviderAdapter.mockReturnValue({
      id: 'openai',
      modelId: 'gpt-5',
      createModel: jest.fn(),
      fallbackModels: [],
      isTransient: jest.fn(() => false),
    });
    const onFinish = jest.fn();
    const model = { name: 'gpt-5' };
    mockStreamText.mockReturnValue({ result: 'ok' });

    const result = await streamWithFallback({
      ...baseParams,
      model,
      onFinish,
    });

    expect(mockStreamText).toHaveBeenCalledTimes(1);
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({ model, system: 'sys', onFinish })
    );
    expect(mockStreamText).not.toHaveBeenCalledWith(
      expect.objectContaining({ providerOptions: expect.anything() })
    );
    expect(result).toEqual({ result: 'ok' });
  });

  it('forwards adapter provider options to streamText', async () => {
    const providerOptions = {
      nvidia: {
        nvidia: {
          chat_template_kwargs: {
            thinking: true,
            reasoning_effort: 'high',
          },
        },
      },
    };
    mockGetProviderAdapter.mockReturnValue({
      id: 'nvidia',
      modelId: 'deepseek-ai/deepseek-v4-flash',
      createModel: jest.fn(),
      fallbackModels: [],
      isTransient: jest.fn(() => false),
      providerOptions,
    });
    mockStreamText.mockReturnValue({ result: 'ok' });

    await streamWithFallback({
      ...baseParams,
      model: { name: 'deepseek-ai/deepseek-v4-flash' },
    });

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({ providerOptions })
    );
  });
});

describe('streamWithFallback — google provider fallback chain', () => {
  it('falls back to the next model in the chain on a transient (quota) error', async () => {
    const mockCreateModel = jest.fn((modelId: string) => ({
      fallback: modelId,
    }));
    mockGetProviderAdapter.mockReturnValue({
      id: 'google',
      modelId: 'gemini-3-flash',
      createModel: mockCreateModel,
      fallbackModels: ['gemini-2.5-flash'],
      isTransient: jest.fn(() => true),
    });
    mockStreamText
      .mockImplementationOnce(() => {
        throw new Error('quota exceeded');
      })
      .mockImplementationOnce(() => ({ result: 'fallback-ok' }));

    const result = await streamWithFallback({
      ...baseParams,
      model: { name: 'gemini-3-flash' },
    });

    expect(mockStreamText).toHaveBeenCalledTimes(2);
    expect(mockCreateModel).toHaveBeenCalledWith('gemini-2.5-flash');
    expect(mockStreamText).toHaveBeenLastCalledWith(
      expect.objectContaining({ model: { fallback: 'gemini-2.5-flash' } })
    );
    expect(result).toEqual({ result: 'fallback-ok' });
  });

  it('propagates a non-transient error immediately without retrying', async () => {
    mockGetProviderAdapter.mockReturnValue({
      id: 'google',
      modelId: 'gemini-3-flash',
      createModel: jest.fn(),
      fallbackModels: ['gemini-2.5-flash'],
      isTransient: jest.fn(() => false),
    });
    mockStreamText.mockImplementationOnce(() => {
      throw new Error('some other failure');
    });

    await expect(
      streamWithFallback({
        ...baseParams,
        model: { name: 'gemini-3-flash' },
      })
    ).rejects.toThrow('some other failure');

    expect(mockStreamText).toHaveBeenCalledTimes(1);
  });

  it('throws a generic error when every model in the chain hits a transient error', async () => {
    mockGetProviderAdapter.mockReturnValue({
      id: 'google',
      modelId: 'gemini-3-flash',
      createModel: jest.fn((modelId: string) => ({ fallback: modelId })),
      fallbackModels: ['gemini-2.5-flash'],
      isTransient: jest.fn(() => true),
    });
    mockStreamText.mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    await expect(
      streamWithFallback({
        ...baseParams,
        model: { name: 'gemini-3-flash' },
      })
    ).rejects.toThrow('All AI models exhausted.');
  });
});
