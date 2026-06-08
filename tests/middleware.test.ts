// Mock next/server before any imports
jest.mock('next/server', () => {
  return {
    NextRequest: class MockNextRequest {
      url: string;
      method: string;
      constructor(input: string | { url: string }, init?: { method?: string }) {
        this.url = typeof input === 'string' ? input : input?.url || '';
        this.method = init?.method || 'GET';
      }
    },
    NextResponse: {
      next: jest.fn(() => ({ status: 200 })),
      json: jest.fn((body, init) => ({ status: init?.status ?? 200, body })),
    },
  };
});

// Mock the supabase middleware
jest.mock('@/lib/supabase/middleware', () => ({
  updateSession: jest.fn(),
}));

// Import the middleware function and config AFTER mocks
const { middleware, config } = require('@/middleware');

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export a middleware function', () => {
    expect(typeof middleware).toBe('function');
  });

  it('should export a config with matcher', () => {
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
    expect(Array.isArray(config.matcher)).toBe(true);
    expect(config.matcher.length).toBeGreaterThan(0);
  });

  it('should call updateSession with the request', async () => {
    const { updateSession } = require('@/lib/supabase/middleware');
    const mockResponse = { status: 200 };
    updateSession.mockResolvedValue(mockResponse);

    const request = { url: 'http://localhost:3000/api/test', method: 'GET' };
    await middleware(request);

    expect(updateSession).toHaveBeenCalledWith(request);
  });

  it('should return the result from updateSession', async () => {
    const { updateSession } = require('@/lib/supabase/middleware');
    const mockResponse = { status: 200, body: { ok: true } };
    updateSession.mockResolvedValue(mockResponse);

    const request = { url: 'http://localhost:3000/api/test', method: 'GET' };
    const result = await middleware(request);

    expect(result).toBe(mockResponse);
  });

  it('should have matcher that excludes static files', () => {
    const matcherPattern = config.matcher[0];
    expect(matcherPattern).toContain('_next/static');
    expect(matcherPattern).toContain('_next/image');
    expect(matcherPattern).toContain('favicon.ico');
  });
});
