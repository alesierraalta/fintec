import { streamText, stepCountIs, type LanguageModel } from 'ai';
import { getProviderAdapter } from '@/lib/ai/providers';
import { logger } from '@/lib/utils/logger';

/**
 * Streams with the active provider adapter. Walks the adapter's fallback model
 * chain on transient (quota/rate-limit) errors and forwards the adapter's
 * provider-scoped options to `streamText`. Providers without fallback models
 * stream once with the given model.
 */
export async function streamWithFallback(params: {
  model: LanguageModel;
  messages: any[];
  system: string;
  tools: any;
  temperature: number;
  userId: string;
  onFinish?: (completion: any) => Promise<void>;
}) {
  const adapter = getProviderAdapter();
  const modelsToTry = [
    params.model,
    ...adapter.fallbackModels.map((modelId) => adapter.createModel(modelId)),
  ];

  let lastError: Error | null = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    try {
      if (i > 0) {
        logger.info(
          `[AI Chat] Fallback to: ${adapter.id}:${adapter.fallbackModels[i - 1]}`
        );
      }

      const result = streamText({
        model: modelsToTry[i],
        system: params.system,
        messages: params.messages,
        tools: params.tools,
        temperature: params.temperature,
        onFinish: params.onFinish,
        stopWhen: stepCountIs(5), // Prevent infinite tool loops
        ...(adapter.providerOptions
          ? { providerOptions: adapter.providerOptions }
          : {}),
      });

      return result;
    } catch (error) {
      lastError = error as Error;
      if (adapter.isTransient(error)) {
        logger.warn(
          `[AI Chat] Quota exceeded for ${adapter.id}:${adapter.modelId}`
        );
        if (i === modelsToTry.length - 1)
          throw new Error('All AI models exhausted.');
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('Fallback failed');
}
