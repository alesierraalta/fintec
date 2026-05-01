import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
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
      <head></head>
      <body className={`${inter.className} overflow-x-hidden`}>
        <RouteAwareProviders>
          <div id="root" className="h-dynamic-screen w-full overflow-x-hidden">
            {children}
          </div>
        </RouteAwareProviders>
        <Toaster position="top-right" richColors />
        <div id="modal-root" />
      </body>
    </html>
  );
}
