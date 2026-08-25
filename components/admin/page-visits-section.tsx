'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Eye, Users } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StatCard } from '@/components/dashboard/stat-card';
import { DashboardLoading } from '@/components/ui/suspense-loading';
import { Button } from '@/components/ui/button';
import type { PageVisitsDTO, VisitsRange } from '@/lib/page-visits/types';

const ranges: VisitsRange[] = ['7d', '30d', '90d'];
export function PageVisitsSection() {
  const [range, setRange] = useState<VisitsRange>('30d');
  const [data, setData] = useState<PageVisitsDTO | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setError(false);
    try {
      const response = await fetch(`/api/admin/visits?range=${range}`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('request failed');
      const body = await response.json();
      if (!body.data) throw new Error('invalid response');
      setData(body.data);
    } catch {
      setData(null);
      setError(true);
    }
  }, [range]);
  useEffect(() => {
    void load();
  }, [load]);
  if (error)
    return (
      <section className="glass-card rounded-3xl p-6">
        <h2 className="text-xl font-semibold">Visitas</h2>
        <p className="mt-3">Las visitas no están disponibles.</p>
        <Button className="mt-4" onClick={() => void load()}>
          Reintentar
        </Button>
      </section>
    );
  if (!data) return <DashboardLoading />;
  return (
    <section className="glass-card space-y-5 rounded-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Visitas</h2>
          <p className="text-sm text-muted-foreground">
            Navegaciones diarias y visitantes únicos
          </p>
        </div>
        <label className="text-sm">
          Rango{' '}
          <select
            aria-label="Rango de visitas"
            value={range}
            onChange={(e) => setRange(e.target.value as VisitsRange)}
            className="ml-2 rounded-xl border bg-card p-2"
          >
            {ranges.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Visitas totales"
          value={String(data.totalPageViews)}
          change="Total"
          changeType="neutral"
          icon={Eye}
        />
        <StatCard
          title="Visitantes únicos"
          value={String(data.totalUniqueVisitors)}
          change="Días"
          changeType="neutral"
          icon={Users}
        />
        <StatCard
          title="Pico de visitas"
          value={String(data.peaks.pageViews?.value ?? 0)}
          change={data.peaks.pageViews?.date ?? 'Sin datos'}
          changeType="neutral"
          icon={Activity}
        />
      </div>
      {data.totalPageViews === 0 ? (
        <p className="rounded-2xl border border-border/30 p-4 text-sm text-muted-foreground">
          No hay visitas en este rango.
        </p>
      ) : (
        <div className="h-72" aria-label="Gráfico de visitas">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="pageViews"
                name="Visitas"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.2}
              />
              <Area
                type="monotone"
                dataKey="uniqueVisitors"
                name="Visitantes únicos"
                stroke="#14b8a6"
                fill="#14b8a6"
                fillOpacity={0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div>
        <h3 className="font-semibold">Rutas principales</h3>
        <div className="mt-2 space-y-2">
          {data.topRoutes.map((route) => (
            <div
              className="flex justify-between rounded-xl bg-muted/30 p-3 text-sm"
              key={route.path}
            >
              <code>{route.path}</code>
              <span>{route.pageViews}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
