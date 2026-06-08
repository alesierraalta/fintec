import {
  AppError,
  ValidationError,
  NotFoundError,
  AuthError,
  DatabaseError,
} from '@/lib/errors';

describe('errors barrel export', () => {
  it('should export all error classes', () => {
    expect(AppError).toBeDefined();
    expect(ValidationError).toBeDefined();
    expect(NotFoundError).toBeDefined();
    expect(AuthError).toBeDefined();
    expect(DatabaseError).toBeDefined();
  });

  it('should export classes that are instantiable', () => {
    const appError = new AppError('Test', 'TEST', 500);
    const validationError = new ValidationError('Test');
    const notFoundError = new NotFoundError('Test');
    const authError = new AuthError('Test');
    const databaseError = new DatabaseError('Test');

    expect(appError).toBeInstanceOf(AppError);
    expect(validationError).toBeInstanceOf(AppError);
    expect(notFoundError).toBeInstanceOf(AppError);
    expect(authError).toBeInstanceOf(AppError);
    expect(databaseError).toBeInstanceOf(AppError);
  });
});
