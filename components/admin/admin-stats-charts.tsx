'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AdminStats } from '@/lib/admin-stats/types';

export function AdminStatsCharts({ data }: { data: AdminStats }) {
  return (
    <div className="glass-card rounded-3xl p-6">
      <h2 className="text-lg font-semibold">Registros nuevos por día (UTC)</h2>
      <div className="mt-4 h-64" role="img" aria-label="Registros nuevos por día">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.users.newByDay}>
            <XAxis dataKey="date" hide />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Pico: {data.users.peakDailyActive} usuarios el {data.users.peakDate ?? 'sin actividad registrada'}.</p>
    </div>
  );
}
