const encoder = new TextEncoder();

export function normalizeIp(value: string | undefined): string | null {
  if (!value) return null;
  const candidate = value.trim().split(',')[0]?.trim();
  if (!candidate || /[\r\n]/.test(candidate)) return null;
  return candidate.replace(/^::ffff:/i, '').slice(0, 128) || null;
}

export async function createDailyVisitorHash(
  secret: string,
  ip: string,
  utcDate: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${utcDate}:${ip}`)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}
