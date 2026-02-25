import React from 'react';
import { render, screen } from '@testing-library/react';
import { RouteAwareProviders } from '@/app/route-aware-providers';

const mockUsePathname = jest.fn();

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

  it('bypasses app providers on /landing', () => {
    mockUsePathname.mockReturnValue('/landing');

    render(
      <RouteAwareProviders>
        <div>Landing content</div>
      </RouteAwareProviders>
    );

    expect(screen.getByText('Landing content')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-provider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('repository-provider')).not.toBeInTheDocument();
    expect(mockAuthProvider).not.toHaveBeenCalled();
    expect(mockRepositoryProvider).not.toHaveBeenCalled();
  });

  it('bypasses app providers on /landing/* routes', () => {
    mockUsePathname.mockReturnValue('/landing/promo');

    render(
      <RouteAwareProviders>
        <div>Landing subroute content</div>
      </RouteAwareProviders>
    );

    expect(screen.getByText('Landing subroute content')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-provider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('repository-provider')).not.toBeInTheDocument();
    expect(mockAuthProvider).not.toHaveBeenCalled();
    expect(mockRepositoryProvider).not.toHaveBeenCalled();
  });

  it('applies both providers on non-landing routes', () => {
    mockUsePathname.mockReturnValue('/dashboard');

    render(
      <RouteAwareProviders>
        <div>App content</div>
      </RouteAwareProviders>
    );

    expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
    expect(screen.getByTestId('repository-provider')).toBeInTheDocument();
    expect(screen.getByText('App content')).toBeInTheDocument();
    expect(mockAuthProvider).toHaveBeenCalledTimes(1);
    expect(mockRepositoryProvider).toHaveBeenCalledTimes(1);
  });
});
