import { AppError } from '@/lib/errors/app-error';

describe('AppError', () => {
  it('should create an error with message, code, and statusCode', () => {
    const error = new AppError('Something went wrong', 'INTERNAL_ERROR', 500);

    expect(error.message).toBe('Something went wrong');
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('AppError');
  });

  it('should be an instance of Error', () => {
    const error = new AppError('Test', 'TEST', 500);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
  });

  it('should accept optional details', () => {
    const details = { field: 'email', reason: 'invalid' };
    const error = new AppError('Validation failed', 'VALIDATION_ERROR', 400, details);

    expect(error.details).toEqual(details);
  });

  it('should have undefined details when not provided', () => {
    const error = new AppError('Test', 'TEST', 500);

    expect(error.details).toBeUndefined();
  });

  it('should have a proper stack trace', () => {
    const error = new AppError('Test', 'TEST', 500);

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AppError');
  });
});
