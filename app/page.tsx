import type { Metadata } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import { LazyDashboardContent } from '@/components/dashboard/lazy-dashboard-content';
import { LocalProvidersForRootDashboard } from '@/app/_lib/local-providers-for-root-dashboard';
import { getRootAuthState } from '@/app/_lib/root-auth-state';
import { LandingPage } from '@/app/(public)/components/landing-page';

export async function generateMetadata(): Promise<Metadata> {
  const authState = await getRootAuthState();

  if (authState === 'authenticated') {
    return {
      title: 'Dashboard | FinTec',
      robots: 'noindex, nofollow',
    };
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'FinTec',
        url: process.env.NEXT_PUBLIC_APP_URL || 'https://fintec.com',
        sameAs: [
          'https://x.com/fintec',
          'https://github.com/fintec',
          'https://linkedin.com/company/fintec',
        ],
      },
      {
        '@type': 'SoftwareApplication',
        name: 'FinTec',
        description:
          'Aplicación de finanzas personales para Venezuela con tasas del BCV y Binance en tiempo real.',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web, iOS, Android',
        url: process.env.NEXT_PUBLIC_APP_URL || 'https://fintec.com',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    ],
  };

  return {
    title: 'FinTec - Finanzas Personales con Tasas Actualizadas',
    description:
      'Controla tus finanzas con tasas del BCV y Binance en tiempo real. Gestiona cuentas, transacciones y presupuestos en un solo lugar.',
    alternates: { canonical: '/' },
    openGraph: {
      title: 'FinTec - Controla tus Finanzas con Tasas Actualizadas',
      description:
        'La app financiera para Venezuela con tasas en vivo, seguridad avanzada y gestión completa en una sola plataforma.',
      url: '/',
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
    other: {
      'script:ld+json': JSON.stringify(jsonLd),
    },
  };
}

export default async function HomePage() {
  const authState = await getRootAuthState();

  if (authState === 'authenticated') {
    return (
      <LocalProvidersForRootDashboard>
        <MainLayout>
          <LazyDashboardContent />
        </MainLayout>
      </LocalProvidersForRootDashboard>
    );
  }

  return <LandingPage />;
}
