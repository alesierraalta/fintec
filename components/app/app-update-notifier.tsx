'use client';

import React from 'react';
import { Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { useAppUpdate } from '@/hooks/use-app-update';
import { Button } from '@/components/ui/button';

export function AppUpdateNotifier() {
  const {
    hasUpdate,
    isDismissed,
    currentVersion,
    latestVersion,
    releaseNotes,
    dismissUpdate,
    triggerUpdate,
  } = useAppUpdate();

  if (!hasUpdate || isDismissed) {
    return null;
  }

  const handleUpdate = () => {
    toast.info(
      'Descargando actualización... Toca el archivo descargado para completar la instalación.'
    );
    triggerUpdate();
  };

  return (
    <div
      data-testid="app-update-notification"
      role="alert"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-2xl border border-primary/30 bg-card/95 p-4 shadow-2xl backdrop-blur-xl transition-all sm:bottom-6 sm:left-auto sm:right-6"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
          <Rocket className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-semibold text-foreground">
              ¡Nueva versión de FinTec disponible!
            </h4>
            <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
              v{latestVersion}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            versión actual: v{currentVersion}
          </p>
          {releaseNotes && (
            <p className="mt-2 rounded-lg border border-border/40 bg-muted/40 p-2 text-xs leading-relaxed text-foreground/80">
              {releaseNotes}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={handleUpdate}
              className="gap-1.5 text-xs font-semibold"
            >
              🚀 Actualizar FinTec
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={dismissUpdate}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Más tarde
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
