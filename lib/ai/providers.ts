import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { ProviderOptions } from '@ai-sdk/provider-utils';
import type { LanguageModel } from 'ai';

/**
 * Multi-provider adapter contract.
 *
 * A single typed boundary that encapsulates how a provider is constructed and
 * how its models stream. Provider construction belongs in this module; the chat
 * route and `streamWithFallback` only consume the shared model/stream contract
 * through `getProviderAdapter()` / `getAIModel()`.
 */
export type AIProviderId = 'openai' | 'google' | 'anthropic' | 'nvidia';

export const AI_PROVIDER_IDS: readonly AIProviderId[] = [
  'openai',
  'google',
  'anthropic',
  'nvidia',
] as const;

export type ModelFallbackChain = {
  primary: string;
  fallbacks: string[];
};

/**
 * Typed configuration error thrown for missing or invalid provider setup.
 * Never includes secrets; the chat route maps it to a safe generic 503.
 */
export class AIConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIConfigurationError';
  }
}

export interface ProviderAdapter {
  id: AIProviderId;
  /** Resolved default model id for the provider. */
  modelId: string;
  /** Model factory; defaults to `modelId` when no id is given. */
  createModel: (modelId?: string) => LanguageModel;
  /** Model names to fall back to on transient errors (empty for most providers). */
  fallbackModels: string[];
  /** Quota/transient classification used to decide whether to fall back. */
  isTransient: (error: unknown) => boolean;
  /** Provider-scoped options forwarded to `streamText`. */
  providerOptions?: ProviderOptions;
}

/**
 * Get the Google model fallback chain from environment variables.
 * Format: GOOGLE_MODEL_FALLBACK_CHAIN="gemini-3-flash,gemini-2.5-flash,gemini-2.5-flash-lite"
 */
export function getGoogleModelFallbackChain(): ModelFallbackChain {
  const chainString = process.env.GOOGLE_MODEL_FALLBACK_CHAIN;

  // Default fallback chain if not configured
  if (!chainString) {
    return {
      primary: process.env.GOOGLE_MODEL || 'gemini-2.5-flash',
      fallbacks: ['gemini-2.5-flash-lite'],
    };
  }

  const models = chainString
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  if (models.length === 0) {
    return {
      primary: 'gemini-2.5-flash',
      fallbacks: [],
    };
  }

  return {
    primary: models[0],
    fallbacks: models.slice(1),
  };
}

/**
 * Check if the error is due to quota exhaustion or rate limiting.
 * Handles AI SDK errors and raw provider errors.
 */
export function isQuotaExceededError(error: any): boolean {
  if (!error) return false;

  const message = (error.message || '').toLowerCase();
  const code = error.status || error.statusCode || error.code;

  // Check for standard HTTP 429 or 403 (often used for quota)
  if (code === 429) return true;

  // Google/Gemini specific quota errors often come as 403 with specific message
  if (
    code === 403 &&
    (message.includes('quota') || message.includes('limit'))
  ) {
    return true;
  }

  // AI SDK specific error types or messages
  if (
    message.includes('too many requests') ||
    message.includes('resource exhausted') ||
    message.includes('quota exceeded') ||
    message.includes('rate limit')
  ) {
    return true;
  }

  return false;
}

function createOpenAIAdapter(): ProviderAdapter {
  if (!process.env.OPENAI_API_KEY) {
    throw new AIConfigurationError(
      'OPENAI_API_KEY is not configured. Set it in your environment or .env.local.'
    );
  }
  const modelId = process.env.OPENAI_MODEL || 'gpt-4o';
  return {
    id: 'openai',
    modelId,
    createModel: (id?: string) => openai(id ?? modelId),
    fallbackModels: [],
    isTransient: isQuotaExceededError,
  };
}

function createGoogleAdapter(): ProviderAdapter {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new AIConfigurationError(
      'GOOGLE_GENERATIVE_AI_API_KEY is not configured. Set it in your environment or .env.local.'
    );
  }
  const chain = getGoogleModelFallbackChain();
  return {
    id: 'google',
    modelId: chain.primary,
    createModel: (id?: string) => google(id ?? chain.primary),
    fallbackModels: chain.fallbacks,
    isTransient: isQuotaExceededError,
  };
}

function createAnthropicAdapter(): ProviderAdapter {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AIConfigurationError(
      'ANTHROPIC_API_KEY is not configured. Set it in your environment or .env.local.'
    );
  }
  const modelId = process.env.ANTHROPIC_MODEL || 'claude-haiku-4.5';
  return {
    id: 'anthropic',
    modelId,
    createModel: (id?: string) => anthropic(id ?? modelId),
    fallbackModels: [],
    isTransient: isQuotaExceededError,
  };
}

function createNvidiaAdapter(): ProviderAdapter {
  if (!process.env.NVIDIA_API_KEY) {
    throw new AIConfigurationError(
      'NVIDIA_API_KEY is not configured. Set it in your environment or .env.local.'
    );
  }
  const modelId = process.env.NVIDIA_MODEL || 'deepseek-ai/deepseek-v4-flash';
  const provider = createOpenAICompatible({
    name: 'nvidia',
    baseURL:
      process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
    apiKey: process.env.NVIDIA_API_KEY,
  });
  return {
    id: 'nvidia',
    modelId,
    createModel: (id?: string) => provider.languageModel(id ?? modelId),
    fallbackModels: [],
    isTransient: isQuotaExceededError,
    // Provider-scoped options forwarded to `streamText`. The `nvidia` key
    // matches the provider options name derived from `createOpenAICompatible`
    // (`name: 'nvidia'`); its contents are merged into the request body,
    // equivalent to the Python client's `extra_body`.
    providerOptions: {
      nvidia: {
        chat_template_kwargs: {
          thinking: true,
          reasoning_effort: 'high',
        },
      },
    },
  };
}

/**
 * Resolve the active provider adapter from `AI_PROVIDER` (defaults to
 * 'openai'). Source of truth for provider construction.
 */
export function getProviderAdapter(provider?: AIProviderId): ProviderAdapter {
  const id =
    provider ?? ((process.env.AI_PROVIDER || 'openai') as AIProviderId);

  if (!AI_PROVIDER_IDS.includes(id)) {
    throw new AIConfigurationError(
      `Unsupported AI provider: ${id}. Supported providers: ${AI_PROVIDER_IDS.join(', ')}. Set AI_PROVIDER in your environment or .env.local.`
    );
  }

  switch (id) {
    case 'openai':
      return createOpenAIAdapter();
    case 'google':
      return createGoogleAdapter();
    case 'anthropic':
      return createAnthropicAdapter();
    case 'nvidia':
      return createNvidiaAdapter();
    default:
      throw new AIConfigurationError(`Unsupported AI provider: ${id}`);
  }
}

/**
 * Get the configured AI model based on the active provider adapter.
 *
 * @returns Configured language model instance
 */
export function getAIModel(): LanguageModel {
  return getProviderAdapter().createModel();
}

/**
 * Get human-readable model name for logging/display.
 */
export function getModelDisplayName(): string {
  const adapter = getProviderAdapter();
  switch (adapter.id) {
    case 'openai':
      return `OpenAI ${process.env.OPENAI_MODEL || 'GPT-5 Mini'}`;
    case 'google':
      return `Google ${process.env.GOOGLE_MODEL || 'Gemini 3 Flash'}`;
    case 'anthropic':
      return `Anthropic ${process.env.ANTHROPIC_MODEL || 'Claude Haiku 4.5'}`;
    case 'nvidia':
      return `NVIDIA ${adapter.modelId}`;
    default:
      return 'Unknown Model';
  }
}
