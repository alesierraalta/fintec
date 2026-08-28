import { LockKeyhole, History, Layers3, ListChecks } from 'lucide-react';
import { TIER_LIMITS } from '@/types/subscription';

const evidence = [
  { icon: Layers3, title: 'Cuentas ilimitadas', detail: 'Incluidas en el plan Gratis.' },
  { icon: ListChecks, title: `${TIER_LIMITS.free.transactions} transacciones/mes`, detail: 'Límite claro para empezar sin sorpresas.' },
  { icon: History, title: `${TIER_LIMITS.free.dataHistory} meses de historial`, detail: 'Consulta tu contexto financiero reciente.' },
  { icon: LockKeyhole, title: 'TLS + RLS', detail: 'Cifrado en tránsito y reglas de acceso por cuenta.' },
];

export function EvidenceStrip() {
  return <section className="relative px-4 py-16 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="mb-8 max-w-2xl"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Hechos del producto</p><h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Empieza con claridad</h2><p className="mt-3 text-muted-foreground">Información verificable para saber qué incluye FinTec hoy, mientras seguimos en beta.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{evidence.map(({ icon: Icon, title, detail }) => <article key={title} className="rounded-2xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm"><div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div><h3 className="font-semibold text-foreground">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail}</p></article>)}</div></div></section>;
}
