import { AppError } from './app-error';

/**
 * Error thrown when a request conflicts with current resource state.
 * Examples: duplicate entry, invalid state transition.
 * Maps to HTTP 409 Conflict.
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}
