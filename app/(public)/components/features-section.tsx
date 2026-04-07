import { BarChart3, Shield, Smartphone, Zap } from 'lucide-react';
import { features } from './data';

const iconMap: Record<string, React.ElementType> = {
  BarChart3,
  Shield,
  Smartphone,
  Zap,
};

/**
 * Features section with CSS transitions (no framer-motion in server component).
 */
export function FeaturesSection() {
  return (
    <section id="caracteristicas" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            Todo lo que necesitas para tus finanzas
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            Herramientas profesionales diseñadas para el mercado venezolano
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {features.map((feature) => {
            const IconComponent = iconMap[feature.icon];
            if (!IconComponent) return null;

            return (
              <div
                key={feature.title}
                className={`${feature.bgColor} ${feature.borderColor} group rounded-3xl border p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
              >
                <div
                  className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 ${feature.bgColor}`}
                >
                  <IconComponent className={`h-8 w-8 ${feature.color}`} />
                </div>
                <h3 className="mb-4 text-xl font-bold text-foreground">
                  {feature.title}
                </h3>
                <p className="leading-relaxed text-muted-foreground">
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
