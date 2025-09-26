'use client';

import { useRealtimeRates } from '@/hooks/use-realtime-rates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';

export default function ExchangeRateDisplay() {
  const { rates, isConnected, error, requestLatestRates } = useRealtimeRates();

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
          <CardTitle className="text-2xl font-bold">Exchange Rates</CardTitle>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Badge variant="default" className="bg-green-500">
                <Wifi className="h-4 w-4 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="destructive">
                <WifiOff className="h-4 w-4 mr-1" />
                Disconnected
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={requestLatestRates}
              disabled={!isConnected}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">USD/VES</h3>
                <div className="text-2xl font-bold text-blue-600">
                  {formatPrice(rates.usd_ves)}
                </div>
                <p className="text-sm text-gray-500">
                  Source: {rates.source}
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">USDT/VES</h3>
                <div className="text-2xl font-bold text-green-600">
                  {formatPrice(rates.usdt_ves)}
                </div>
                <p className="text-sm text-gray-500">
                  Source: {rates.source}
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Precio de Venta</h3>
                <div className="text-xl font-semibold text-red-600">
                  {formatPrice(rates.sell_rate)}
                </div>
                <p className="text-xs text-gray-500">Precio al que puedes vender USDT</p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Precio de Compra</h3>
                <div className="text-xl font-semibold text-green-600">
                  {formatPrice(rates.buy_rate)}
                </div>
                <p className="text-xs text-gray-500">Precio al que puedes comprar USDT</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">
                Last updated: {formatDate(rates.lastUpdated)}
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {isConnected ? 'Waiting for exchange rate data...' : 'Connecting to server...'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
