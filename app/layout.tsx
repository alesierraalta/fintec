import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { RegisterServiceWorker, InstallPrompt } from '@/components/pwa';
import { PWA_INSTALL_CAPTURE_SCRIPT } from '@/lib/pwa/install-event-store';
import { RouteAwareProviders } from './route-aware-providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://fintec.vercel.app'
  ),
  title: 'FinTec - Tu Plataforma de Finanzas Personales',
  description:
    'Gestiona tus finanzas de forma inteligente y moderna. Control de gastos, presupuestos, inversiones, metas de ahorro y más.',
  keywords:
    'finanzas personales, presupuesto, gastos, ingresos, ahorro, fintec, fintech, inversiones',
  authors: [{ name: 'FinTec App' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  other: {
    'theme-color': '#000000',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FinTec',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Prevent pinch-zoom distortion
  userScalable: false, // Lock zoom on mobile
  viewportFit: 'cover', // For iOS safe areas
  interactiveWidget: 'resizes-visual', // Ajusta viewport cuando aparece el teclado
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/*
          Raw inline script, not `next/script strategy="beforeInteractive"`:
          that strategy does not emit an executable inline script, it
          pushes the source onto the `self.__next_s` queue, which Next's
          runtime only drains once its own chunks have loaded. A raw inline
          tag registers the listener at HTML parse time, ahead of every
          other script on the page, which is the whole point of the
          capture. See lib/pwa/install-event-store.ts for why this capture
          exists and what it stashes.
        */}
        <script
          id="pwa-install-capture"
          dangerouslySetInnerHTML={{ __html: PWA_INSTALL_CAPTURE_SCRIPT }}
        />
      </head>
      <body className={`${inter.className} overflow-x-hidden`}>
        <RouteAwareProviders>
          <div id="root" className="h-dynamic-screen w-full overflow-x-hidden">
            {children}
          </div>
        </RouteAwareProviders>
        <Toaster position="top-right" richColors />
        <div id="modal-root" />
        <RegisterServiceWorker />
        <InstallPrompt />
      </body>
    </html>
  );
}
