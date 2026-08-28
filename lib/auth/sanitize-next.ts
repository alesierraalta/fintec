/**
 * Sanitize the `next` redirect parameter to prevent open-redirect attacks.
 *
 * Returns the path if it is a safe same-origin relative path starting with `/`
 * (but NOT `//`). Returns undefined otherwise.
 */
export function sanitizeNext(
  next: string | null | undefined
): string | undefined {
  if (!next) return undefined;

  // Reject protocol-relative URLs (//host/path) — these resolve to external
  if (next.startsWith('//')) return undefined;

  // Reject absolute URLs with a scheme (https://, http://, ftp://, etc.)
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(next)) return undefined;

  // Accept only paths starting with /
  if (!next.startsWith('/')) return undefined;

  return next;
}
