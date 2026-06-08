import { AppError } from './app-error';

/**
 * Error thrown when input validation fails.
 * Carries field-level details about what failed validation.
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}
