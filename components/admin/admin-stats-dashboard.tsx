'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Database, Target, TrendingUp, Users } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { DashboardLoading } from '@/components/ui/suspense-loading';
import { Button } from '@/components/ui/button';
import type { AdminStats, StatsWindow } from '@/lib/admin-stats/types';
import { AdminStatsCharts } from './admin-stats-charts';
import { AdminFeatureUsage } from './admin-feature-usage';

const windows: StatsWindow[] = ['7d', '30d', '90d'];
export function AdminStatsDashboard() {
  const [window, setWindow] = useState<StatsWindow>('30d');
  const [data, setData] = useState<AdminStats | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setError(false);
    try {
      const response = await fetch(`/api/admin/stats?window=${window}`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('stats request failed');
      const body = await response.json();
      if (!body.data) throw new Error('stats response missing');
      setData(body.data);
    } catch {
      setData(null);
      setError(true);
    }
  }, [window]);
  useEffect(() => {
    void load();
  }, [load]);
  if (error)
    return (
      <section className="glass-card rounded-3xl p-8">
        <p>Las métricas no están disponibles.</p>
        <Button className="mt-4" onClick={() => void load()}>
          Reintentar
        </Button>
      </section>
    );
  if (!data) return <DashboardLoading />;
  const isUnavailable = (
    value: unknown
  ): value is { status: 'unavailable'; reason: 'query_failed' } =>
    typeof value === 'object' &&
    value !== null &&
    (value as { status?: string }).status === 'unavailable';
  const display = (value: unknown) =>
    isUnavailable(value) ? 'No disponible' : String(value);
  const card = (title: string, value: number, icon: typeof Users) => (
    <StatCard
      title={title}
      value={String(value)}
      change="Actual"
      changeType="neutral"
      icon={icon}
    />
  );
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analítica administrativa</h1>
          <p className="text-muted-foreground">
            Actividad basada en actualización de sesión, no tráfico exacto.
          </p>
        </div>
        <label className="text-sm">
          Ventana{' '}
          <select
            value={window}
            onChange={(event) => setWindow(event.target.value as StatsWindow)}
            className="ml-2 rounded-xl border bg-card p-2"
          >
            {windows.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {card('Usuarios registrados', data.users.total, Users)}
        {card('Activos hoy', data.users.dau, Activity)}
        {card('Activos 7 días', data.users.wau, TrendingUp)}
        {card('Activos 30 días', data.users.mau, Target)}
      </div>
      {data.users.activityStatus === 'empty' && (
        <p className="rounded-2xl border border-border/30 p-4 text-sm text-muted-foreground">
          Sin actividad de actualización de sesión en la ventana seleccionada.
        </p>
      )}
      <AdminStatsCharts data={data} />
      <AdminFeatureUsage featureUsage={data.featureUsage} />
      <section className="glass-card rounded-3xl p-6">
        <h2 className="text-lg font-semibold">Recursos totales</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Object.entries(data.resources.totals).map(([name, value]) => (
            <div className="rounded-2xl bg-muted/30 p-4" key={name}>
              <Database className="mb-2 h-5 w-5" />
              <span className="block text-sm text-muted-foreground">
                {name}
              </span>
              <strong className="text-xl">{display(value)}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="glass-card rounded-3xl p-6">
        <h2 className="text-lg font-semibold">Uso mensual</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {isUnavailable(data.usage.byMonth) ? (
            <p className="text-sm text-muted-foreground">
              Uso mensual no disponible.
            </p>
          ) : (
            data.usage.byMonth.map((month) => (
              <div
                key={month.monthYear}
                className="rounded-2xl bg-muted/30 p-4"
              >
                <strong>{month.monthYear}</strong>
                <p className="mt-2 text-sm text-muted-foreground">
                  Transacciones {month.transactionCount} · API {month.apiCalls}{' '}
                  · IA {month.aiRequests}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
      <section className="glass-card rounded-3xl p-6">
        <h2 className="text-lg font-semibold">Resumen por usuario</h2>
        <div className="mt-4 space-y-2">
          {data.resources.perUserCounts.map((user) => (
            <div
              className="flex flex-wrap gap-3 rounded-xl bg-muted/30 p-3 text-sm"
              key={String(user.userId)}
            >
              <code>{String(user.userId)}</code>
              <span>cuentas {display(user.accounts)}</span>
              <span>transacciones {display(user.transactions)}</span>
              <span>presupuestos {display(user.budgets)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
