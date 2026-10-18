'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Icon Container */}
        <div className="relative mx-auto h-24 w-24">
          <div className="absolute inset-0 animate-pulse-soft rounded-full bg-destructive/20" />
          <div className="relative flex h-full w-full items-center justify-center rounded-full border border-destructive/30 bg-card/50 shadow-xl">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Algo salió mal</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Hemos encontrado un error inesperado. Nuestro equipo ha sido
            notificado.
            <br />
            {error.digest && (
              <span className="mt-2 block font-mono text-xs text-muted-foreground/50">
                Error ID: {error.digest}
              </span>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col justify-center gap-3 pt-4 sm:flex-row">
          <Button
            onClick={reset}
            variant="primary"
            size="lg"
            className="w-full shadow-lg hover:shadow-primary/25 sm:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>

          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            <Home className="mr-2 h-4 w-4" />
            Ir al Inicio
          </Button>
        </div>
      </div>
    </div>
  );
}
