import { streamText, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import {
  AI_CONFIG,
  getGoogleModelFallbackChain,
  isQuotaExceededError,
} from '@/lib/ai/config';
import { logger } from '@/lib/utils/logger';

/**
 * Moved verbatim (no logic changes) from app/api/chat/route.ts:269-326.
 * Walks the Google model fallback chain on quota-exceeded errors; any other
 * provider streams once with the given model.
 */
export async function streamWithFallback(params: {
  model: any;
  messages: any[];
  system: string;
  tools: any;
  temperature: number;
  userId: string;
  onFinish?: (completion: any) => Promise<void>;
}) {
  const provider = AI_CONFIG.provider;

  // Only apply provider fallback for Google
  if (provider !== 'google') {
    return streamText({
      model: params.model,
      system: params.system,
      messages: params.messages,
      tools: params.tools,
      temperature: params.temperature,
      onFinish: params.onFinish,
      stopWhen: stepCountIs(5), // Prevent infinite tool loops
    });
  }

  const fallbackChain = getGoogleModelFallbackChain();
  const modelsToTry = [fallbackChain.primary, ...fallbackChain.fallbacks];
  let lastError: Error | null = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelName = modelsToTry[i];

    try {
      if (i > 0) logger.info(`[AI Chat] Fallback to: ${modelName}`);

      const result = streamText({
        model: i === 0 ? params.model : google(modelName),
        system: params.system,
        messages: params.messages,
        tools: params.tools,
        temperature: params.temperature,
        onFinish: params.onFinish,
        stopWhen: stepCountIs(5), // Prevent infinite tool loops
      });

      return result;
    } catch (error) {
      lastError = error as Error;
      if (isQuotaExceededError(error)) {
        logger.warn(`[AI Chat] Quota exceeded for ${modelName}`);
        if (i === modelsToTry.length - 1)
          throw new Error('All AI models exhausted.');
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('Fallback failed');
}
