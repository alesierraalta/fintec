'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AdminStats } from '@/lib/admin-stats/types';

const labels: Record<string, string> = {
  transactions_created: 'Transacciones',
  budgets_created: 'Presupuestos',
  goals_created: 'Metas',
  feedbacks_submitted: 'Comentarios',
  ai_sessions: 'Sesiones IA',
  ai_messages: 'Mensajes IA',
};
export function AdminFeatureUsage({
  featureUsage,
}: {
  featureUsage: AdminStats['featureUsage'];
}) {
  const available = featureUsage.items.filter(
    (item) => item.status === 'available' && item.count !== undefined
  );
  return (
    <section
      className="glass-card rounded-3xl p-6"
      aria-labelledby="feature-usage-heading"
    >
      <h2 id="feature-usage-heading" className="text-lg font-semibold">
        Uso por funcionalidad
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Actividad agregada de registros existentes; no representa telemetría
        completa de eventos.
      </p>
      {available.length > 0 ? (
        <div
          className="mt-4 h-64"
          role="img"
          aria-label="Uso agregado por funcionalidad"
        >
          {typeof ResizeObserver !== 'undefined' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={available.map((item) => ({
                  name: labels[item.key] ?? item.key,
                  count: item.count,
                }))}
                layout="vertical"
                margin={{ left: 24, right: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ul>
              {available.map((item) => (
                <li key={item.key}>
                  {labels[item.key] ?? item.key}: {item.count}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-muted/30 p-4 text-sm">
          No hay actividad disponible para esta ventana.
        </p>
      )}
      <div
        className="mt-4 space-y-2"
        aria-label="Detalle de uso por funcionalidad"
      >
        {featureUsage.items.map((item) => (
          <div
            key={item.key}
            className="flex justify-between rounded-xl bg-muted/30 p-3 text-sm"
          >
            <span>{labels[item.key] ?? item.key}</span>
            <span>
              {item.status === 'unavailable'
                ? 'No disponible'
                : item.status === 'partial'
                  ? 'Parcial'
                  : item.status === 'empty'
                    ? 'Sin registros'
                    : item.count}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Fuente: registros existentes y contadores mensuales almacenados.
      </p>
    </section>
  );
}
