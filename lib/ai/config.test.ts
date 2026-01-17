
// Mock AI SDK modules to avoid ESM issues in Jest
jest.mock('@ai-sdk/openai', () => ({ openai: jest.fn() }));
jest.mock('@ai-sdk/google', () => ({ google: jest.fn() }));
jest.mock('@ai-sdk/anthropic', () => ({ anthropic: jest.fn() }));
// Mock ai package if needed, though language model type is just a type
jest.mock('ai', () => ({ LanguageModel: jest.fn() }));

import { getGoogleModelFallbackChain, isQuotaExceededError } from './config';

describe('AI Config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('getGoogleModelFallbackChain', () => {
        it('should return default chain when env var is not set', () => {
            delete process.env.GOOGLE_MODEL_FALLBACK_CHAIN;
            process.env.GOOGLE_MODEL = 'gemini-custom';

            const chain = getGoogleModelFallbackChain();

            expect(chain.primary).toBe('gemini-custom');
            expect(chain.fallbacks).toEqual(['gemini-2.5-flash-lite']);
        });

        it('should parse comma-separated chain correctly', () => {
            process.env.GOOGLE_MODEL_FALLBACK_CHAIN = 'model-a, model-b, model-c';

            const chain = getGoogleModelFallbackChain();

            expect(chain.primary).toBe('model-a');
            expect(chain.fallbacks).toEqual(['model-b', 'model-c']);
        });

        it('should handle single model in chain', () => {
            process.env.GOOGLE_MODEL_FALLBACK_CHAIN = 'only-one';

            const chain = getGoogleModelFallbackChain();

            expect(chain.primary).toBe('only-one');
            expect(chain.fallbacks).toEqual([]);
        });

        it('should handle empty string by falling back to default', () => {
            process.env.GOOGLE_MODEL_FALLBACK_CHAIN = '';

            const chain = getGoogleModelFallbackChain();

            expect(chain.primary).toBe('gemini-2.5-flash');
            expect(chain.fallbacks).toEqual(['gemini-2.5-flash-lite']);
        });
    });

    describe('isQuotaExceededError', () => {
        it('should return true for status 429', () => {
            expect(isQuotaExceededError({ status: 429 })).toBe(true);
            expect(isQuotaExceededError({ statusCode: 429 })).toBe(true);
            expect(isQuotaExceededError({ code: 429 })).toBe(true);
        });

        it('should return true for 403 with quota message', () => {
            expect(isQuotaExceededError({
                status: 403,
                message: 'Quota exceeded for this project'
            })).toBe(true);

            expect(isQuotaExceededError({
                status: 403,
                message: 'Rate limit reached'
            })).toBe(true);
        });

        it('should return false for 403 without quota message', () => {
            expect(isQuotaExceededError({
                status: 403,
                message: 'Permission denied'
            })).toBe(false);
        });

        it('should return true for AI SDK error messages', () => {
            expect(isQuotaExceededError({ message: 'Too many requests' })).toBe(true);
            expect(isQuotaExceededError({ message: 'Resource exhausted' })).toBe(true);
            expect(isQuotaExceededError({ message: 'User quota exceeded' })).toBe(true);
        });

        it('should return false for unrelated errors', () => {
            expect(isQuotaExceededError({ message: 'Internal Server Error' })).toBe(false);
            expect(isQuotaExceededError({ status: 500 })).toBe(false);
            expect(isQuotaExceededError(null)).toBe(false);
            expect(isQuotaExceededError(undefined)).toBe(false);
        });
    });
});
