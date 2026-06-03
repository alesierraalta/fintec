/**
 * T2.3 — NativeOAuthListener provider  (REQ-11, REQ-12)
 * TDD layer: unit / jsdom (Jest dom project)
 *
 * Verifies:
 * - Mounting registers the 'appUrlOpen' App.addListener
 * - Unmounting calls remove() on the listener handle
 */

import React from 'react';
import { render, act } from '@testing-library/react';

// --- Capacitor mocks ---

const mockRemove = jest.fn();
const mockAddListener = jest.fn().mockResolvedValue({ remove: mockRemove });
const mockRemoveAllListeners = jest.fn().mockResolvedValue(undefined);

jest.mock('@capacitor/app', () => ({
  App: {
    addListener: (...args: unknown[]) => mockAddListener(...args),
    removeAllListeners: (...args: unknown[]) =>
      mockRemoveAllListeners(...args),
  },
}));

jest.mock('@capacitor/browser', () => ({
  Browser: {
    open: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));

// --- Supabase mock ---

jest.mock('@/repositories/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn().mockResolvedValue({ data: { url: null }, error: null }),
      exchangeCodeForSession: jest.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
}));

// --- router mock ---

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// --- Import under test (after all mocks) ---

import { NativeOAuthListener } from '@/components/providers/native-oauth-listener';

// ============================================================
// Tests
// ============================================================

describe('NativeOAuthListener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddListener.mockResolvedValue({ remove: mockRemove });
  });

  it('calls App.addListener("appUrlOpen") on mount', async () => {
    await act(async () => {
      render(<NativeOAuthListener />);
    });

    expect(mockAddListener).toHaveBeenCalledWith(
      'appUrlOpen',
      expect.any(Function)
    );
  });

  it('calls remove() on the listener handle when the component unmounts', async () => {
    let unmount!: () => void;

    await act(async () => {
      const result = render(<NativeOAuthListener />);
      unmount = result.unmount;
    });

    await act(async () => {
      unmount();
    });

    expect(mockRemove).toHaveBeenCalled();
  });

  it('renders nothing (null) — provider has no visible output', async () => {
    let container!: HTMLElement;

    await act(async () => {
      const result = render(<NativeOAuthListener />);
      container = result.container;
    });

    expect(container.firstChild).toBeNull();
  });

  it('renders children when provided', async () => {
    let getByText!: (text: string) => HTMLElement;

    await act(async () => {
      const result = render(
        <NativeOAuthListener>
          <span>child</span>
        </NativeOAuthListener>
      );
      getByText = result.getByText;
    });

    expect(getByText('child')).toBeTruthy();
  });
});
