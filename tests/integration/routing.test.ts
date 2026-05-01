import { describe, it, expect, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

// Mock updateSession
jest.mock('@/lib/supabase/middleware', () => ({
  updateSession: jest.fn(async (req: any) => ({ status: 200, request: req })),
}));

describe('Routing and Middleware Integration', () => {
  it('should have a rewrite rule for /login to /auth/login', async () => {
    const configPath = path.join(process.cwd(), 'next.config.js');
    // Clear cache to ensure we get fresh content
    delete require.cache[require.resolve(configPath)];
    const nextConfig = require(configPath);

    if (typeof nextConfig.rewrites !== 'function') {
      expect(nextConfig.rewrites).toBeDefined();
      return;
    }

    const rewrites = await nextConfig.rewrites();
    const loginRewrite = rewrites.find((r: any) => r.source === '/login');

    expect(loginRewrite).toBeDefined();
    expect(loginRewrite.destination).toBe('/auth/login');
  });

  it('should have middleware.ts at the root', () => {
    const middlewarePath = path.join(process.cwd(), 'middleware.ts');
    expect(fs.existsSync(middlewarePath)).toBe(true);
  });

  it('middleware.ts should export a middleware function that calls updateSession', async () => {
    const { middleware } = await import('../../middleware');
    const { updateSession } = await import('@/lib/supabase/middleware');

    const mockRequest = { url: 'http://localhost/test' } as any;
    await middleware(mockRequest);

    expect(updateSession).toHaveBeenCalledWith(mockRequest);
  });

  it('proxy.ts should no longer exist at the root', () => {
    const proxyPath = path.join(process.cwd(), 'proxy.ts');
    expect(fs.existsSync(proxyPath)).toBe(false);
  });
});
