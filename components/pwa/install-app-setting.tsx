'use client';

import { useState } from 'react';
import { CheckCircle2, Download, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { IosInstallSheet } from './ios-install-sheet';
import { SettingRow } from './setting-row';
import {
  ALREADY_INSTALLED_DESCRIPTION,
  ALREADY_INSTALLED_TITLE,
  INSTALL_APP_TITLE,
  INSTALL_NOT_SUPPORTED_EXPLANATION,
  INSTALL_TAGLINE,
  INSTALL_UNAVAILABLE_EXPLANATION,
  IOS_INSTRUCTIONS_DESCRIPTION,
} from './copy';

/**
 * Persistent "Instalar app" entry point for the settings page.
 *
 * Deliberately IGNORES `isDismissed` and does NOT gate on
 * `isIosPromptEligible`: those two flags exist to stop the interruptive
 * banner from nagging. A user who navigated here on purpose is the opposite
 * situation — closing the banner once should never remove every way back
 * into installing the app, especially since the `beforeinstallprompt`
 * capture script suppresses Chrome's own native install affordance.
 *
 * Presentational only: consumes `usePwaInstall()` and never touches
 * `window`, `navigator`, `beforeinstallprompt`, or `lib/pwa/` directly.
 *
 * Always renders a non-empty row, even when there is no install path
 * (`promptKind === 'none'`, e.g. desktop Firefox/Safari, or the Capacitor
 * native shell): the surrounding settings card has no other knowledge of
 * `promptKind`, so this component is the only place that can keep the card
 * from ending on an orphan sentence with nothing under it.
 */
export function InstallAppSetting() {
  const { promptKind, canInstall, promptInstall } = usePwaInstall();
  const [isIosSheetOpen, setIsIosSheetOpen] = useState(false);

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      toast.success('Instalación iniciada');
    } else if (outcome === 'unavailable') {
      toast.error('No se pudo iniciar la instalación');
    }
  };

  if (promptKind === 'installed') {
    return (
      <SettingRow
        icon={<CheckCircle2 className="h-6 w-6 flex-shrink-0 text-success" />}
        title={ALREADY_INSTALLED_TITLE}
        description={ALREADY_INSTALLED_DESCRIPTION}
      />
    );
  }

  if (promptKind === 'instructions') {
    return (
      <>
        <SettingRow
          icon={<Smartphone className="h-6 w-6 flex-shrink-0 text-primary" />}
          title={INSTALL_APP_TITLE}
          description={IOS_INSTRUCTIONS_DESCRIPTION}
          action={
            <Button
              size="sm"
              onClick={() => setIsIosSheetOpen(true)}
              icon={<Download className="h-4 w-4" />}
            >
              Ver instrucciones
            </Button>
          }
        />
        <IosInstallSheet
          open={isIosSheetOpen}
          onDismiss={() => setIsIosSheetOpen(false)}
        />
      </>
    );
  }

  if (promptKind === 'native') {
    return (
      <SettingRow
        icon={<Smartphone className="h-6 w-6 flex-shrink-0 text-primary" />}
        title={INSTALL_APP_TITLE}
        description={
          canInstall ? INSTALL_TAGLINE : INSTALL_UNAVAILABLE_EXPLANATION
        }
        action={
          canInstall ? (
            <Button
              size="sm"
              onClick={() => void handleInstall()}
              icon={<Download className="h-4 w-4" />}
            >
              Instalar
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <SettingRow
      icon={
        <Smartphone className="h-6 w-6 flex-shrink-0 text-muted-foreground" />
      }
      title={INSTALL_APP_TITLE}
      description={INSTALL_NOT_SUPPORTED_EXPLANATION}
    />
  );
}
