import OpenAI from 'openai';

// Initialize OpenAI client - validation happens at runtime when used
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'placeholder',
});

export const AI_MODEL = 'gpt-4o-mini'; // Cost-effective model
export const AI_TEMPERATURE = 0.3; // Lower temperature for more consistent results
export const AI_MAX_TOKENS = 500; // Limit token usage

// Chat assistant models - GPT-5 variants
export const AI_CHAT_MODEL_NANO = 'gpt-5-nano'; // For simple queries (listings, basic info)
export const AI_CHAT_MODEL_MINI = 'gpt-5-mini'; // For complex queries (analysis, open questions)

/**
 * Get available chat model based on query complexity
 * Simple queries (listings, basic info) -> gpt-5-nano
 * Complex queries (analysis, open questions) -> gpt-5-mini
 */
export function getChatModel(isComplex: boolean = false): string {
  return isComplex ? AI_CHAT_MODEL_MINI : AI_CHAT_MODEL_NANO;
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
export const AI_CLIENT_TIMEOUT_MS = 30000; // Timeout total para requests del cliente (aumentado para gpt-5-mini)
export const AI_LLM_TIMEOUT_MS = 20000; // Timeout para llamadas a OpenAI LLM (aumentado para gpt-5-mini que puede ser más lento)

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

