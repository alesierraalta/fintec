'use client';

import { useEffect, useState } from 'react';

const DEFAULT_NAV_HEIGHT = 68;

function safeAreaBottom(): number {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--safe-area-bottom')
    .trim();
  const pixels = Number.parseFloat(value);
  return Number.isFinite(pixels) ? pixels : 0;
}

/** Publishes the measured mobile navigation geometry for all shell consumers. */
export function useMobileChromeGeometry(): {
  navHeight: number;
  chromeBottom: number;
} {
  const [geometry, setGeometry] = useState({
    navHeight: DEFAULT_NAV_HEIGHT,
    chromeBottom: DEFAULT_NAV_HEIGHT,
  });

  useEffect(() => {
    const nav = document.querySelector<HTMLElement>('[data-testid="mobile-nav"]');
    if (!nav) return;

    const publish = () => {
      const navHeight = Math.ceil(nav.getBoundingClientRect().height) || DEFAULT_NAV_HEIGHT;
      const chromeBottom = navHeight + safeAreaBottom();
      setGeometry({ navHeight, chromeBottom });
      const root = document.documentElement;
      root.style.setProperty('--mobile-nav-height', `${navHeight}px`);
      root.style.setProperty('--mobile-chrome-bottom', `${chromeBottom}px`);
    };

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(nav);
    window.addEventListener('resize', publish);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', publish);
      document.documentElement.style.removeProperty('--mobile-nav-height');
      document.documentElement.style.removeProperty('--mobile-chrome-bottom');
    };
  }, []);

  return geometry;
}
