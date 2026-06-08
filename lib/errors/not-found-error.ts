import { AppError } from './app-error';

/**
 * Error thrown when a requested resource is not found.
 */
export class NotFoundError extends AppError {
  constructor(
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}
