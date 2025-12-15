export const AI_CONFIG = {
  model: 'gpt-4o',
  embeddingModel: 'text-embedding-3-small',
  maxDuration: 60, // seconds
  temperature: 0.5,
  rateLimit: {
    maxRequests: 20,
    windowSeconds: 60,
  },
  context: {
    maxHistoryMessages: 10,
  }
};
