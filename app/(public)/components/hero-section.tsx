import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Eye,
  Play,
  TrendingUp,
  WalletCards,
} from 'lucide-react';

const recentMovements = [
  {
    name: 'Ingreso recibido',
    detail: 'Cuenta principal',
    amount: '+ $120.00',
    icon: ArrowDownLeft,
    accent: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    name: 'Compra registrada',
    detail: 'Alimentación',
    amount: '- $18.40',
    icon: ArrowUpRight,
    accent: 'bg-orange-500/10 text-orange-600',
  },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-14 max-w-4xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold tracking-[0.16em] text-primary">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            BETA · ACCESO ANTICIPADO
          </div>

          <h1 className="mb-6 text-balance text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-7xl">
            Tus finanzas, claras.
            <span className="block bg-gradient-to-r from-primary via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              Tus decisiones, mejores.
            </span>
          </h1>

          <p className="mx-auto mb-9 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Organiza cuentas, movimientos y presupuestos mientras consultas las
            tasas del BCV y referencias de Binance P2P en un solo lugar.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/register"
              className="group inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl sm:w-auto"
            >
              Comenzar gratis
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="#tasas-en-vivo"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/70 px-7 py-3.5 text-base font-semibold text-foreground backdrop-blur-sm transition-colors hover:bg-muted/70 sm:w-auto"
            >
              <Play className="h-4 w-4 fill-current" />
              Ver las tasas
            </Link>
          </div>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <p className="sr-only">
            Vista ilustrativa de FinTec con un resumen de cuentas, movimientos y
            tasas de referencia. Los importes mostrados son demostrativos.
          </p>
          <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-r from-primary/15 via-blue-500/10 to-cyan-500/15 blur-3xl" />

          <div
            aria-hidden="true"
            className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/95 shadow-2xl shadow-black/10 backdrop-blur-xl dark:shadow-black/30"
          >
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-5 py-3.5 sm:px-6">
              <div className="flex gap-2" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                Vista del producto
              </span>
            </div>

            <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.35fr_0.65fr] lg:p-9">
              <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">
                      Balance estimado
                    </p>
                    <div className="flex items-center gap-3">
                      <p className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        $2,480.00
                      </p>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Resumen del mes
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <WalletCards className="h-4 w-4" />
                    </div>
                    <p className="text-xs text-muted-foreground">Cuentas</p>
                    <p className="mt-1 font-semibold text-foreground">
                      3 activas
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
                    <p className="text-xs text-muted-foreground">
                      Presupuesto usado
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      62%
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-[62%] rounded-full bg-primary" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
                    <p className="text-xs text-muted-foreground">
                      Meta de ahorro
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      $850
                    </p>
                    <p className="mt-1 text-xs text-emerald-600">Avanzando</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/50 bg-background/70 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-semibold text-foreground">
                      Movimientos recientes
                    </h2>
                    <span className="text-xs font-medium text-primary">
                      Ver todos
                    </span>
                  </div>
                  <div className="space-y-4">
                    {recentMovements.map((movement) => {
                      const Icon = movement.icon;
                      return (
                        <div
                          key={movement.name}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${movement.accent}`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {movement.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {movement.detail}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-foreground">
                            {movement.amount}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <aside className="rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/[0.08] to-transparent p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Tasas de referencia
                </p>
                <h2 className="mt-2 text-xl font-bold text-foreground">
                  Todo a la vista
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Consulta valores de referencia sin cambiar de aplicación.
                </p>

                <div className="mt-7 space-y-3">
                  <div className="rounded-2xl border border-border/50 bg-card/80 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        BCV
                      </span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600">
                        OFICIAL
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-foreground">
                      Bs. —
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Se muestra con datos disponibles
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/50 bg-card/80 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Binance P2P
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        REFERENCIA
                      </span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-foreground">
                      Bs. —
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Según disponibilidad del mercado
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
                  La información visual es demostrativa. Las tasas reales
                  aparecen al estar disponibles.
                </p>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
