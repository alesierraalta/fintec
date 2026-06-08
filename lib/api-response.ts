import { AppError } from './errors/app-error';

/**
 * Standard API response envelope.
 * All API routes return this format for consistency.
 */
export interface ResponseEnvelope<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | null;
  meta: {
    timestamp: string;
  };
}

/**
 * Creates a success response envelope.
 */
export function successResponse<T>(data: T): ResponseEnvelope<T> {
  return {
    data,
    error: null,
    meta: { timestamp: new Date().toISOString() },
  };
}

/**
 * Creates an error response envelope from an AppError.
 */
export function errorResponse(error: AppError): ResponseEnvelope<null> {
  return {
    data: null,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
    meta: { timestamp: new Date().toISOString() },
  };
}
