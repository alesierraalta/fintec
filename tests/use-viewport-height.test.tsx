import { renderHook, act } from '@testing-library/react';
import { useViewportHeight } from '@/hooks/use-viewport-height';

type ViewportListener = () => void;

class VisualViewportMock {
  public height: number;
  public offsetTop: number;
  private readonly listeners = new Map<string, Set<ViewportListener>>();

  constructor(height: number, offsetTop = 0) {
    this.height = height;
    this.offsetTop = offsetTop;
  }

  addEventListener(type: string, listener: ViewportListener): void {
    const current = this.listeners.get(type) ?? new Set<ViewportListener>();
    current.add(listener);
    this.listeners.set(type, current);
  }

  removeEventListener(type: string, listener: ViewportListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string): void {
    this.listeners.get(type)?.forEach((listener) => listener());
  }
}

describe('useViewportHeight', () => {
  const originalVisualViewport = window.visualViewport;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;

  beforeEach(() => {
    jest.useFakeTimers();
    document.documentElement.style.removeProperty('--app-height');
    window.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      callback(0);
      return 1;
    };
    window.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
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

  it('uses visual viewport height while keyboard is likely open', () => {
    const visualViewport = new VisualViewportMock(420, 0);

    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: visualViewport,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 780,
    });

    const input = document.createElement('input');
    document.body.appendChild(input);
    const activeElementSpy = jest.spyOn(document, 'activeElement', 'get');
    activeElementSpy.mockReturnValue(input);

    renderHook(() => useViewportHeight());

    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('420px');

    activeElementSpy.mockRestore();
    input.remove();
  });
});
