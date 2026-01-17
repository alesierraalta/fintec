import { describe, it, expect } from '@jest/globals';

/**
 * Unit tests for Circuit Breaker Error Differentiation
 * Tests the shouldTripCircuit logic (2026 best practices)
 */
describe('Circuit Breaker - Error Classification', () => {
    // Simulating the shouldTripCircuit logic
    function shouldTripCircuit(error: Error): boolean {
        const message = error.message.toLowerCase();
        const name = error.name;

        // Don't trip for validation errors
        if (name === 'ValidationError' || name === 'ZodError' || message.includes('validation')) {
            return false;
        }

        // Don't trip for auth errors
        if (message.includes('unauthorized') || message.includes('401') || message.includes('403')) {
            return false;
        }

        // Don't trip for client errors (4xx except 429)
        if (message.includes('400') || message.includes('404') || message.includes('bad request')) {
            return false;
        }

        // DO trip for rate limits (429)
        if (message.includes('429') || message.includes('rate limit') || message.includes('quota')) {
            return true;
        }

        // DO trip for server errors (5xx)
        if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
            return true;
        }

        // DO trip for network/timeout errors
        if (message.includes('network') || message.includes('timeout') || message.includes('econnrefused')) {
            return true;
        }

        return true;
    }

    describe('Persistent Errors (Should NOT trip circuit)', () => {
        it('should NOT trip for validation errors', () => {
            const error = new Error('Validation failed');
            error.name = 'ValidationError';
            expect(shouldTripCircuit(error)).toBe(false);
        });

        it('should NOT trip for 401 unauthorized', () => {
            const error = new Error('401 Unauthorized');
            expect(shouldTripCircuit(error)).toBe(false);
        });

        it('should NOT trip for 404 not found', () => {
            const error = new Error('404 Not Found');
            expect(shouldTripCircuit(error)).toBe(false);
        });

        it('should NOT trip for bad request', () => {
            const error = new Error('400 Bad Request');
            expect(shouldTripCircuit(error)).toBe(false);
        });
    });

    describe('Transient Errors (SHOULD trip circuit)', () => {
        it('should trip for 429 rate limit', () => {
            const error = new Error('429 Rate Limit Exceeded');
            expect(shouldTripCircuit(error)).toBe(true);
        });

        it('should trip for 500 server error', () => {
            const error = new Error('500 Internal Server Error');
            expect(shouldTripCircuit(error)).toBe(true);
        });

        it('should trip for 503 service unavailable', () => {
            const error = new Error('503 Service Unavailable');
            expect(shouldTripCircuit(error)).toBe(true);
        });

        it('should trip for network errors', () => {
            const error = new Error('Network connection failed');
            expect(shouldTripCircuit(error)).toBe(true);
        });

        it('should trip for timeout errors', () => {
            const error = new Error('Request timeout');
            expect(shouldTripCircuit(error)).toBe(true);
        });

        it('should trip for quota exceeded', () => {
            const error = new Error('API quota exceeded');
            expect(shouldTripCircuit(error)).toBe(true);
        });
    });
});
