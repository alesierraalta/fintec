'use client';

import { useEffect } from 'react';

/** Uses native WebView resize; VisualViewport is only a bounded browser fallback. */
export function useViewportHeight(): void {
  useEffect(() => {
    const update = () => {
      if (!window.visualViewport) {
        document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
      }
    };

    update();
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      document.documentElement.style.removeProperty('--app-height');
    };
  }, []);
}
