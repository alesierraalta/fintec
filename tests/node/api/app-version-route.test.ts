import { GET } from '@/app/api/app/version/route';

describe('/api/app/version API Route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns default version metadata when environment variables are not set', async () => {
    delete process.env.NEXT_PUBLIC_LATEST_ANDROID_VERSION_NAME;
    delete process.env.NEXT_PUBLIC_LATEST_ANDROID_VERSION_CODE;
    delete process.env.NEXT_PUBLIC_APK_URL;

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual({
      latestVersionName: '1.0.2',
      latestVersionCode: 3,
      minRequiredVersionCode: 1,
      apkUrl: '/fintec-beta.apk',
      releaseNotes:
        'Novedades: Flujo Scan-to-Confirm en 1 tap, cámara directa, pegado de portapapeles, visor con zoom y mejoras de rendimiento.',
      publishedAt: '2026-09-12T00:00:00Z',
    });

    expect(res.headers.get('Cache-Control')).toBe(
      'public, s-maxage=300, stale-while-revalidate=600'
    );
  });

  it('honors environment variable overrides', async () => {
    process.env.NEXT_PUBLIC_LATEST_ANDROID_VERSION_NAME = '2.0.0';
    process.env.NEXT_PUBLIC_LATEST_ANDROID_VERSION_CODE = '42';
    process.env.NEXT_PUBLIC_APK_URL =
      'https://downloads.fintec.app/fintec-v2.apk';

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.latestVersionName).toBe('2.0.0');
    expect(data.latestVersionCode).toBe(42);
    expect(data.apkUrl).toBe('https://downloads.fintec.app/fintec-v2.apk');
    expect(data.minRequiredVersionCode).toBe(1);
    expect(typeof data.releaseNotes).toBe('string');
  });

  it('falls back to default versionCode if env var is non-numeric', async () => {
    process.env.NEXT_PUBLIC_LATEST_ANDROID_VERSION_CODE = 'invalid_number';

    const res = await GET();
    const data = await res.json();
    expect(data.latestVersionCode).toBe(3);
  });
});
