import * as fs from 'fs';
import * as path from 'path';
import React from 'react';

// Mock dependencies before importing the page module
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/auth/is-frontend-auth-bypass-enabled', () => ({
  isFrontendAuthBypassEnabled: jest.fn(),
}));

// Mock the landing page client as a simple component
jest.mock('@/app/landing/landing-page-client', () => {
  return function MockLandingPageClient() {
    return React.createElement(
      'div',
      { 'data-testid': 'landing-page' },
      'Landing Page'
    );
  };
});

// Mock the layout components
jest.mock('@/components/layout/main-layout', () => ({
  MainLayout: function MockMainLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return React.createElement(
      'div',
      { 'data-testid': 'main-layout' },
      children
    );
  },
}));

jest.mock('@/components/dashboard/lazy-dashboard-content', () => ({
  LazyDashboardContent: function MockLazyDashboardContent() {
    return React.createElement(
      'div',
      { 'data-testid': 'lazy-dashboard' },
      'Dashboard Content'
    );
  },
}));

// Mock next/navigation redirect for server component tests
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

// Mock framer-motion for LocalProvidersForRootDashboard
jest.mock('framer-motion', () => ({
  MotionConfig: function MockMotionConfig({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return React.createElement(
      'div',
      { 'data-testid': 'motion-config' },
      children
    );
  },
}));

// Mock auth context and providers
jest.mock('@/contexts/auth-context', () => ({
  AuthProvider: function MockAuthProvider({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return React.createElement(
      'div',
      { 'data-testid': 'auth-provider' },
      children
    );
  },
}));

jest.mock('@/providers', () => ({
  RepositoryProvider: function MockRepositoryProvider({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return React.createElement(
      'div',
      { 'data-testid': 'repository-provider' },
      children
    );
  },
}));

describe('HomePage (app/page.tsx)', () => {
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;
  const originalBypassFlag = env.FRONTEND_AUTH_BYPASS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    env.NODE_ENV = originalNodeEnv;
    env.FRONTEND_AUTH_BYPASS = originalBypassFlag;
  });

  afterAll(() => {
    env.NODE_ENV = originalNodeEnv;
    env.FRONTEND_AUTH_BYPASS = originalBypassFlag;
  });

  it('renders landing when no user is authenticated', async () => {
    const { createClient } = require('@/lib/supabase/server');
    const {
      isFrontendAuthBypassEnabled,
    } = require('@/lib/auth/is-frontend-auth-bypass-enabled');

    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });
    isFrontendAuthBypassEnabled.mockReturnValue(false);

    const HomePage = (await import('@/app/page')).default;
    const result = await HomePage();

    // Check that it renders the landing component (type is the mocked LandingPageClient)
    expect(result).toBeDefined();
    expect(result.type.name).toBe('MockLandingPageClient');
  });

  it('renders dashboard when user is authenticated', async () => {
    const { createClient } = require('@/lib/supabase/server');
    const {
      isFrontendAuthBypassEnabled,
    } = require('@/lib/auth/is-frontend-auth-bypass-enabled');

    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });
    isFrontendAuthBypassEnabled.mockReturnValue(false);

    const HomePage = (await import('@/app/page')).default;
    const result = await HomePage();

    expect(result).toBeDefined();
    // Should be wrapped in LocalProvidersForRootDashboard
    expect(result.type.name).toBe('LocalProvidersForRootDashboard');
    // Check that MainLayout is in the children
    expect(result.props.children.type.name).toBe('MockMainLayout');
  });

  it('renders landing when getUser returns null', async () => {
    const { createClient } = require('@/lib/supabase/server');
    const {
      isFrontendAuthBypassEnabled,
    } = require('@/lib/auth/is-frontend-auth-bypass-enabled');

    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });
    isFrontendAuthBypassEnabled.mockReturnValue(false);

    const HomePage = (await import('@/app/page')).default;
    const result = await HomePage();

    expect(result).toBeDefined();
    expect(result.type.name).toBe('MockLandingPageClient');
  });

  it('renders dashboard when FRONTEND_AUTH_BYPASS is enabled', async () => {
    const { createClient } = require('@/lib/supabase/server');
    const {
      isFrontendAuthBypassEnabled,
    } = require('@/lib/auth/is-frontend-auth-bypass-enabled');

    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });
    isFrontendAuthBypassEnabled.mockReturnValue(true);

    const HomePage = (await import('@/app/page')).default;
    const result = await HomePage();

    expect(result).toBeDefined();
    expect(result.type.name).toBe('LocalProvidersForRootDashboard');
  });

  it('page is a server component (no use client)', () => {
    const pagePath = path.join(process.cwd(), 'app/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');
    expect(content).not.toContain("'use client'");
    expect(content).not.toContain('"use client"');
  });
});

describe('generateMetadata', () => {
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;
  const originalBypassFlag = env.FRONTEND_AUTH_BYPASS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    env.NODE_ENV = originalNodeEnv;
    env.FRONTEND_AUTH_BYPASS = originalBypassFlag;
  });

  afterAll(() => {
    env.NODE_ENV = originalNodeEnv;
    env.FRONTEND_AUTH_BYPASS = originalBypassFlag;
  });

  it('metadata has canonical / when rendering landing', async () => {
    const { createClient } = require('@/lib/supabase/server');
    const {
      isFrontendAuthBypassEnabled,
    } = require('@/lib/auth/is-frontend-auth-bypass-enabled');

    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });
    isFrontendAuthBypassEnabled.mockReturnValue(false);

    const { generateMetadata } = await import('@/app/page');
    const metadata = await generateMetadata();

    expect(metadata.alternates?.canonical).toBe('/');
    expect(metadata.openGraph?.url).toBe('/');
  });

  it('metadata has noindex when rendering dashboard', async () => {
    const { createClient } = require('@/lib/supabase/server');
    const {
      isFrontendAuthBypassEnabled,
    } = require('@/lib/auth/is-frontend-auth-bypass-enabled');

    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });
    isFrontendAuthBypassEnabled.mockReturnValue(false);

    const { generateMetadata } = await import('@/app/page');
    const metadata = await generateMetadata();

    expect(metadata.robots).toBe('noindex, nofollow');
    expect(metadata.title).toContain('Dashboard');
  });
});
