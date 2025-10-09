import OpenAI from 'openai';

// Initialize OpenAI client - validation happens at runtime when used
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'placeholder',
});

export const AI_MODEL = 'gpt-4o-mini'; // Cost-effective model
export const AI_TEMPERATURE = 0.3; // Lower temperature for more consistent results
export const AI_MAX_TOKENS = 500; // Limit token usage

export function validateAIConfig(): boolean {
  return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0;
}

