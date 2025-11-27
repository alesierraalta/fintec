'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook para obtener el height dinámico del viewport
 * Maneja correctamente el viewport cuando el teclado se abre/cierra en mobile
 * 
 * Usa Visual Viewport API cuando está disponible, con fallback a window.innerHeight
 * 
 * @returns Height actual del viewport en píxeles
 */
export function useViewportHeight(): number | null {
  // Inicializar como null para SSR - se actualizará en el cliente
  const [height, setHeight] = useState<number | null>(null);

  // Función para actualizar el height
  const updateHeight = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let newHeight: number;

    // Usar Visual Viewport API si está disponible (mejor para mobile)
    if (window.visualViewport) {
      newHeight = window.visualViewport.height;
    } else {
      // Fallback a window.innerHeight
      newHeight = window.innerHeight;
    }

    // Solo actualizar si el height cambió (evita re-renders innecesarios)
    setHeight(prevHeight => {
      // Si prevHeight es null (primera vez), siempre actualizar
      if (prevHeight === null) {
        return newHeight;
      }
      // Solo actualizar si el cambio es significativo (> 1px)
      if (Math.abs(prevHeight - newHeight) > 1) {
        return newHeight;
      }
      return prevHeight;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Inicializar height inmediatamente al montar (solo en cliente)
    updateHeight();

    // Preferir Visual Viewport API si está disponible
    if (window.visualViewport) {
      // Escuchar cambios en el visual viewport (cuando el teclado se abre/cierra)
      window.visualViewport.addEventListener('resize', updateHeight);
      window.visualViewport.addEventListener('scroll', updateHeight);

      return () => {
        window.visualViewport?.removeEventListener('resize', updateHeight);
        window.visualViewport?.removeEventListener('scroll', updateHeight);
      };
    } else {
      // Fallback: escuchar cambios en window
      window.addEventListener('resize', updateHeight);
      window.addEventListener('orientationchange', updateHeight);

      return () => {
        window.removeEventListener('resize', updateHeight);
        window.removeEventListener('orientationchange', updateHeight);
      };
    }
  }, [updateHeight]);

  return height;
}

