import { BarChart3, Shield, Smartphone, Zap } from 'lucide-react';
import { features } from './data';

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
      className="relative px-4 py-24 sm:px-6 lg:px-8"
    >
      {/* subtle top divider */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      <div className="mx-auto max-w-7xl">
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {features.map((feature) => {
            const IconComponent = iconMap[feature.icon];
            if (!IconComponent) return null;

            return (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 p-8 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-border/60 hover:shadow-xl hover:shadow-black/5"
              >
                {/* subtle gradient accent on hover */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div
                  className={`relative mb-6 flex h-12 w-12 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105 ${feature.bgColor} ${feature.borderColor}`}
                >
                  <IconComponent className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="relative mb-3 text-lg font-semibold tracking-tight text-foreground">
                  {feature.title}
                </h3>
                <p className="relative text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
