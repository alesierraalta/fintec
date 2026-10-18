import { BarChart3, Shield, Smartphone, Zap } from 'lucide-react';
import { features } from './data';
import { Reveal } from './reveal';

const iconMap: Record<string, React.ElementType> = {
  BarChart3,
  Shield,
  Smartphone,
  Zap,
};

/**
 * Features section — modern polish 2025-08-25
 * Reduced visual noise, glass cards, consistent hover, accessible contrast
 */
export function FeaturesSection() {
  return (
    <section
      id="caracteristicas"
      className="relative px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
    >
      {/* subtle top divider */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      <Reveal className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <div className="mb-3 inline-flex items-center rounded-full border border-border/40 bg-muted/40 px-3 py-1 text-xs font-semibold tracking-widest text-muted-foreground">
            FUNCIONALIDADES
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Todo lo que necesitas para tus finanzas
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Herramientas profesionales diseñadas para el mercado venezolano —
            sin complejidad innecesaria
          </p>
        </div>

        {/* Editorial two-column list instead of a repeated card grid */}
        <div className="grid grid-cols-1 gap-x-12 gap-y-10 sm:grid-cols-2">
          {features.map((feature) => {
            const IconComponent = iconMap[feature.icon];
            if (!IconComponent) return null;

            return (
              <div key={feature.title} className="flex items-start gap-5">
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border ${feature.bgColor} ${feature.borderColor}`}
                >
                  <IconComponent className={`h-6 w-6 ${feature.color}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
