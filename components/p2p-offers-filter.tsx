'use client';

import React, { useState } from 'react';
import {
  BINANCE_P2P_SIDES,
  BinanceP2PSide,
  BINANCE_P2P_PAYMENT_IDENTIFIERS,
  BinanceP2PPaymentIdentifier,
  BINANCE_P2P_PAYMENT_LABELS,
  BinanceP2POffersQuery,
} from '@/types/binance-p2p-offers';
import { useBinanceP2POffers } from '@/hooks/use-binance-p2p-offers';
import { Card } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Search, Info, ExternalLink, ArrowRightLeft, DollarSign, Wallet } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface FilterState {
  tradeType: BinanceP2PSide;
  amount: number | null;
  payType: BinanceP2PPaymentIdentifier;
}

export default function P2POffersFilter() {
  const [filterState, setFilterState] = useState<FilterState>({
    tradeType: 'BUY',
    amount: null,
    payType: 'ALL',
  });

  const {
    status,
    result,
    error,
    retryAfterSeconds,
    loading,
    search,
  } = useBinanceP2POffers();

  const handleSearch = () => {
    const query: BinanceP2POffersQuery = {
      side: filterState.tradeType,
      amountMinor: filterState.amount ? Math.round(filterState.amount * 100) : 0,
      paymentMethod: filterState.payType,
    };
    search(query);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setFilterState((prev) => ({ ...prev, amount: null }));
    } else {
      setFilterState((prev) => ({ ...prev, amount: parseFloat(val) }));
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Criterios de Búsqueda</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Trade Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Operación</label>
            <div className="flex rounded-xl border border-border p-1">
              <button
                type="button"
                onClick={() => setFilterState((prev) => ({ ...prev, tradeType: 'BUY' }))}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  filterState.tradeType === 'BUY'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-foreground/5'
                }`}
              >
                Comprar USDT
              </button>
              <button
                type="button"
                onClick={() => setFilterState((prev) => ({ ...prev, tradeType: 'SELL' }))}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  filterState.tradeType === 'SELL'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-foreground/5'
                }`}
              >
                Vender USDT
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Cantidad (VES) Opcional</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <DollarSign className="h-4 w-4" />
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Ej. 1000"
                value={filterState.amount === null ? '' : filterState.amount}
                onChange={handleAmountChange}
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Método de Pago</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <Wallet className="h-4 w-4" />
              </div>
              <select
                value={filterState.payType}
                onChange={(e) =>
                  setFilterState((prev) => ({
                    ...prev,
                    payType: e.target.value as BinanceP2PPaymentIdentifier,
                  }))
                }
                className="w-full appearance-none rounded-xl border border-border bg-background py-2.5 pl-10 pr-8 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {BINANCE_P2P_PAYMENT_IDENTIFIERS.map((id) => (
                  <option key={id} value={id}>
                    {BINANCE_P2P_PAYMENT_LABELS[id]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Buscando...
              </span>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Buscar Ofertas
              </>
            )}
          </button>
        </div>
      </Card>

      {/* Results Section */}
      <div className="mt-8 space-y-4">
        {loading && status === 'loading' && (
          <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-card">
            <Loading size="lg" text="Obteniendo ofertas de Binance..." />
          </div>
        )}

        {error && (
          <Card className="border-red-500/20 bg-red-500/10 p-6 text-center text-red-500">
            <Info className="mx-auto mb-2 h-8 w-8" />
            <p className="font-medium">{error}</p>
            {retryAfterSeconds && (
              <p className="mt-1 text-sm text-red-500/80">
                Por favor, espera {retryAfterSeconds} segundos.
              </p>
            )}
          </Card>
        )}

        {!loading && status === 'idle' && (
          <Card className="border-dashed p-6 text-center">
            <Info className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <h3 className="font-medium text-foreground">
              Configura tus filtros para buscar ofertas P2P
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecciona la operación, el monto y el método de pago, luego pulsa
              “Buscar Ofertas”.
            </p>
          </Card>
        )}

        {!loading && status === 'empty' && (
          <EmptyState
            icon={<Search />}
            title="No se encontraron ofertas"
            description="Intenta cambiar los filtros de búsqueda o el monto ingresado."
          />
        )}

        {!loading && (status === 'live' || status === 'stale') && result && result.offers.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {result.offers.map((offer) => (
              <Card key={offer.id} className="flex flex-col p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {offer.merchant.nickname}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {offer.merchant.monthOrderCount} órdenes |{' '}
                      {offer.merchant.monthCompletionRateBps
                        ? (offer.merchant.monthCompletionRateBps / 100).toFixed(1)
                        : 0}
                      % comp.
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-muted-foreground">Métodos:</span>
                    {offer.paymentMethods.map((pm) => (
                      <span
                        key={pm.identifier}
                        className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                      >
                        {pm.name}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Límites: {(offer.minFiatMinor / 100).toLocaleString('es-VE')} - {(offer.maxFiatMinor / 100).toLocaleString('es-VE')} VES
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Disponible: {offer.availableQuantity.value} USDT
                  </div>
                </div>
                
                <div className="mt-4 flex flex-col items-end gap-3 sm:mt-0">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-foreground">
                      {(offer.priceMinor / 100).toLocaleString('es-VE', { minimumFractionDigits: 2 })} VES
                    </div>
                    <div className="text-xs text-muted-foreground">Precio por USDT</div>
                  </div>
                  
                  <a
                    href={`https://p2p.binance.com/en/trade/all-payments/USDT?fiat=VES`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors ${
                      filterState.tradeType === 'BUY'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {filterState.tradeType === 'BUY' ? 'Comprar USDT' : 'Vender USDT'}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
