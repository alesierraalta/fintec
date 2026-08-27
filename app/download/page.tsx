import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { FinTecLogo } from '@/components/branding/fintec-logo';
import { DownloadCta } from './download-cta';

export const metadata: Metadata = {
  title: 'Descargar FinTec para Android (Beta)',
  description:
    'Descarga la versión beta de FinTec para Android. Gestiona tus finanzas con tasas BCV y Binance actualizadas.',
};

// The APK ships with the deployment from `public/fintec-beta.apk`.
// Set NEXT_PUBLIC_APK_URL to serve a release build from external hosting
// (e.g. GitHub Releases) without redeploying the web app.
const APK_URL = process.env.NEXT_PUBLIC_APK_URL || '/fintec-beta.apk';

const installSteps = [
  {
    title: 'Descarga el APK',
    description: 'Pulsa el botón de descarga desde tu teléfono Android.',
  },
  {
    title: 'Permite la instalación',
    description:
      'Android pedirá autorizar instalaciones de "fuentes desconocidas" para tu navegador. Es normal en apps fuera de Play Store.',
  },
  {
    title: 'Instala y abre FinTec',
    description: 'Acepta los permisos, crea tu cuenta y empieza a usar la app.',
  },
];

export default function DownloadPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Background gradients */}
      <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute bottom-0 right-0 -z-10 h-[600px] w-[800px] rounded-full bg-blue-500/10 blur-[100px]" />

      {/* Nav */}
      <nav className="z-10 mx-auto flex w-full max-w-7xl items-center justify-between p-6">
        <Link href="/" aria-label="FinTec - Inicio">
          <FinTecLogo
            containerClassName="h-10 w-32 sm:h-12 sm:w-40"
            priority
            sizes="(max-width: 768px) 128px, 160px"
            fallbackClassName="text-xl"
            alt="FinTec"
          />
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-border px-5 py-2 font-medium text-foreground transition-all duration-200 hover:bg-muted/50"
        >
          Volver al inicio
        </Link>
      </nav>

      <main className="z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-4 pb-16 pt-8 text-center sm:pt-12">
        {/* Beta badge */}
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-1.5 text-sm font-semibold text-yellow-500">
          <AlertTriangle className="h-4 w-4" />
          Versión Beta · Solo Android
        </span>

        <div className="flex justify-center">
          <FinTecLogo
            containerClassName="h-14 w-14 rounded-2xl shadow-lg sm:h-16 sm:w-16"
            className="rounded-2xl"
            alt="FinTec"
            priority
            sizes="64px"
          />
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Descarga FinTec{' '}
          <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
            para Android
          </span>
        </h1>

        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Lleva el control de tus finanzas en tu bolsillo: cuentas,
          transacciones, presupuestos y tasas del BCV y Binance P2P siempre
          actualizadas.
        </p>

        {/* Download CTA */}
        <DownloadCta apkUrl={APK_URL} />

        {/* Beta notice */}
        <div className="glass-card mt-10 w-full rounded-3xl p-6 text-left shadow-ios-md">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Qué significa que sea beta
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-0.5 text-yellow-500">•</span>
              Es una versión en pruebas: puedes encontrar errores o funciones a
              medio terminar. Tus reportes nos ayudan a mejorarla.
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-yellow-500">•</span>
              Las actualizaciones no son automáticas: cuando publiquemos una
              nueva versión, vuelve a esta página y descarga el APK de nuevo.
            </li>
          </ul>
        </div>

        {/* Android-only notice */}
        <div className="glass-card mt-4 w-full rounded-3xl p-6 text-left shadow-ios-md">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Smartphone className="h-5 w-5 text-blue-500" />
            Requisitos
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-0.5 text-blue-500">•</span>
              <span>
                <strong className="text-foreground">Solo Android:</strong>{' '}
                requiere Android 8.0 o superior. La versión iOS todavía está en
                desarrollo.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-blue-500">•</span>
              Al ser un APK fuera de Play Store, Android mostrará un aviso de
              seguridad antes de instalar. Es esperado: la app usa conexión
              cifrada y nunca comparte tus datos financieros.
            </li>
          </ul>
        </div>

        {/* Install steps */}
        <div className="glass-card mt-4 w-full rounded-3xl p-6 text-left shadow-ios-md">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            Instalación en 3 pasos
          </h2>
          <ol className="mt-4 space-y-4">
            {installSteps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-foreground">{step.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* iOS → waitlist */}
        <Link
          href="/waitlist"
          className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ¿Usas iPhone? Únete a la waitlist y te avisaremos cuando salga la
          versión iOS
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </main>
    </div>
  );
}
