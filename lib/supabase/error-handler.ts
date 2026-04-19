/**
 * Sanitizes Supabase/PostgREST error messages to prevent HTML leakage.
 * If HTML is detected (e.g., Cloudflare 5xx), returns a generic message.
 */
export function sanitizeError(error: any): string {
  if (error === null || error === undefined) {
    return 'Unknown Database Error';
  }

  const message = typeof error === 'string' ? error : (error.message || String(error));
  
  // Basic HTML detection: check if starts with <html> or contains tags
  const hasHtml = /<[a-z][\s\S]*>/i.test(message);

  if (hasHtml) {
    return 'Database Unavailable (HTML content detected)';
  }

  return message;
}

/**
 * Checks if a given error (message or status code) should trigger a retry.
 */
export function isRetryable(error: string | number): boolean {
  if (typeof error === 'number') {
    return error >= 500 && error < 600;
  }

  const retryableCodes = ['ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN'];
  return retryableCodes.includes(error);
}
