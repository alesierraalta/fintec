'use client';

/**
 * Blocking consent gate for authenticated users.
 *
 * Covers the three paths where a signup checkbox is not enough:
 *   - Accounts created before consent tracking existed.
 *   - OAuth sign-ins, where acceptance cannot be inferred from the provider.
 *   - Material updates to the Terms or Privacy Policy (version bump).
 *
 * Until the current version is accepted the app content stays inert behind
 * the dialog, because continued use is exactly what the acceptance covers.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { recordLegalAcceptance } from '@/lib/legal/record-acceptance';

export function LegalConsentGate() {
  const [needsConsent, setNeedsConsent] = useState(false);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        // A 401 means there is no session, so there is nothing to gate. This
        // keeps the gate independent of any auth context provider.
        const response = await fetch('/api/legal/acceptance');
        if (!response.ok) return;
        const data = await response.json();
        // A failed check must not lock the user out: only an explicit
        // "not accepted" answer raises the gate.
        if (!cancelled) setNeedsConsent(data.accepted === false);
      } catch {
        // Network failure — stay silent and retry on the next mount.
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = useCallback(async () => {
    await createClient().auth.signOut();
    window.location.assign('/auth/login');
  }, []);

  const handleAccept = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    const recorded = await recordLegalAcceptance('re-consent');
    setSubmitting(false);

    if (!recorded) {
      setError('No se pudo registrar tu aceptación. Inténtalo de nuevo.');
      return;
    }
    setNeedsConsent(false);
  }, []);

  if (!needsConsent) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legalConsentTitle"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 p-4"
    >
      <div className="w-full max-w-md rounded-3xl border border-border/50 bg-card p-8 shadow-2xl">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>

        <h2 id="legalConsentTitle" className="mb-3 text-2xl font-bold">
          Actualizamos nuestros términos
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          Para seguir usando FinTec necesitamos que revises y aceptes la versión
          vigente de nuestros documentos legales.
        </p>

        <label
          htmlFor="legalConsentGateCheckbox"
          className="mb-6 flex cursor-pointer items-start gap-3 rounded-xl border border-border/50 bg-muted/20 p-4"
        >
          <input
            id="legalConsentGateCheckbox"
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            disabled={submitting}
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-border accent-primary"
          />
          <span className="text-xs leading-relaxed text-muted-foreground">
            He leído y acepto los{' '}
            <Link
              href="/terms"
              target="_blank"
              className="font-semibold text-primary hover:underline"
            >
              Términos de Servicio
            </Link>{' '}
            y la{' '}
            <Link
              href="/privacy"
              target="_blank"
              className="font-semibold text-primary hover:underline"
            >
              Política de Privacidad
            </Link>
            .
          </span>
        </label>

        {error && (
          <p role="alert" className="mb-4 text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleAccept}
            disabled={!checked || submitting}
            loading={submitting}
            className="w-full"
            size="lg"
          >
            Aceptar y continuar
          </Button>
          <Button
            variant="ghost"
            onClick={() => void handleSignOut()}
            disabled={submitting}
            className="w-full text-muted-foreground"
          >
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
