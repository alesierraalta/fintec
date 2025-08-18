import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { RepositoryProvider } from '@/providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Fintek - Tu Plataforma de Finanzas Personales',
  description: 'Gestiona tus finanzas de forma inteligente y moderna. Control de gastos, presupuestos, inversiones, metas de ahorro y más.',
  keywords: 'finanzas personales, presupuesto, gastos, ingresos, ahorro, fintek, fintech, inversiones',
  authors: [{ name: 'Fintek App' }],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover', // For iOS safe areas
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4ade80' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Fintek',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning className="dark">
      <body className={`${inter.className} dark`}>
        <RepositoryProvider>
          <div id="root">
            {children}
          </div>
        </RepositoryProvider>
        <div id="modal-root" />
      </body>
    </html>
  );
}
