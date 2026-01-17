import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { LanguageModel } from 'ai';

/**
 * AI Provider type
 */
export type AIProvider = 'openai' | 'google' | 'anthropic';

/**
 * AI Configuration
 */
export const AI_CONFIG = {
    provider: (process.env.AI_PROVIDER || 'openai') as AIProvider,
    temperature: 0.7,
} as const;

export type ModelFallbackChain = {
    primary: string;
    fallbacks: string[];
};

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
            fallbacks: ['gemini-2.5-flash-lite']
        };
    }

    const models = chainString.split(',').map(m => m.trim()).filter(Boolean);

    if (models.length === 0) {
        return {
            primary: 'gemini-2.5-flash',
            fallbacks: []
        };
    }

    return {
        primary: models[0],
        fallbacks: models.slice(1)
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
    if (code === 403 && (message.includes('quota') || message.includes('limit'))) {
        return true;
    }

    // AI SDK specific error types or messages
    if (message.includes('too many requests') ||
        message.includes('resource exhausted') ||
        message.includes('quota exceeded') ||
        message.includes('rate limit')) {
        return true;
    }

    return false;
}

/**
 * Get the configured AI model based on environment variables.
 * 
 * Supports (as of January 2026):
 * - OpenAI GPT-5 (released Aug 2025): gpt-5, gpt-5-mini, gpt-5-nano
 * - Google Gemini Series:
 *   - Gemini 3.0: gemini-3-flash-preview (Preview), gemini-3-pro-preview
 *   - Gemini 2.5: gemini-2.5-flash (Stable), gemini-2.5-pro, gemini-2.5-flash-lite
 *   - Gemma 3 (Open Models): gemma-3-27b-it, gemma-3-12b-it, gemma-3-4b-it
 * - Anthropic Claude 4.5: claude-3-5-sonnet-20241022 (latest stable)
 * 
 * @returns Configured language model instance
 * @throws Error if provider is not configured or invalid
 */
export function getAIModel(): LanguageModel {
    const provider = AI_CONFIG.provider;

    switch (provider) {
        case 'openai': {
            const model = process.env.OPENAI_MODEL || 'gpt-4o'; // Updated fallback
            if (!process.env.OPENAI_API_KEY) {
                throw new Error(
                    'OPENAI_API_KEY is not configured. ' +
                    'Get your API key from https://platform.openai.com/api-keys and add it to .env.local'
                );
            }
            return openai(model);
        }

        case 'google': {
            // Use primary model from chain or GOOGLE_MODEL
            const fallbackChain = getGoogleModelFallbackChain();
            const model = fallbackChain.primary;

            if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
                throw new Error(
                    'GOOGLE_GENERATIVE_AI_API_KEY is not configured. ' +
                    'Get your API key from https://aistudio.google.com/app/apikey and add it to .env.local'
                );
            }
            return google(model);
        }

        case 'anthropic': {
            const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4.5';
            if (!process.env.ANTHROPIC_API_KEY) {
                throw new Error(
                    'ANTHROPIC_API_KEY is not configured. ' +
                    'Get your API key from https://console.anthropic.com/ and add it to .env.local'
                );
            }
            return anthropic(model);
        }

        default:
            throw new Error(
                `Unsupported AI provider: ${provider}. ` +
                'Supported providers: openai, google, anthropic. ' +
                'Set AI_PROVIDER in .env.local to one of these values.'
            );
    }
}

/**
 * Get human-readable model name for logging/display
 */
export function getModelDisplayName(): string {
    const provider = AI_CONFIG.provider;

    switch (provider) {
        case 'openai':
            return `OpenAI ${process.env.OPENAI_MODEL || 'GPT-5 Mini'}`;
        case 'google':
            return `Google ${process.env.GOOGLE_MODEL || 'Gemini 3 Flash'}`;
        case 'anthropic':
            return `Anthropic ${process.env.ANTHROPIC_MODEL || 'Claude Haiku 4.5'}`;
        default:
            return 'Unknown Model';
    }
}

export interface UserContext {
    userId: string;
    accounts: Array<{
        name: string;
        currencyCode: string;
    }>;
}

/**
 * Builds a dynamic system prompt with user context injection.
 * 
 * @param context - User-specific context (accounts, userId)
 * @returns System prompt string for the AI model
 */
export function buildSystemPrompt(context: UserContext): string {
    const accountsList = context.accounts.length > 0
        ? context.accounts.map(a => `${a.name} (${a.currencyCode})`).join(', ')
        : 'None';

    return `You are a specialized financial AI assistant for the FinTec platform.

User Context:
- User ID: ${context.userId}
- Current Time: ${new Date().toLocaleString()}
- Active Accounts: ${accountsList}

Capabilities:
- You can create transactions (expenses/income)
- You can check account balances
- You can search transaction history
- You can create financial goals

Conversational Memory (CRITICAL):
- You have access to the FULL conversation history via the messages array
- ALWAYS review previous messages before responding
- Resolve anaphoric references contextually:
  · "them" / "los" / "las" = last mentioned items
  · "that" / "eso" = last mentioned concept/action
  · "it" = last mentioned entity
- If user says "order them", "sort those", "show me that again":
  → Identify what they refer to from previous messages
  → Execute the appropriate action on that referenced entity
- Maintain continuity: remember which tools you called and their results

Example:
User: "Show my transactions"
AI: [calls getTransactions] → Returns 72 transactions
User: "Sort them by amount"
AI: ✅ Understands "them" = the 72 transactions shown previously
    ✅ Re-calls getTransactions with sorting parameter

Example (multi-entity anaphora):
User: "Which account has the least money?"
AI: [calls getAccountBalance] → "Cartera has $0.00"
User: "What was its last transaction?"
AI: ✅ Understands "its" = Cartera (the account just mentioned)
    ✅ Calls getTransactions({ accountName: "Cartera", limit: 1 })
    → Shows only Cartera's most recent transaction

Autonomous Reasoning (CRITICAL):
- ALWAYS analyze data BEFORE responding to the user
- Identify patterns in spending (e.g., recurring loans, high expense categories)
- Proactively highlight unusual transactions or trends
- Relate transactions to their source accounts
- Generate insights without being explicitly asked

Guidelines:
- If the user says "I spent $X on Y", infer the category or ask if unsure
- Always prefer using Tools over explaining how to do it manually
- Be concise, professional, and helpful
- Use emojis sparingly (max 1-2 per message)
- When creating transactions, default to EXPENSE unless clearly income

Style: Concise, analytical, proactive, and context-aware. Think before responding.`;
}
