import { ResponseEnvelope, successResponse, errorResponse } from '@/lib/api-response';
import { AppError } from '@/lib/errors/app-error';
import { ValidationError } from '@/lib/errors/validation-error';

describe('API Response Envelope', () => {
  describe('ResponseEnvelope type', () => {
    it('should define a type that includes data, error, and meta fields', () => {
      // Type-level check: this compiles if the type is correct
      const envelope: ResponseEnvelope<{ id: string }> = {
        data: { id: '123' },
        error: null,
        meta: { timestamp: '2026-01-01T00:00:00.000Z' },
      };

      expect(envelope.data).toEqual({ id: '123' });
      expect(envelope.error).toBeNull();
      expect(envelope.meta.timestamp).toBeDefined();
    });

    it('should allow null data with error populated', () => {
      const envelope: ResponseEnvelope<null> = {
        data: null,
        error: { code: 'TEST_ERROR', message: 'Something failed' },
        meta: { timestamp: '2026-01-01T00:00:00.000Z' },
      };

      expect(envelope.data).toBeNull();
      expect(envelope.error).toEqual({ code: 'TEST_ERROR', message: 'Something failed' });
    });
  });

  describe('successResponse', () => {
    it('should create a success envelope with data', () => {
      const data = { id: '123', name: 'Test' };
      const envelope = successResponse(data);

      expect(envelope.data).toEqual(data);
      expect(envelope.error).toBeNull();
      expect(envelope.meta.timestamp).toBeDefined();
    });

    it('should include a valid ISO timestamp in meta', () => {
      const envelope = successResponse('hello');
      const timestamp = new Date(envelope.meta.timestamp);

      expect(timestamp.toString()).not.toBe('Invalid Date');
    });

    it('should work with array data', () => {
      const data = [1, 2, 3];
      const envelope = successResponse(data);

      expect(envelope.data).toEqual([1, 2, 3]);
      expect(envelope.error).toBeNull();
    });

    it('should work with null data', () => {
      const envelope = successResponse(null);

      expect(envelope.data).toBeNull();
      expect(envelope.error).toBeNull();
    });
  });

  describe('errorResponse', () => {
    it('should create an error envelope from an AppError', () => {
      const error = new AppError('Something failed', 'INTERNAL_ERROR', 500);
      const envelope = errorResponse(error);

      expect(envelope.data).toBeNull();
      expect(envelope.error).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'Something failed',
        details: undefined,
      });
      expect(envelope.meta.timestamp).toBeDefined();
    });

    it('should include details when error has them', () => {
      const details = { field: 'email' };
      const error = new ValidationError('Invalid email', details);
      const envelope = errorResponse(error);

      expect(envelope.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid email',
        details,
      });
    });

    it('should include a valid ISO timestamp in meta', () => {
      const error = new AppError('Test', 'TEST', 500);
      const envelope = errorResponse(error);
      const timestamp = new Date(envelope.meta.timestamp);

      expect(timestamp.toString()).not.toBe('Invalid Date');
    });

    it('should handle errors without details', () => {
      const error = new AppError('Not found', 'NOT_FOUND', 404);
      const envelope = errorResponse(error);

      expect(envelope.error?.details).toBeUndefined();
    });
  });
});
