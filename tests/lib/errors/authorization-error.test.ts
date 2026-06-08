import { AuthorizationError } from '@/lib/errors/authorization-error';
import { AppError } from '@/lib/errors/app-error';

describe('AuthorizationError', () => {
  it('should create an authorization error with statusCode 403', () => {
    const error = new AuthorizationError('Admin access required');

    expect(error.message).toBe('Admin access required');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.name).toBe('AuthorizationError');
  });

  it('should be an instance of AppError', () => {
    const error = new AuthorizationError('Forbidden');

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should accept optional details', () => {
    const details = { resource: 'payment-order', action: 'approve' };
    const error = new AuthorizationError('Forbidden', details);

    expect(error.details).toEqual(details);
  });
});
