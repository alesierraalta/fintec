'use client';

import { Download } from 'lucide-react';
import { useIsNative } from '@/hooks/use-is-native';

interface DownloadCtaProps {
  apkUrl: string;
}

export function DownloadCta({ apkUrl }: DownloadCtaProps) {
  const isNative = useIsNative();

  if (isNative) {
    return (
      <p className="mt-8 rounded-2xl border border-primary/20 bg-primary/10 px-6 py-4 text-lg font-semibold text-primary">
        Ya estás usando la app nativa
      </p>
    );
  }

  return (
    <>
      <a
        href={apkUrl}
        download
        className="group mt-8 inline-flex items-center gap-3 rounded-2xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition-all duration-200 hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98]"
      >
        <Download className="h-6 w-6 transition-transform group-hover:translate-y-0.5" />
        Descargar APK
      </a>
      <p className="mt-3 text-xs text-muted-foreground">
        APK directo (~4 MB) · No requiere Play Store
      </p>
    </>
  );
}
