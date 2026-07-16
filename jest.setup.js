require('@testing-library/jest-dom');

process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-key';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
  // Matches real behaviour: rethrows if error is a Next.js bailout (redirect/notFound).
  // In Jest there are no bailout errors, so this is effectively a no-op for normal tests.
  // If a test intentionally passes a bailout-shaped error, it will propagate correctly.
  unstable_rethrow: (error) => {
    if (
      error != null &&
      typeof error === 'object' &&
      error.$$typeof === Symbol.for('next.bailout')
    ) {
      throw error;
    }
  },
}));

// Suppress console warnings in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

const { TextEncoder, TextDecoder } = require('util');
const {
  ReadableStream,
  WritableStream,
  TransformStream,
  TextEncoderStream,
  TextDecoderStream,
} = require('stream/web');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.ReadableStream = ReadableStream;
// jsdom does not expose Web Streams; the AI SDK (via eventsource-parser)
// references TransformStream at module scope, so polyfill the full set.
global.WritableStream = WritableStream;
global.TransformStream = TransformStream;
global.TextEncoderStream = TextEncoderStream;
global.TextDecoderStream = TextDecoderStream;

// Polyfill Request/Response/Headers for next/server in jsdom
if (typeof globalThis.Request === 'undefined') {
  globalThis.Request = class Request {
    constructor(input, init) {
      this._url = typeof input === 'string' ? input : input?.url || '';
      this._method = init?.method || 'GET';
      this._headers = new Map();
      this._body = init?.body;
    }
    get url() {
      return this._url;
    }
    get method() {
      return this._method;
    }
    get headers() {
      return this._headers;
    }
    json() {
      return Promise.resolve(this._body ? JSON.parse(this._body) : {});
    }
  };
}
if (typeof globalThis.Response === 'undefined') {
  globalThis.Response = class Response {
    constructor(body, init) {
      this._body = body;
      this._status = init?.status || 200;
      this._headers = init?.headers || {};
    }
    get status() {
      return this._status;
    }
    json() {
      return Promise.resolve(
        typeof this._body === 'string' ? JSON.parse(this._body) : this._body
      );
    }
  };
}
if (typeof globalThis.Headers === 'undefined') {
  globalThis.Headers = class Headers extends Map {};
}

// Mock MessagePort for environments where it's not available (e.g., JSDOM)
if (typeof MessagePort === 'undefined') {
  global.MessagePort = class MessagePort {};
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Global fetch mock
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({ data: [], products: [] }), // Return structure expected by most tests
    text: () => Promise.resolve(''),
  })
);
