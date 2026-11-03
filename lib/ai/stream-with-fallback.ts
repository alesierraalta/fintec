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

/**
 * Wraps an AI SDK stream response with stream-level resilience.
 *
 * When the underlying stream terminates with an error (e.g. 503 high demand, 429 quota, socket timeout)
 * or terminates after tools with zero text tokens generated, this intercepts the failure at the SSE boundary,
 * enqueuing a friendly explanatory text chunk and closing cleanly so the chat UI never hangs or renders an empty bubble.
 */
export function createResilientStreamResponse(
  streamResult: any,
  options?: {
    onError?: (error: unknown) => string | undefined;
  }
): Response {
  const originalResponse = streamResult.toUIMessageStreamResponse({
    onError: options?.onError,
  });

  const originalBody = originalResponse.body;
  if (!originalBody) return originalResponse;

  const reader = originalBody.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let hasTextChunk = false;
  let hasToolChunk = false;

  const resilientStream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          if (text.includes('"type":"text-delta"')) {
            hasTextChunk = true;
          }
          if (
            text.includes('"type":"tool-call"') ||
            text.includes('"type":"tool-result"')
          ) {
            hasToolChunk = true;
          }

          controller.enqueue(value);
        }

        // If the stream completed all tool calls cleanly but produced zero text tokens:
        if (hasToolChunk && !hasTextChunk) {
          const fallbackNotice =
            'data: {"type":"text-delta","text":"Listo, las consultas solicitadas fueron completadas con éxito."}\n\n';
          controller.enqueue(encoder.encode(fallbackNotice));
        }

        controller.close();
      } catch (streamError) {
        logger.error(
          '[AI Chat] Mid-stream exception intercepted:',
          streamError
        );

        // If no text was sent yet, provide a clear, friendly notification chunk
        if (!hasTextChunk) {
          const errorNotice =
            'data: {"type":"text-delta","text":"\\n\\n⚠️ Ocurrió una interrupción temporal con el modelo de IA. Por favor, intenta de nuevo."}\n\n';
          controller.enqueue(encoder.encode(errorNotice));
        }

        // Finish step and close cleanly
        const finishStep =
          'data: {"type":"finish-step"}\ndata: {"type":"finish"}\n\n';
        controller.enqueue(encoder.encode(finishStep));
        controller.close();
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });

  return new Response(resilientStream, {
    status: originalResponse.status,
    statusText: originalResponse.statusText,
    headers: originalResponse.headers,
  });
}
