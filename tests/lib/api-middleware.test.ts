import { AppError } from '@/lib/errors/app-error';
import { ValidationError } from '@/lib/errors/validation-error';
import { NotFoundError } from '@/lib/errors/not-found-error';
import { AuthError } from '@/lib/errors/auth-error';

// Mock next/server before importing the middleware
jest.mock('next/server', () => {
  class MockNextResponse {
    static json(body: unknown, init?: { status?: number }) {
      return {
        status: init?.status ?? 200,
        json: () => Promise.resolve(body),
      };
    }
  }
  return { NextResponse: MockNextResponse };
});

// Import after mock is set up
const { withErrorHandling } = require('@/lib/api-middleware');

function createMockRequest(path = '/api/test') {
  return { url: `http://localhost:3000${path}`, method: 'GET' };
}

describe('withErrorHandling', () => {
  it('should return the handler result when no error is thrown', async () => {
    const { NextResponse } = require('next/server');
    const handler = jest
      .fn()
      .mockResolvedValue(NextResponse.json({ success: true }, { status: 200 }));

    const wrapped = withErrorHandling(handler);
    const response = await wrapped(createMockRequest());
    const data = await response.json();

    expect(handler).toHaveBeenCalled();
    expect(data.success).toBe(true);
  });

  it('should catch ValidationError and return 400 envelope', async () => {
    const handler = jest
      .fn()
      .mockRejectedValue(
        new ValidationError('Invalid input', { field: 'email' })
      );

    const wrapped = withErrorHandling(handler);
    const response = await wrapped(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.data).toBeNull();
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.message).toBe('Invalid input');
    expect(data.error.details).toEqual({ field: 'email' });
    expect(data.meta.timestamp).toBeDefined();
  });

  it('should catch NotFoundError and return 404 envelope', async () => {
    const handler = jest
      .fn()
      .mockRejectedValue(new NotFoundError('Transaction not found'));

    const wrapped = withErrorHandling(handler);
    const response = await wrapped(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
    expect(data.error.message).toBe('Transaction not found');
  });

  it('should catch AuthError and return 401 envelope', async () => {
    const handler = jest.fn().mockRejectedValue(new AuthError('Unauthorized'));

    const wrapped = withErrorHandling(handler);
    const response = await wrapped(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe('AUTH_ERROR');
  });

  it('should catch database-style AppError and return 500 envelope', async () => {
    const handler = jest
      .fn()
      .mockRejectedValue(
        new AppError('Connection failed', 'DATABASE_ERROR', 500)
      );

    const wrapped = withErrorHandling(handler);
    const response = await wrapped(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe('DATABASE_ERROR');
  });

  it('should catch generic AppError and return correct status', async () => {
    const handler = jest
      .fn()
      .mockRejectedValue(
        new AppError('Rate limit exceeded', 'RATE_LIMITED', 429)
      );

    const wrapped = withErrorHandling(handler);
    const response = await wrapped(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error.code).toBe('RATE_LIMITED');
  });

  it('should catch unknown errors and return 500 envelope', async () => {
    const handler = jest.fn().mockRejectedValue('string error');

    const wrapped = withErrorHandling(handler);
    const response = await wrapped(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe('INTERNAL_ERROR');
    expect(data.error.message).toBe('An unexpected error occurred');
  });

  it('should catch Error instances and return 500 envelope', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('Something broke'));

    const wrapped = withErrorHandling(handler);
    const response = await wrapped(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe('INTERNAL_ERROR');
  });

  it('should pass the request to the handler', async () => {
    const handler = jest.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });
    const request = createMockRequest('/api/transactions');

    const wrapped = withErrorHandling(handler);
    await wrapped(request);

    expect(handler).toHaveBeenCalledWith(request);
  });

  it('should catch authorization-style AppError and return 403 envelope', async () => {
    const handler = jest
      .fn()
      .mockRejectedValue(
        new AppError('Admin access required', 'FORBIDDEN', 403)
      );

    const wrapped = withErrorHandling(handler);
    const response = await wrapped(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
    expect(data.error.message).toBe('Admin access required');
  });

  it('should catch conflict-style AppError and return 409 envelope', async () => {
    const handler = jest
      .fn()
      .mockRejectedValue(
        new AppError('Order must be in pending_review state', 'CONFLICT', 409)
      );

    const wrapped = withErrorHandling(handler);
    const response = await wrapped(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error.code).toBe('CONFLICT');
    expect(data.error.message).toBe('Order must be in pending_review state');
  });
});

describe('withErrorHandling — Ctx generic (dynamic route passthrough)', () => {
  it('should pass variadic ctx arguments through to the handler', async () => {
    const { NextResponse } = require('next/server');
    const params = { params: Promise.resolve({ id: 'order-123' }) };
    const handler = jest
      .fn()
      .mockResolvedValue(NextResponse.json({ ok: true }, { status: 200 }));

    const wrapped = withErrorHandling(handler);
    const request = createMockRequest('/api/payment-orders/order-123/approve');
    await wrapped(request, params);

    expect(handler).toHaveBeenCalledWith(request, params);
  });

  it('should propagate errors from dynamic-route handlers correctly', async () => {
    const params = { params: Promise.resolve({ id: 'order-123' }) };
    const handler = jest
      .fn()
      .mockRejectedValue(
        new AppError('Admin access required', 'FORBIDDEN', 403)
      );

    const wrapped = withErrorHandling(handler);
    const response = await wrapped(createMockRequest(), params);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('should work with zero extra ctx (backward-compatible with existing 0-arg routes)', async () => {
    const { NextResponse } = require('next/server');
    const handler = jest
      .fn()
      .mockResolvedValue(NextResponse.json({ ok: true }, { status: 200 }));

    const wrapped = withErrorHandling(handler);
    const request = createMockRequest('/api/accounts');
    const response = await wrapped(request);
    const data = await response.json();

    expect(handler).toHaveBeenCalledWith(request);
    expect(data.ok).toBe(true);
  });
});
