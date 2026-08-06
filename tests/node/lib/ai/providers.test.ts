/**
 * Behavior tests for the multi-provider adapter factory (`lib/ai/providers.ts`).
 *
 * SDK constructors are mocked; no credentials or network calls are ever made.
 * Covers all four providers, NVIDIA base URL/model/options, missing-key errors
 * and unsupported-provider errors.
 */

const mockOpenai = jest.fn((modelId: string) => ({
  provider: 'openai',
  model: modelId,
}));
const mockGoogle = jest.fn((modelId: string) => ({
  provider: 'google',
  model: modelId,
}));
const mockAnthropic = jest.fn((modelId: string) => ({
  provider: 'anthropic',
  model: modelId,
}));
const mockCreateOpenAICompatible = jest.fn(() => ({
  languageModel: jest.fn((modelId: string) => ({
    provider: 'nvidia',
    model: modelId,
  })),
}));

jest.mock('@ai-sdk/openai', () => ({
  openai: (...args: unknown[]) => mockOpenai(...(args as [string])),
}));
jest.mock('@ai-sdk/google', () => ({
  google: (...args: unknown[]) => mockGoogle(...(args as [string])),
}));
jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: (...args: unknown[]) => mockAnthropic(...(args as [string])),
}));
jest.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: (...args: unknown[]) =>
    mockCreateOpenAICompatible(...args),
}));

import { AIConfigurationError, getProviderAdapter } from '@/lib/ai/providers';

const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('getProviderAdapter — openai', () => {
  it('builds an openai adapter with the configured model', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.OPENAI_MODEL = 'gpt-5';

    const adapter = getProviderAdapter();

    expect(adapter.id).toBe('openai');
    expect(adapter.modelId).toBe('gpt-5');
    expect(adapter.fallbackModels).toEqual([]);
    expect(adapter.createModel()).toEqual({
      provider: 'openai',
      model: 'gpt-5',
    });
    expect(adapter.createModel('gpt-5-mini')).toEqual({
      provider: 'openai',
      model: 'gpt-5-mini',
    });
  });

  it('defaults to gpt-4o when OPENAI_MODEL is not set', () => {
    process.env.AI_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'sk-test';
    delete process.env.OPENAI_MODEL;

    expect(getProviderAdapter().modelId).toBe('gpt-4o');
  });
});

describe('getProviderAdapter — google', () => {
  it('uses the primary model and exposes the rest as fallbacks', () => {
    process.env.AI_PROVIDER = 'google';
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'gg-test';
    process.env.GOOGLE_MODEL_FALLBACK_CHAIN = 'gemini-3-flash,gemini-2.5-flash';

    const adapter = getProviderAdapter();

    expect(adapter.id).toBe('google');
    expect(adapter.modelId).toBe('gemini-3-flash');
    expect(adapter.fallbackModels).toEqual(['gemini-2.5-flash']);
    expect(adapter.createModel('gemini-2.5-flash')).toEqual({
      provider: 'google',
      model: 'gemini-2.5-flash',
    });
  });

  it('preserves the default fallback chain when unconfigured', () => {
    process.env.AI_PROVIDER = 'google';
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'gg-test';
    delete process.env.GOOGLE_MODEL_FALLBACK_CHAIN;
    process.env.GOOGLE_MODEL = 'gemini-2.5-flash';

    const adapter = getProviderAdapter();

    expect(adapter.modelId).toBe('gemini-2.5-flash');
    expect(adapter.fallbackModels).toEqual(['gemini-2.5-flash-lite']);
  });
});

describe('getProviderAdapter — anthropic', () => {
  it('builds an anthropic adapter with the configured model', () => {
    process.env.AI_PROVIDER = 'anthropic';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.ANTHROPIC_MODEL = 'claude-4.5';

    const adapter = getProviderAdapter();

    expect(adapter.id).toBe('anthropic');
    expect(adapter.modelId).toBe('claude-4.5');
    expect(adapter.fallbackModels).toEqual([]);
    expect(adapter.createModel()).toEqual({
      provider: 'anthropic',
      model: 'claude-4.5',
    });
  });
});

describe('getProviderAdapter — nvidia', () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = 'nvidia';
    process.env.NVIDIA_API_KEY = 'nv-test-key';
    delete process.env.NVIDIA_BASE_URL;
    delete process.env.NVIDIA_MODEL;
  });

  it('creates an OpenAI-compatible provider with name, default base URL and api key', () => {
    getProviderAdapter();

    expect(mockCreateOpenAICompatible).toHaveBeenCalledWith({
      name: 'nvidia',
      baseURL: 'https://integrate.api.nvidia.com/v1',
      apiKey: 'nv-test-key',
    });
  });

  it('uses NVIDIA_BASE_URL when provided', () => {
    process.env.NVIDIA_BASE_URL = 'https://custom.nvidia.example/v1';

    getProviderAdapter();

    expect(mockCreateOpenAICompatible).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'https://custom.nvidia.example/v1' })
    );
  });

  it('defaults to the deepseek model and builds models through the provider', () => {
    const adapter = getProviderAdapter();

    expect(adapter.id).toBe('nvidia');
    expect(adapter.modelId).toBe('deepseek-ai/deepseek-v4-flash');
    expect(adapter.fallbackModels).toEqual([]);
    expect(adapter.createModel()).toEqual({
      provider: 'nvidia',
      model: 'deepseek-ai/deepseek-v4-flash',
    });
  });

  it('honors NVIDIA_MODEL override', () => {
    process.env.NVIDIA_MODEL = 'nvidia/llama-3.1-8b';

    expect(getProviderAdapter().modelId).toBe('nvidia/llama-3.1-8b');
  });

  it('exposes provider options equivalent to the Python extra_body', () => {
    const adapter = getProviderAdapter();

    expect(adapter.providerOptions).toEqual({
      nvidia: {
        chat_template_kwargs: {
          thinking: true,
          reasoning_effort: 'high',
        },
      },
    });
  });
});

describe('getProviderAdapter — configuration errors', () => {
  it.each([
    ['openai', 'OPENAI_API_KEY'],
    ['google', 'GOOGLE_GENERATIVE_AI_API_KEY'],
    ['anthropic', 'ANTHROPIC_API_KEY'],
    ['nvidia', 'NVIDIA_API_KEY'],
  ])(
    'throws a typed AIConfigurationError when %s key is missing',
    (provider, envVar) => {
      process.env.AI_PROVIDER = provider;
      delete process.env[envVar];

      expect(() => getProviderAdapter()).toThrow(AIConfigurationError);
      expect(() => getProviderAdapter()).toThrow(envVar);
    }
  );

  it('throws a typed AIConfigurationError for an unsupported provider', () => {
    process.env.AI_PROVIDER = 'ollama';

    expect(() => getProviderAdapter()).toThrow(AIConfigurationError);
    expect(() => getProviderAdapter()).toThrow(
      /Unsupported AI provider: ollama/
    );
  });

  it('uses openai as the default provider', () => {
    delete process.env.AI_PROVIDER;
    process.env.OPENAI_API_KEY = 'sk-test';

    expect(getProviderAdapter().id).toBe('openai');
  });
});
