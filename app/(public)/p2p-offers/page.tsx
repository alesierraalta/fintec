import { Metadata } from 'next';
import P2POffersFilter from '@/components/p2p-offers-filter';
import { PageHeader } from '@/components/ui/page-header';

export const metadata: Metadata = {
  title: 'Ofertas P2P | FinTec',
  description: 'Filtra y encuentra las mejores ofertas P2P de Binance.',
};

export default function P2POffersPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Ofertas P2P Binance"
        subtitle="Encuentra fácilmente ofertas de USDT con tus métodos de pago preferidos."
      />
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="mx-auto max-w-4xl">
          <P2POffersFilter />
        </div>
      </div>
    </div>
  );
}
