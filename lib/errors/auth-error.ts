import { AppError } from './app-error';

/**
 * Error thrown when authentication or authorization fails.
 */
export class AuthError extends AppError {
  constructor(
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'AuthError';
  }
}
