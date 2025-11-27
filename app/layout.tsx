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
  interactiveWidget: 'resizes-visual', // Ajusta viewport cuando aparece el teclado
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Paddle vendor ID - should be set in environment variables
  const paddleVendorId = process.env.NEXT_PUBLIC_PADDLE_VENDOR_ID || '';
  const paddleEnvironment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox';

  return (
    <html lang="es" suppressHydrationWarning className="dark">
      <head>
        {/* Paddle.js - Load for checkout functionality */}
        {paddleVendorId && (
          <script
            src={`https://cdn.paddle.com/paddle/v2/paddle${
              paddleEnvironment === 'production' ? '' : '.sandbox'
            }.js`}
            data-paddle-vendor-id={paddleVendorId}
            async
          />
        )}
      </head>
      <body className={`${inter.className} dark`}>
        <AuthProvider>
          <RepositoryProvider>
            <div id="root" className="h-dynamic-screen w-full overflow-hidden">
              {children}
            </div>
          </RepositoryProvider>
        </AuthProvider>
        <div id="modal-root" />
      </body>
    </html>
  );
}
