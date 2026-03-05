'use client';

import { useEffect, useCallback, useRef } from 'react';

function isEditableElement(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.isContentEditable
  );
}

/**
 * Hook para obtener el height dinámico del viewport
 * Maneja correctamente el viewport cuando el teclado se abre/cierra en mobile
 *
 * Usa Visual Viewport API cuando está disponible, con fallback a window.innerHeight
 * Detecta cierre de teclado mediante eventos de input para forzar actualizaciones
 *
 */
export function useViewportHeight(): void {
  // Ref para rastrear el último height aplicado (evita escrituras innecesarias)
  const lastAppliedHeightRef = useRef<number | null>(null);
  // Ref para timeout de actualización forzada
  const forceUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  // Ref para agrupar actualizaciones rápidas en un solo frame
  const rafIdRef = useRef<number | null>(null);
  const scheduledForceUpdateRef = useRef(false);

  // * Función para actualizar la CSS variable --app-height
  const updateHeight = useCallback((force = false) => {
    if (typeof window === 'undefined') {
      return;
    }

    let newHeight: number;

    // * Usar Visual Viewport API si está disponible (mejor para mobile)
    if (window.visualViewport) {
      const visualViewportHeight =
        window.visualViewport.height + window.visualViewport.offsetTop;
      const layoutViewportHeight = window.innerHeight;
      const activeElement = document.activeElement;
      const keyboardLikelyOpen =
        isEditableElement(activeElement) &&
        layoutViewportHeight - visualViewportHeight > 120;

      newHeight = keyboardLikelyOpen
        ? visualViewportHeight
        : Math.max(visualViewportHeight, layoutViewportHeight);
    } else {
      // Fallback a window.innerHeight
      newHeight = window.innerHeight;
    }

    const threshold = 5;
    if (
      !force &&
      lastAppliedHeightRef.current !== null &&
      Math.abs(lastAppliedHeightRef.current - newHeight) <= threshold
    ) {
      return;
    }

    document.documentElement.style.setProperty(
      '--app-height',
      `${newHeight}px`
    );
    lastAppliedHeightRef.current = newHeight;
  }, []);

  const scheduleUpdateHeight = useCallback(
    (force = false) => {
      if (typeof window === 'undefined') {
        return;
      }

      scheduledForceUpdateRef.current =
        scheduledForceUpdateRef.current || force;

      if (rafIdRef.current !== null) {
        return;
      }

      rafIdRef.current = window.requestAnimationFrame(() => {
        const shouldForceUpdate = scheduledForceUpdateRef.current;
        scheduledForceUpdateRef.current = false;
        rafIdRef.current = null;
        updateHeight(shouldForceUpdate);
      });
    },
    [updateHeight]
  );

  // Función para forzar actualización cuando se detecta cierre de teclado
  const handleInputBlur = useCallback(() => {
    // Limpiar timeout anterior si existe
    if (forceUpdateTimeoutRef.current) {
      clearTimeout(forceUpdateTimeoutRef.current);
    }

    // Forzar actualización después de un pequeño delay para asegurar que el viewport se haya actualizado
    // Esto es especialmente importante en iOS Safari donde el viewport puede tardar en actualizarse
    forceUpdateTimeoutRef.current = setTimeout(() => {
      scheduleUpdateHeight(true);
      // Actualización adicional después de más tiempo para asegurar que se aplicó
      setTimeout(() => {
        scheduleUpdateHeight(true);
      }, 100);
    }, 150);
  }, [scheduleUpdateHeight]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Inicializar height inmediatamente al montar (solo en cliente)
    scheduleUpdateHeight();

    const handleViewportResize = () => {
      scheduleUpdateHeight(false);
    };

    const handleViewportScroll = () => {
      scheduleUpdateHeight(false);
    };

    const handleWindowResize = () => {
      scheduleUpdateHeight(false);
    };

    const handleOrientationChange = () => {
      scheduleUpdateHeight(false);
    };

    // Preferir Visual Viewport API si está disponible
    // Escuchar cambios en el visual viewport (cuando el teclado se abre/cierra)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
      window.visualViewport.addEventListener('scroll', handleViewportScroll);
    }

    // Mantener fallback/soporte adicional para navegadores que no disparan visualViewport consistentemente
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.visualViewport?.removeEventListener(
        'resize',
        handleViewportResize
      );
      window.visualViewport?.removeEventListener(
        'scroll',
        handleViewportScroll
      );
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
        scheduledForceUpdateRef.current = false;
      }
    };
  }, [scheduleUpdateHeight]);

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
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
        scheduledForceUpdateRef.current = false;
      }
    };
  }, [handleInputBlur]);
}
