import { NotFoundError } from '@/lib/errors/not-found-error';
import { AppError } from '@/lib/errors/app-error';

describe('NotFoundError', () => {
  it('should create a not found error with default code and status', () => {
    const error = new NotFoundError('Resource not found');

    expect(error.message).toBe('Resource not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('NotFoundError');
  });

  it('should be an instance of AppError', () => {
    const error = new NotFoundError('Test');

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should accept optional details with resource info', () => {
    const details = { resource: 'Transaction', id: 'tx-123' };
    const error = new NotFoundError('Transaction not found', details);

    expect(error.details).toEqual(details);
  });
});
