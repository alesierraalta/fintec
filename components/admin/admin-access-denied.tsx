import Link from 'next/link';

export function AdminAccessDenied() {
  return (
    <section className="glass-card mx-auto max-w-2xl rounded-3xl p-10 text-center">
      <h1 className="text-2xl font-bold">Acceso denegado</h1>
      <p className="mt-3 text-muted-foreground">No tienes permisos para consultar las métricas administrativas.</p>
      <Link className="mt-6 inline-block text-primary underline" href="/">Volver al inicio</Link>
    </section>
  );
}
