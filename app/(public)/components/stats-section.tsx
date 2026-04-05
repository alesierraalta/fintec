import { Clock, Globe, Shield, Zap } from 'lucide-react';

/**
 * Stats section with verifiable trust indicators only.
 * NO fabricated statistics — only features that can be verified.
 */
export function StatsSection() {
  const trustIndicators = [
    {
      label: 'Tasas del BCV',
      value: 'Oficiales',
      icon: Globe,
      description: 'Fuente oficial del Banco Central',
    },
    {
      label: 'Binance P2P',
      value: 'En vivo',
      icon: Zap,
      description: 'Mercado P2P actualizado',
    },
    {
      label: 'Disponibilidad',
      value: '24/7',
      icon: Clock,
      description: 'Acceso continuo a tus datos',
    },
    {
      label: 'Seguridad',
      value: 'E2E',
      icon: Shield,
      description: 'Encriptación de extremo a extremo',
    },
  ];

  return (
    <section className="bg-muted/20 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="sr-only">Indicadores de confianza de FinTec</h2>
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {trustIndicators.map((indicator) => {
            const IconComponent = indicator.icon;
            return (
              <div key={indicator.label} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <IconComponent className="h-8 w-8 text-primary" />
                </div>
                <div className="mb-1 text-2xl font-bold text-foreground sm:text-3xl">
                  {indicator.value}
                </div>
                <div className="font-medium text-muted-foreground">
                  {indicator.label}
                </div>
                <div className="mt-1 text-xs text-muted-foreground/70">
                  {indicator.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
