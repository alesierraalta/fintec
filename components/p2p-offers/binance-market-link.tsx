'use client';

import type { AnchorHTMLAttributes, MouseEvent } from 'react';

const MOBILE_BINANCE_PATTERN = /Android|iPhone|iPad|iPod/i;
const APP_FALLBACK_DELAY_MS = 1_200;

export function buildBinanceAppDeepLink(webUrl: string): string {
  const encodedUrl = encodeURIComponent(window.btoa(webUrl));
  return `bnc://app.binance.com/webview/webview?type=default&url=${encodedUrl}`;
}

function isMobileDevice(): boolean {
  return MOBILE_BINANCE_PATTERN.test(navigator.userAgent);
}

export function BinanceMarketLink({
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || !isMobileDevice()) return;

    event.preventDefault();
    const webUrl = props.href;
    if (typeof webUrl !== 'string') return;

    let fallbackTimer: number | undefined;
    const cleanup = () => {
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') cleanup();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.location.href = buildBinanceAppDeepLink(webUrl);
    fallbackTimer = window.setTimeout(() => {
      cleanup();
      window.location.href = webUrl;
    }, APP_FALLBACK_DELAY_MS);
  };

  return <a {...props} onClick={handleClick} />;
}
