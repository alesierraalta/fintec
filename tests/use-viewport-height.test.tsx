import { renderHook } from '@testing-library/react';
import { useViewportHeight } from '@/hooks/use-viewport-height';

describe('useViewportHeight', () => {
  const originalVisualViewport = window.visualViewport;
  beforeEach(() => {
    document.documentElement.style.removeProperty('--app-height');
  });

  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: originalVisualViewport,
    });
    document.documentElement.style.removeProperty('--app-height');
  });

  it('uses window.innerHeight when visualViewport is unavailable', () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 700,
    });

    renderHook(() => useViewportHeight());

    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('700px');
  });

  it('does not use VisualViewport when native WebView resizing is authoritative', () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: { height: 420 },
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 780,
    });

    renderHook(() => useViewportHeight());

    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('');
  });
});
