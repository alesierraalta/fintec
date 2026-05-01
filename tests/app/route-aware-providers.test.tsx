import React from 'react';
import { render, screen } from '@testing-library/react';
import { RouteAwareProviders } from '@/app/route-aware-providers';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

const mockUsePathname = jest.fn();
const mockMotionConfig = jest.fn(
  ({ children }: { children: React.ReactNode }) => (
    <div data-testid="motion-config">{children}</div>
  )
);

const mockAuthProvider = jest.fn(
  ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  )
);

const mockRepositoryProvider = jest.fn(
  ({ children }: { children: React.ReactNode }) => (
    <div data-testid="repository-provider">{children}</div>
  )
);

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('framer-motion', () => ({
  MotionConfig: (props: { reducedMotion: 'user'; children: React.ReactNode }) =>
    mockMotionConfig(props),
}));

jest.mock('@/contexts/auth-context', () => ({
  AuthProvider: (props: { children: React.ReactNode }) =>
    mockAuthProvider(props),
}));

jest.mock('@/providers', () => ({
  RepositoryProvider: (props: { children: React.ReactNode }) =>
    mockRepositoryProvider(props),
}));

describe('RouteAwareProviders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps landing routes provider-free while still honoring global reduced-motion policy', () => {
    mockUsePathname.mockReturnValue('/landing');

    render(
      <RouteAwareProviders>
        <div>Landing content</div>
      </RouteAwareProviders>
    );

    expect(screen.getByText('Landing content')).toBeInTheDocument();
    expect(screen.getByTestId('motion-config')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-provider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('repository-provider')).not.toBeInTheDocument();
    expect(mockMotionConfig).toHaveBeenCalledWith(
      expect.objectContaining({ reducedMotion: 'user' })
    );
    expect(mockAuthProvider).not.toHaveBeenCalled();
    expect(mockRepositoryProvider).not.toHaveBeenCalled();
  });

  it('applies auth/app providers on auth routes under the same reduced-motion policy', () => {
    mockUsePathname.mockReturnValue('/auth/login');

    render(
      <RouteAwareProviders>
        <div>Auth content</div>
      </RouteAwareProviders>
    );

    expect(screen.getByText('Auth content')).toBeInTheDocument();
    expect(screen.getByTestId('motion-config')).toBeInTheDocument();
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    expect(screen.getByTestId('repository-provider')).toBeInTheDocument();
    expect(mockMotionConfig).toHaveBeenCalledWith(
      expect.objectContaining({ reducedMotion: 'user' })
    );
    expect(mockAuthProvider).toHaveBeenCalledTimes(1);
    expect(mockRepositoryProvider).toHaveBeenCalledTimes(1);
  });

  it('bypasses providers for root path /', () => {
    mockUsePathname.mockReturnValue('/');

    render(
      <RouteAwareProviders>
        <div>Root content</div>
      </RouteAwareProviders>
    );

    expect(screen.getByText('Root content')).toBeInTheDocument();
    expect(screen.getByTestId('motion-config')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-provider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('repository-provider')).not.toBeInTheDocument();
    expect(mockAuthProvider).not.toHaveBeenCalled();
    expect(mockRepositoryProvider).not.toHaveBeenCalled();
  });

  it('handles null pathname safely', () => {
    mockUsePathname.mockReturnValue(null);

    render(
      <RouteAwareProviders>
        <div>Null pathname content</div>
      </RouteAwareProviders>
    );

    expect(screen.getByText('Null pathname content')).toBeInTheDocument();
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    expect(screen.getByTestId('repository-provider')).toBeInTheDocument();
  });

  it('bypasses providers for root path /', () => {
    mockUsePathname.mockReturnValue('/');

    render(
      <RouteAwareProviders>
        <div>Root content</div>
      </RouteAwareProviders>
    );

    expect(screen.getByText('Root content')).toBeInTheDocument();
    expect(screen.getByTestId('motion-config')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-provider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('repository-provider')).not.toBeInTheDocument();
    expect(mockAuthProvider).not.toHaveBeenCalled();
    expect(mockRepositoryProvider).not.toHaveBeenCalled();
  });

  it('handles null pathname safely', () => {
    mockUsePathname.mockReturnValue(null);

    render(
      <RouteAwareProviders>
        <div>Null pathname content</div>
      </RouteAwareProviders>
    );

    expect(screen.getByText('Null pathname content')).toBeInTheDocument();
    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    expect(screen.getByTestId('repository-provider')).toBeInTheDocument();
  });

  it('applies app providers on dashboard routes under the same reduced-motion policy', () => {
    mockUsePathname.mockReturnValue('/dashboard');

    render(
      <RouteAwareProviders>
        <div>App content</div>
      </RouteAwareProviders>
    );

    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    expect(screen.getByTestId('repository-provider')).toBeInTheDocument();
    expect(screen.getByTestId('motion-config')).toBeInTheDocument();
    expect(screen.getByText('App content')).toBeInTheDocument();
    expect(mockMotionConfig).toHaveBeenCalledWith(
      expect.objectContaining({ reducedMotion: 'user' })
    );
    expect(mockAuthProvider).toHaveBeenCalledTimes(1);
    expect(mockRepositoryProvider).toHaveBeenCalledTimes(1);
  });
});
