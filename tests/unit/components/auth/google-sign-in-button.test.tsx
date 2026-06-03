/**
 * T1.5 — GoogleSignInButton
 * Unit tests (dom/jsdom project)
 * Satisfies: REQ-01, REQ-02 (SCN-01 unit portion, SCN-02 unit portion)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { useAuth } from '@/hooks/use-auth';

// ---------------------------------------------------------------------------
// Mock useAuth
// ---------------------------------------------------------------------------

const mockSignInWithGoogle = jest.fn();

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

beforeEach(() => {
  jest.clearAllMocks();
  mockSignInWithGoogle.mockResolvedValue({ error: null });
  mockUseAuth.mockReturnValue({
    signInWithGoogle: mockSignInWithGoogle,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
    resendVerification: jest.fn(),
    updateProfile: jest.fn(),
    user: null,
    session: null,
    loading: false,
    baseCurrency: 'USD',
    authError: null,
    clearAuthError: jest.fn(),
  } as any);
});

describe('GoogleSignInButton', () => {
  it('renders without crashing', () => {
    render(<GoogleSignInButton />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has accessible text matching /continue with google/i', () => {
    render(<GoogleSignInButton />);
    // The accessible name (aria-label or visible text) must include "Continue with Google"
    expect(
      screen.getByRole('button', { name: /continue with google/i })
    ).toBeInTheDocument();
  });

  it('is enabled by default', () => {
    render(<GoogleSignInButton />);
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it('calls signInWithGoogle() when clicked', () => {
    render(<GoogleSignInButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('passes next prop to signInWithGoogle when provided', () => {
    render(<GoogleSignInButton next="/dashboard" />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockSignInWithGoogle).toHaveBeenCalledWith('/dashboard');
  });

  it('is disabled when disabled prop is true', () => {
    render(<GoogleSignInButton disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does NOT call signInWithGoogle when disabled and clicked', () => {
    render(<GoogleSignInButton disabled />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockSignInWithGoogle).not.toHaveBeenCalled();
  });

  it('shows a loading state when loading prop is true', () => {
    render(<GoogleSignInButton loading />);
    const button = screen.getByRole('button');
    // Button should be disabled during loading
    expect(button).toBeDisabled();
  });

  it('renders the Google G SVG icon', () => {
    render(<GoogleSignInButton />);
    // SVG should be present in the component
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has a touch-target minimum height of 44px via class', () => {
    render(<GoogleSignInButton />);
    const button = screen.getByRole('button');
    // The button should have a class that ensures min-h-[44px] or similar
    expect(button.className).toMatch(/min-h/);
  });
});
