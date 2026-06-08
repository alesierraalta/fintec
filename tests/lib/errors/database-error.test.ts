import { DatabaseError } from '@/lib/errors/database-error';
import { AppError } from '@/lib/errors/app-error';

describe('DatabaseError', () => {
  it('should create a database error with default code and status', () => {
    const error = new DatabaseError('Database connection failed');

    expect(error.message).toBe('Database connection failed');
    expect(error.code).toBe('DATABASE_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('DatabaseError');
  });

  it('should be an instance of AppError', () => {
    const error = new DatabaseError('Test');

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should accept optional details with query info', () => {
    const details = { query: 'SELECT * FROM users', table: 'users' };
    const error = new DatabaseError('Query failed', details);

    expect(error.details).toEqual(details);
  });
});
