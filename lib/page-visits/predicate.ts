const BOT_TOKENS = [
  'bot',
  'crawler',
  'spider',
  'slurp',
  'headless',
  'facebookexternalhit',
  'bingpreview',
  'lighthouse',
  'curl',
];
const ASSET = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff2?)$/i;

export function normalizePathname(pathname: string): string | null {
  if (
    !pathname ||
    /[\u0000-\u001f\u007f]/.test(pathname) ||
    pathname.length > 512
  )
    return null;
  const path = `/${pathname.replace(/^\/+/, '').replace(/\/{2,}/g, '/')}`;
  return path === '/' ? path : path.replace(/\/+$/, '');
}

export function isBot(userAgent: string | null): boolean {
  return (
    !!userAgent &&
    BOT_TOKENS.some((token) => userAgent.toLowerCase().includes(token))
  );
}

export function isPageNavigation(request: Request): boolean {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  const path = url.pathname;
  if (
    /^\/(?:api|_next|static)(?:\/|$)/.test(path) ||
    path === '/favicon.ico' ||
    ASSET.test(path)
  )
    return false;
  if (
    request.headers.has('rsc') ||
    request.headers.has('next-router-prefetch') ||
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.has('x-nextjs-data')
  )
    return false;
  const accept = request.headers.get('accept');
  if (accept && !accept.includes('text/html') && !accept.includes('*/*'))
    return false;
  return (
    !isBot(request.headers.get('user-agent')) &&
    normalizePathname(path) !== null
  );
}
