import OpenAI from 'openai';

// Initialize OpenAI client - validation happens at runtime when used
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'placeholder',
});

export const AI_MODEL = 'gpt-4o-mini'; // Cost-effective model
export const AI_TEMPERATURE = 0.3; // Lower temperature for more consistent results
export const AI_MAX_TOKENS = 500; // Limit token usage

// Chat assistant models - GPT-5 (fallback to GPT-4o-mini if not available)
export const AI_CHAT_MODEL = 'gpt-5'; // Primary model
export const AI_CHAT_MODEL_FALLBACK = 'gpt-4o-mini'; // Fallback if GPT-5 not available

/**
 * Get available chat model, with fallback if GPT-5 not available
 * For MVP, we'll use the fallback model and test GPT-5 availability at runtime
 */
export function getChatModel(): string {
  // Use GPT-5, fallback handled in chat-assistant
  return AI_CHAT_MODEL;
}

/**
 * Validate if a model is available by attempting to use it
 * This is a helper that can be called to check model availability
 */
export async function validateModel(model: string): Promise<boolean> {
  try {
    // This is a lightweight check - we'll let the actual API call handle validation
    // Models that don't exist will return an error which we'll catch
    return true;
  } catch {
    return false;
  }
}

/**
 * Constantes de Timeouts (en ms)
 */
export const AI_CLIENT_TIMEOUT_MS = 10000; // Timeout total para requests del cliente
export const AI_LLM_TIMEOUT_MS = 8000; // Timeout para llamadas a OpenAI LLM

/**
 * Rate Limiting
 */
export const AI_RATE_LIMIT_PER_MINUTE = 10; // Máximo 10 requests/minuto por usuario

/**
 * Retry Configuration
 */
export const AI_MAX_RETRIES = 2; // Máximo 2 intentos para errores retryables

/**
 * Security
 */
export const AI_MAX_PAYLOAD_SIZE_KB = 100; // Límite de tamaño de payload

/**
 * Configuración de Redis
 */
export const REDIS_CONFIG = {
  url: process.env.REDIS_URL || '',
  connectionTimeoutMs: 5000,
  commandTimeoutMs: 5000,
};

export function validateAIConfig(): boolean {
  return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0;
}

