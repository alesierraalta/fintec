import { Metadata } from 'next';
import { ExternalLink, Terminal } from 'lucide-react';
import { BinanceMarketLink } from '@/components/p2p-offers/binance-market-link';
import P2POffersFilter from '@/components/p2p-offers-filter';
import { PageHeader } from '@/components/ui/page-header';
import { MainLayout } from '@/components/layout/main-layout';
import { BINANCE_P2P_MARKET_URL } from '@/types/binance-p2p-offers';
import { requireAuthenticatedUser } from '@/app/_lib/require-authenticated-user';

export const metadata: Metadata = {
  title: 'Terminal P2P | FinTec',
  description:
    'Compara ofertas públicas P2P de USDT/VES y continúa la operación en Binance.',
};

export default async function P2POffersPage() {
  await requireAuthenticatedUser();

  return (
    <MainLayout>
      <div className="flex h-full flex-col">
        <PageHeader
          icon={<Terminal className="h-6 w-6" aria-hidden="true" />}
          title="Terminal P2P"
          subtitle="Compara precio, disponibilidad y métodos de pago de ofertas públicas de USDT/VES, y continúa la operación en Binance."
          metadata={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Mercado Binance P2P · USDT/VES
            </span>
          }
          actions={
            <BinanceMarketLink
              href={BINANCE_P2P_MARKET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-border/60 bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/40 focus-ring"
            >
              Ir a Binance
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </BinanceMarketLink>
          }
        />
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-4xl">
            <P2POffersFilter />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
