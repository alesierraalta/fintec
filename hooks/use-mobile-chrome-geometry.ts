'use client';

import { useEffect, useState } from 'react';

const DEFAULT_NAV_HEIGHT = 68;

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
    let observer: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const publish = (navEl: HTMLElement) => {
      const rect = navEl.getBoundingClientRect();
      const rawHeight = Math.ceil(rect?.height);
      const navHeight =
        Number.isFinite(rawHeight) && rawHeight > 0
          ? rawHeight
          : DEFAULT_NAV_HEIGHT;
      // getBoundingClientRect().height already includes rendered borders and padding
      const chromeBottom = navHeight;
      setGeometry({ navHeight, chromeBottom });
      const root = document.documentElement;
      root.style.setProperty('--mobile-nav-height', `${navHeight}px`);
      root.style.setProperty('--mobile-chrome-bottom', `${chromeBottom}px`);
    };

    const attach = (): boolean => {
      const nav = document.querySelector<HTMLElement>(
        '[data-testid="mobile-nav"]'
      );
      if (!nav) return false;
      publish(nav);
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(() => publish(nav));
        observer.observe(nav);
      }
      return true;
    };

    if (!attach() && typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(() => {
        if (attach()) {
          mutationObserver?.disconnect();
          mutationObserver = null;
        }
      });
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    const onResize = () => {
      const nav = document.querySelector<HTMLElement>(
        '[data-testid="mobile-nav"]'
      );
      if (nav) publish(nav);
    };

    window.addEventListener('resize', onResize);
    return () => {
      observer?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return geometry;
}
