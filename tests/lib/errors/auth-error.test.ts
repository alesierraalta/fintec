import { AuthError } from '@/lib/errors/auth-error';
import { AppError } from '@/lib/errors/app-error';

describe('AuthError', () => {
  it('should create an auth error with default code and status', () => {
    const error = new AuthError('Unauthorized');

    expect(error.message).toBe('Unauthorized');
    expect(error.code).toBe('AUTH_ERROR');
    expect(error.statusCode).toBe(401);
    expect(error.name).toBe('AuthError');
  });

  it('should be an instance of AppError', () => {
    const error = new AuthError('Test');

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should accept optional details', () => {
    const details = { reason: 'Token expired' };
    const error = new AuthError('Token expired', details);

    expect(error.details).toEqual(details);
  });
});
