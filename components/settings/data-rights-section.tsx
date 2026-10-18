'use client';

/**
 * Data-subject rights UI.
 *
 * The Privacy Policy grants access, portability and erasure. This section is
 * where the user actually exercises them without writing an email.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';

const DELETE_CONFIRMATION = 'ELIMINAR CUENTA';

export function DataRightsSection() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/account/export');
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fintec-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success('Exportación descargada');
    } catch {
      toast.error('No se pudo exportar tus datos');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationText }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? 'Delete failed');
      }

      toast.success('Tu cuenta y tus datos fueron eliminados');
      await signOut();
      router.push('/');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'No se pudo eliminar la cuenta'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
        <h4 className="mb-1 text-sm font-semibold text-foreground">
          Exportar mis datos
        </h4>
        <p className="mb-4 text-xs text-muted-foreground">
          Descarga una copia estructurada de tus cuentas, transacciones,
          presupuestos y metas en formato JSON.
        </p>
        <Button
          onClick={handleExport}
          loading={exporting}
          disabled={exporting}
          variant="secondary"
          size="sm"
          icon={<Download className="h-4 w-4" />}
        >
          Descargar exportación
        </Button>
      </div>

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <h4 className="mb-1 text-sm font-semibold text-destructive">
          Eliminar mi cuenta
        </h4>
        <p className="mb-4 text-xs text-muted-foreground">
          Elimina de forma permanente tu cuenta y todos tus datos financieros.
          Esta acción no se puede deshacer.
        </p>

        {!confirmOpen ? (
          <Button
            onClick={() => setConfirmOpen(true)}
            variant="danger"
            size="sm"
            icon={<Trash2 className="h-4 w-4" />}
          >
            Eliminar cuenta
          </Button>
        ) : (
          <div className="space-y-3">
            <Input
              id="deleteConfirmation"
              name="deleteConfirmation"
              label={`Escribe "${DELETE_CONFIRMATION}" para confirmar`}
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              disabled={deleting}
              autoComplete="off"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleDelete}
                loading={deleting}
                disabled={deleting || confirmationText !== DELETE_CONFIRMATION}
                variant="danger"
                size="sm"
              >
                Confirmar eliminación
              </Button>
              <Button
                onClick={() => {
                  setConfirmOpen(false);
                  setConfirmationText('');
                }}
                disabled={deleting}
                variant="ghost"
                size="sm"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
