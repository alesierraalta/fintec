import { AppError } from './app-error';

/**
 * Error thrown when an authenticated user lacks permission to perform an action.
 * Maps to HTTP 403 Forbidden.
 */
export class AuthorizationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'FORBIDDEN', 403, details);
    this.name = 'AuthorizationError';
  }
}
