import { ValidationError } from '@/lib/errors/validation-error';
import { AppError } from '@/lib/errors/app-error';

describe('ValidationError', () => {
  it('should create a validation error with default code and status', () => {
    const error = new ValidationError('Invalid input');

    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ValidationError');
  });

  it('should be an instance of AppError', () => {
    const error = new ValidationError('Test');

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should accept optional field-level details', () => {
    const details = { email: 'Invalid email format', age: 'Must be positive' };
    const error = new ValidationError('Validation failed', details);

    expect(error.details).toEqual(details);
  });

  it('should accept a custom message', () => {
    const error = new ValidationError('Custom validation message');

    expect(error.message).toBe('Custom validation message');
  });
});
