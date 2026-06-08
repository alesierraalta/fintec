import { ConflictError } from '@/lib/errors/conflict-error';
import { AppError } from '@/lib/errors/app-error';

describe('ConflictError', () => {
  it('should create a conflict error with statusCode 409', () => {
    const error = new ConflictError('Order must be in pending_review state');

    expect(error.message).toBe('Order must be in pending_review state');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
    expect(error.name).toBe('ConflictError');
  });

  it('should be an instance of AppError', () => {
    const error = new ConflictError('Duplicate entry');

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should accept optional details', () => {
    const details = {
      currentState: 'approved',
      requiredState: 'pending_review',
    };
    const error = new ConflictError('State conflict', details);

    expect(error.details).toEqual(details);
  });
});
