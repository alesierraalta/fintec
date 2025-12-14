'use client';

import { useRealtimeRates } from '@/hooks/use-realtime-rates';
import { useRateTrends } from '@/hooks/use-rate-trends';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { TrendIndicator } from '@/components/currency/trend-indicator';

export default function ExchangeRateDisplay() {
  const { rates, isConnected, error, requestLatestRates } = useRealtimeRates();
  const { trends, isLoading: isLoadingTrends } = useRateTrends();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-VE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Tasas de Cambio</CardTitle>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Badge variant="default" className="bg-green-500">
                <Wifi className="h-4 w-4 mr-1" />
                Conectado
              </Badge>
            ) : (
              <Badge variant="danger">
                <WifiOff className="h-4 w-4 mr-1" />
                Desconectado
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={requestLatestRates}
              disabled={!isConnected}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          {rates ? (
            <>
              {/* Main Rates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="space-y-2 p-4 bg-secondary/20 rounded-lg">
                  <h3 className="font-semibold text-lg text-foreground">USD/VES</h3>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatPrice(rates.usd_ves)}
                  </div>
                </div>
                
                <div className="space-y-2 p-4 bg-secondary/20 rounded-lg">
                  <h3 className="font-semibold text-lg text-foreground">USDT/VES</h3>
                  <div className="text-2xl font-bold text-green-600">
                    {formatPrice(rates.usdt_ves)}
                  </div>
                </div>

                <div className="space-y-2 p-4 bg-secondary/20 rounded-lg">
                  <h3 className="font-semibold text-lg text-foreground">BUSD/VES</h3>
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatPrice(rates.busd_ves)}
                  </div>
                </div>
              </div>

              {/* Trends Section */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Tendencias (USD/VES)</h4>
                <div className="grid grid-cols-3 gap-2">
                  <TrendIndicator trend={trends?.usdVes?.['1d']} label="24h" />
                  <TrendIndicator trend={trends?.usdVes?.['1w']} label="7d" />
                  <TrendIndicator trend={trends?.usdVes?.['1m']} label="30d" />
                </div>
              </div>
              
              {/* P2P Details */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-1">
                  <h3 className="font-medium text-sm text-muted-foreground">Venta (Lo que recibes)</h3>
                  <div className="text-xl font-semibold text-red-600">
                    {formatPrice(rates.sell_rate)}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h3 className="font-medium text-sm text-muted-foreground">Compra (Lo que pagas)</h3>
                  <div className="text-xl font-semibold text-green-600">
                    {formatPrice(rates.buy_rate)}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-2">
                <p className="text-xs text-muted-foreground text-right">
                  Fuente: {rates.source} · Actualizado: {formatDate(rates.lastUpdated)}
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground animate-pulse">
                {isConnected ? 'Obteniendo tasas de cambio...' : 'Conectando al servidor...'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}