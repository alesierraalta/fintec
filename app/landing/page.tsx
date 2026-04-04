import type { Metadata } from 'next';
import LandingPageClient from './landing-page-client';

export const metadata: Metadata = {
  title: 'FinTec Landing - Finanzas Personales con Tasas Actualizadas',
  description:
    'Controla tus finanzas con tasas del BCV y Binance en tiempo real. Gestiona cuentas, transacciones y presupuestos en un solo lugar.',
  alternates: {
    canonical: '/', // Primary entry is now at root `/`
  },
  openGraph: {
    title: 'FinTec - Controla tus Finanzas con Tasas Actualizadas',
    description:
      'La app financiera para Venezuela con tasas en vivo, seguridad avanzada y gestión completa en una sola plataforma.',
    url: '/landing',
    siteName: 'FinTec',
    locale: 'es_VE',
    type: 'website',
    images: [
      {
        url: '/finteclogodark.jpg',
        alt: 'FinTec - Controla tus Finanzas con Tasas Actualizadas',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FinTec - Controla tus Finanzas con Tasas Actualizadas',
    description:
      'Accede a tasas oficiales y P2P en tiempo real mientras gestionas tus finanzas desde una sola app.',
    images: ['/finteclogodark.jpg'],
  },
};

export default function LandingPage() {
  return <LandingPageClient />;
}
