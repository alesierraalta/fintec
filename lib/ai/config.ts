import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY is not defined in environment variables');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export const AI_MODEL = 'gpt-4o-mini'; // Cost-effective model
export const AI_TEMPERATURE = 0.3; // Lower temperature for more consistent results
export const AI_MAX_TOKENS = 500; // Limit token usage

export function validateAIConfig(): boolean {
  return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0;
}

