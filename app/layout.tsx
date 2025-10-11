import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { RepositoryProvider } from '@/providers';
import { AuthProvider } from '@/contexts/auth-context';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FinTec - Tu Plataforma de Finanzas Personales',
  description: 'Gestiona tus finanzas de forma inteligente y moderna. Control de gastos, presupuestos, inversiones, metas de ahorro y más.',
  keywords: 'finanzas personales, presupuesto, gastos, ingresos, ahorro, fintec, fintech, inversiones',
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // For iOS safe areas
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning className="dark">
      <body className={`${inter.className} dark`}>
        <AuthProvider>
          <RepositoryProvider>
            <div id="root">
              {children}
            </div>
          </RepositoryProvider>
        </AuthProvider>
        <div id="modal-root" />
      </body>
    </html>
  );
}
