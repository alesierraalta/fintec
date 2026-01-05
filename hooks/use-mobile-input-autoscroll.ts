'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useMediaQuery } from './use-media-query';

/**
 * Hook para auto-scroll de inputs cuando reciben focus en móvil
 * Previene que el teclado oculte el input enfocado
 * 
 * @param delay - Delay en ms antes de hacer scroll (default: 300ms)
 * @returns void
 * 
 * @example
 * ```tsx
 * function MyForm() {
 *   useMobileInputAutoScroll();
 *   return <form>...</form>;
 * }
 * ```
 */
export function useMobileInputAutoScroll(delay: number = 300) {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Memoized handler to prevent re-creating on every render
    const handleFocus = useCallback((e: FocusEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            // Clear any pending timeout to avoid memory leaks
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            // Delay to ensure keyboard is fully deployed before scrolling
            scrollTimeoutRef.current = setTimeout(() => {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                });
                scrollTimeoutRef.current = null;
            }, delay);
        }
    }, [delay]);

    useEffect(() => {
        if (typeof window === 'undefined' || !isMobile) return;

        document.addEventListener('focus', handleFocus, true);

        return () => {
            document.removeEventListener('focus', handleFocus, true);
            // Cleanup pending timeout on unmount
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [isMobile, handleFocus]);
}
