'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { currencyService } from '@/lib/services/currency-service';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import { BinanceRatesComponent } from '@/components/currency/binance-rates';
import { trackLandingEvent } from '@/lib/analytics/landing-events';
import type { BCVRates } from '@/types/rates';

const FRESHNESS_LIMIT_MS = 15 * 60 * 1000;

type Source = 'BCV' | 'P2P';

function ageLabel(timestamp: string): { label: string; fresh: boolean } {
  const observed = new Date(timestamp).getTime();
  const age = Date.now() - observed;
  if (!Number.isFinite(observed) || age < 0) return { label: 'Antigüedad desconocida', fresh: false };
  const minutes = Math.floor(age / 60000);
  return { label: minutes < 1 ? 'hace menos de 1 min' : `hace ${minutes} min`, fresh: age <= FRESHNESS_LIMIT_MS };
}

function Skeleton() {
  return <div role="status" aria-label="Cargando tasas" className="animate-pulse rounded-2xl border border-border/40 bg-card/80 p-6"><div className="h-4 w-40 rounded bg-muted/40" /><div className="mt-5 h-10 w-48 rounded bg-muted/40" /><div className="mt-4 h-4 w-56 rounded bg-muted/40" /></div>;
}

export function RateCockpit() {
  const [source, setSource] = useState<Source>('BCV');
  const [shouldLoad, setShouldLoad] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (shouldLoad) return;
    if (typeof IntersectionObserver === 'undefined' || !ref.current) { setShouldLoad(true); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) { setShouldLoad(true); observer.disconnect(); } }, { rootMargin: '300px 0px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [shouldLoad]);

  const selectSource = (next: Source) => { if (next === source) return; trackLandingEvent('rate_source_select', { source: next, previous_source: source }); setSource(next); };
  return <section id="tasas-en-vivo" ref={ref} className="scroll-mt-28 px-4 pb-16 sm:px-6 lg:px-8" aria-labelledby="rate-cockpit-title">
    <div className="mx-auto max-w-7xl rounded-3xl border border-border/20 bg-card/50 p-5 shadow-2xl backdrop-blur-sm sm:p-6">
      <div className="mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Utilidad integrada</p><h2 id="rate-cockpit-title" className="text-2xl font-bold text-foreground sm:text-3xl">Tasas de referencia</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Consulta BCV y compara referencias P2P sin confundirlas con una cotización garantizada.</p></div><span className="inline-flex min-h-[44px] items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Frescura: ≤15 minutos</span></div>
      <div role="tablist" aria-label="Fuente de tasas" className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-muted/40 p-1.5"><button role="tab" aria-selected={source === 'BCV'} aria-controls="rate-panel-bcv" onClick={() => selectSource('BCV')} className={`min-h-[44px] rounded-xl px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${source === 'BCV' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>BCV</button><button role="tab" aria-selected={source === 'P2P'} aria-controls="rate-panel-p2p" onClick={() => selectSource('P2P')} className={`min-h-[44px] rounded-xl px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${source === 'P2P' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>P2P</button></div>
      {!shouldLoad ? <Skeleton /> : source === 'BCV' ? <BCVPanel /> : <P2PPanel />}
    </div>
  </section>;
}

function BCVPanel() {
  const [rates, setRates] = useState<BCVRates | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const fetchRates = async () => { setLoading(true); setError(false); try { setRates(await currencyService.fetchBCVRates()); } catch { setError(true); } finally { setLoading(false); } };
  useEffect(() => { void fetchRates(); }, []);
  if (loading && !rates) return <Skeleton />;
  if (error && !rates) return <div role="alert" className="rounded-2xl border border-destructive/30 p-5"><p className="font-semibold text-foreground">No pudimos consultar el BCV.</p><p className="mt-1 text-sm text-muted-foreground">Intenta nuevamente en unos segundos.</p><button onClick={() => void fetchRates()} className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"><RefreshCw className="h-4 w-4" />Reintentar</button></div>;
  if (!rates) return null;
  const age = ageLabel(rates.lastUpdated);
  const fallback = rates.fallback === true;
  return <div id="rate-panel-bcv" role="tabpanel" aria-labelledby="rate-cockpit-title" className="min-w-0"><div className="mb-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-foreground">Banco Central de Venezuela</p><p className="text-xs text-muted-foreground">Fuente: {rates.source}</p></div><div role="status" className={`inline-flex min-h-[44px] items-center rounded-full border px-3 text-xs font-semibold ${fallback || !age.fresh ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>{fallback ? 'FALLBACK · ' : !age.fresh ? 'NO FRESCA · ' : 'FRESCA · '}{age.label}</div></div><div className="grid min-w-0 gap-3 sm:grid-cols-2"><RateValue label="USD" value={rates.usd} /><RateValue label="EUR" value={rates.eur} /></div><div className="mt-5 flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Observado: {new Date(rates.lastUpdated).toLocaleString('es-VE')}</span><button onClick={() => void fetchRates()} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border px-4 font-semibold text-foreground"><RefreshCw className="h-4 w-4" />Actualizar</button></div>{error ? <p role="alert" className="mt-3 text-sm text-destructive">La última consulta falló; se conserva el valor disponible.</p> : null}</div>;
}

function RateValue({ label, value }: { label: string; value: number }) { return <div className="min-w-0 rounded-2xl border border-border/50 bg-background/60 p-5"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-muted-foreground">{label}</span><TrendingUp className="h-4 w-4 text-emerald-600" aria-hidden="true" /></div><p className="mt-3 break-words text-2xl font-bold tabular-nums text-foreground sm:text-3xl">Bs. {value.toFixed(2)}</p><p className="mt-1 text-xs text-muted-foreground">Referencia por 1 {label}</p></div>; }

function P2PPanel() { const snapshot = useBinanceRates({ enabled: true }); return <div id="rate-panel-p2p" role="tabpanel" aria-labelledby="rate-cockpit-title"><BinanceRatesComponent snapshot={snapshot} /></div>; }