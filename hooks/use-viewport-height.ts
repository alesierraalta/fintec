'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook para obtener el height dinámico del viewport
 * Maneja correctamente el viewport cuando el teclado se abre/cierra en mobile
 * 
 * Usa Visual Viewport API cuando está disponible, con fallback a window.innerHeight
 * Detecta cierre de teclado mediante eventos de input para forzar actualizaciones
 * 
 * @returns Height actual del viewport en píxeles
 */
export function useViewportHeight(): number | null {
  // Inicializar como null para SSR - se actualizará en el cliente
  const [height, setHeight] = useState<number | null>(null);
  // Ref para rastrear el último height conocido (para detectar cambios significativos)
  const lastHeightRef = useRef<number | null>(null);
  // Ref para timeout de actualización forzada
  const forceUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Función para actualizar el height
  const updateHeight = useCallback((force = false) => {
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
        lastHeightRef.current = newHeight;
        return newHeight;
      }
      
      // Si se fuerza la actualización, siempre actualizar
      if (force) {
        lastHeightRef.current = newHeight;
        return newHeight;
      }
      
      // Solo actualizar si el cambio es significativo (> 5px para mejor detección)
      // Reducido de 1px a 5px para evitar actualizaciones muy frecuentes
      const threshold = 5;
      if (Math.abs(prevHeight - newHeight) > threshold) {
        lastHeightRef.current = newHeight;
        return newHeight;
      }
      return prevHeight;
    });
  }, []);

  // Función para forzar actualización cuando se detecta cierre de teclado
  const handleInputBlur = useCallback(() => {
    // Limpiar timeout anterior si existe
    if (forceUpdateTimeoutRef.current) {
      clearTimeout(forceUpdateTimeoutRef.current);
    }
    
    // Forzar actualización después de un pequeño delay para asegurar que el viewport se haya actualizado
    // Esto es especialmente importante en iOS Safari donde el viewport puede tardar en actualizarse
    forceUpdateTimeoutRef.current = setTimeout(() => {
      updateHeight(true);
      // Forzar scroll al top para evitar que el contenido se quede "empujado" hacia arriba
      window.scrollTo(0, 0);
      // Actualización adicional después de más tiempo para asegurar que se aplicó
      setTimeout(() => {
        updateHeight(true);
        window.scrollTo(0, 0);
      }, 100);
    }, 150);
  }, [updateHeight]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Inicializar height inmediatamente al montar (solo en cliente)
    updateHeight();

    // Preferir Visual Viewport API si está disponible
    if (window.visualViewport) {
      // Escuchar cambios en el visual viewport (cuando el teclado se abre/cierra)
      window.visualViewport.addEventListener('resize', () => updateHeight(false));
      window.visualViewport.addEventListener('scroll', () => updateHeight(false));

      return () => {
        window.visualViewport?.removeEventListener('resize', () => updateHeight(false));
        window.visualViewport?.removeEventListener('scroll', () => updateHeight(false));
      };
    } else {
      // Fallback: escuchar cambios en window
      window.addEventListener('resize', () => updateHeight(false));
      window.addEventListener('orientationchange', () => updateHeight(false));

      return () => {
        window.removeEventListener('resize', () => updateHeight(false));
        window.removeEventListener('orientationchange', () => updateHeight(false));
      };
    }
  }, [updateHeight]);

  // Detectar cierre de teclado mediante eventos de input
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Agregar listeners a todos los inputs, textareas y elementos editables
    // para detectar cuando el teclado se cierra (blur)
    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      // Solo procesar si es un input, textarea o elemento editable
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        handleInputBlur();
      }
    };

    // Usar capture phase para asegurar que capturamos todos los eventos
    document.addEventListener('blur', handleBlur, true);

    return () => {
      document.removeEventListener('blur', handleBlur, true);
      // Limpiar timeout si existe
      if (forceUpdateTimeoutRef.current) {
        clearTimeout(forceUpdateTimeoutRef.current);
      }
    };
  }, [handleInputBlur]);

  return height;
}

