import { NextResponse } from 'next/server';

export interface AppVersionResponse {
  latestVersionName: string;
  latestVersionCode: number;
  minRequiredVersionCode: number;
  apkUrl: string;
  releaseNotes: string;
  publishedAt: string;
}

export async function GET() {
  const parsedCode = parseInt(
    process.env.NEXT_PUBLIC_LATEST_ANDROID_VERSION_CODE || '3',
    10
  );
  const latestVersionCode = Number.isNaN(parsedCode) ? 3 : parsedCode;

  const versionData: AppVersionResponse = {
    latestVersionName:
      process.env.NEXT_PUBLIC_LATEST_ANDROID_VERSION_NAME || '1.0.2',
    latestVersionCode,
    minRequiredVersionCode: 1,
    apkUrl: process.env.NEXT_PUBLIC_APK_URL || '/fintec-beta.apk',
    releaseNotes:
      'Novedades: Flujo Scan-to-Confirm en 1 tap, cámara directa, pegado de portapapeles, visor con zoom y mejoras de rendimiento.',
    publishedAt: '2026-09-12T00:00:00Z',
  };

  return NextResponse.json(versionData, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
