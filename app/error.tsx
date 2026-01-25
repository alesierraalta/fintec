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
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon Container */}
        <div className="relative mx-auto h-24 w-24">
          <div className="absolute inset-0 bg-destructive/20 rounded-full animate-pulse-soft" />
          <div className="relative flex h-full w-full items-center justify-center rounded-full bg-card/50 border border-destructive/30 backdrop-blur-xl shadow-xl">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Algo salió mal</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Hemos encontrado un error inesperado. Nuestro equipo ha sido notificado.
            <br />
            {error.digest && (
              <span className="text-xs font-mono text-muted-foreground/50 mt-2 block">
                Error ID: {error.digest}
              </span>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-center">
          <Button
            onClick={reset}
            variant="primary"
            size="lg"
            className="w-full sm:w-auto shadow-lg hover:shadow-primary/25"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
          
          <Button
            onClick={() => window.location.href = '/'}
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
