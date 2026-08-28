import { ArrowDownLeft, ArrowRight, ArrowUpRight, Eye, Play, TrendingUp, WalletCards } from 'lucide-react';
import { TrackedLandingLink } from './tracked-landing-link';

const recentMovements = [
  { name: 'Ingreso recibido', detail: 'Cuenta principal', amount: '+ $120.00', icon: ArrowDownLeft, accent: 'bg-emerald-500/10 text-emerald-600' },
  { name: 'Compra registrada', detail: 'Alimentación', amount: '- $18.40', icon: ArrowUpRight, accent: 'bg-orange-500/10 text-orange-600' },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-14 max-w-4xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold tracking-[0.16em] text-primary"><span className="h-2 w-2 rounded-full bg-emerald-500" />BETA · ACCESO ANTICIPADO</div>
          <h1 className="mb-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-7xl">Tus finanzas, claras.<span className="block bg-gradient-to-r from-primary via-blue-500 to-cyan-500 bg-clip-text text-transparent">Tus decisiones, mejores.</span></h1>
          <p className="mx-auto mb-9 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">Organiza tus cuentas, movimientos y presupuestos para tomar mejores decisiones financieras en Venezuela.</p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedLandingLink href="/auth/register" eventName="landing_hero_cta_click" properties={{ cta_id: 'hero_primary', destination: '/auth/register' }} className="group inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90 sm:w-auto">Crear mi primer presupuesto<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /></TrackedLandingLink>
            <TrackedLandingLink href="#tasas-en-vivo" eventName="rate_cockpit_interaction" properties={{ interaction: 'hero_rates_link', source: 'BCV' }} className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/70 px-7 py-3.5 text-base font-semibold text-foreground backdrop-blur-sm transition-colors hover:bg-muted/70 sm:w-auto"><Play className="h-4 w-4 fill-current" />Ver cómo se consulta la tasa</TrackedLandingLink>
          </div>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <p className="sr-only">Vista demostrativa de FinTec: un movimiento se convierte en presupuesto y ayuda a tomar una decisión.</p>
          <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-r from-primary/15 via-blue-500/10 to-cyan-500/15 blur-3xl" />
          <div aria-hidden="true" className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/95 shadow-2xl shadow-black/10 backdrop-blur-xl dark:shadow-black/30">
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-5 py-3.5 sm:px-6"><div className="flex gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /></div><span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] font-medium text-muted-foreground">Demo ilustrativa</span></div>
            <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.35fr_0.65fr] lg:p-9">
              <div className="space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-1 text-sm font-medium text-muted-foreground">Balance estimado · demo</p><div className="flex items-center gap-3"><p className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">$2,480.00</p><Eye className="h-4 w-4 text-muted-foreground" /></div></div><div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600"><TrendingUp className="h-3.5 w-3.5" />Resumen del mes</div></div>
                <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-border/50 bg-background/70 p-4"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><WalletCards className="h-4 w-4" /></div><p className="text-xs text-muted-foreground">Cuentas</p><p className="mt-1 font-semibold text-foreground">3 activas</p></div><div className="rounded-2xl border border-border/50 bg-background/70 p-4"><p className="text-xs text-muted-foreground">Presupuesto usado</p><p className="mt-2 text-lg font-semibold text-foreground">62%</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-[62%] rounded-full bg-primary" /></div></div><div className="rounded-2xl border border-border/50 bg-background/70 p-4"><p className="text-xs text-muted-foreground">Meta de ahorro</p><p className="mt-2 text-lg font-semibold text-foreground">$850</p><p className="mt-1 text-xs text-emerald-600">Avanzando</p></div></div>
                <div className="rounded-2xl border border-border/50 bg-background/70 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-foreground">Movimientos recientes</h2><span className="text-xs font-medium text-primary">Ver todos</span></div><div className="space-y-4">{recentMovements.map((movement) => { const Icon = movement.icon; return <div key={movement.name} className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${movement.accent}`}><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{movement.name}</p><p className="truncate text-xs text-muted-foreground">{movement.detail}</p></div></div><span className="shrink-0 text-sm font-semibold text-foreground">{movement.amount}</span></div>; })}</div></div></div>
              <div className="relative flex min-h-64 flex-col justify-center rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/[0.08] to-transparent p-5 sm:p-6"><div className="pointer-events-none absolute inset-x-6 top-1/2 h-px bg-gradient-to-r from-primary/10 via-primary to-cyan-400/10 motion-safe:animate-pulse" /><div className="relative space-y-4"><Node label="Movimiento" detail="Registra lo que pasó" /><Node label="Presupuesto" detail="Entiende tu margen" /><Node label="Decisión" detail="Actúa con claridad" /></div></div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">Las tasas se consultan en un solo cockpit cuando las necesites · <a href="#tasas-en-vivo" className="font-medium text-primary">ver tasas de referencia</a></p>
        </div>
      </div>
    </section>
  );
}

function Node({ label, detail }: { label: string; detail: string }) {
  return <div className="relative flex items-center gap-3 rounded-xl border border-border/50 bg-card/80 p-3"><span className="h-3 w-3 shrink-0 rounded-full bg-primary shadow-[0_0_0_5px_hsl(var(--primary)/.12)]" /><div><p className="text-sm font-semibold text-foreground">{label}</p><p className="text-xs text-muted-foreground">{detail}</p></div></div>;
}
