import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  // SSR-safe: start with false to match server render
  const [matches, setMatches] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const media = window.matchMedia(query);

    // Set initial value
    setMatches(media.matches);

    // Define listener
    const listener = (e: MediaQueryListEvent | MediaQueryList) => {
      setMatches(media.matches);
    };

    // Add listener (using modern API)
    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } else {
      // Fallback for older browsers
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
  }, [query]);

  // Return false during SSR and first render to prevent hydration mismatch
  return mounted && matches;
}