import { sanitizeError, isRetryable } from '../../lib/supabase/error-handler';

describe('lib/supabase/error-handler', () => {
  describe('sanitizeError', () => {
    it('should strip HTML and return generic message for Cloudflare errors', () => {
      const htmlError = '<html><head><title>521 Origin Down</title></head><body>521 Origin Down</body></html>';
      expect(sanitizeError(htmlError)).toBe('Database Unavailable (HTML content detected)');
    });

    it('should return original message if no HTML is present', () => {
      const cleanError = 'PostgREST error: connection refused';
      expect(sanitizeError(cleanError)).toBe(cleanError);
    });

    it('should handle undefined or null errors', () => {
      expect(sanitizeError(undefined as any)).toBe('Unknown Database Error');
      expect(sanitizeError(null as any)).toBe('Unknown Database Error');
    });
  });

  describe('isRetryable', () => {
    it('should return true for ENOTFOUND', () => {
      expect(isRetryable('ENOTFOUND')).toBe(true);
    });

    it('should return true for 5xx status codes', () => {
      expect(isRetryable(500)).toBe(true);
      expect(isRetryable(503)).toBe(true);
    });

    it('should return true for ETIMEDOUT', () => {
      expect(isRetryable('ETIMEDOUT')).toBe(true);
    });

    it('should return false for 4xx status codes', () => {
      expect(isRetryable(400)).toBe(false);
      expect(isRetryable(401)).toBe(false);
      expect(isRetryable(404)).toBe(false);
    });

    it('should return false for generic strings', () => {
      expect(isRetryable('Some other error')).toBe(false);
    });
  });
});
