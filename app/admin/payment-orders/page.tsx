'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminPanel } from '@/components/payment-orders/admin-panel';
import { supabase } from '@/repositories/supabase/client';
import { isAdmin } from '@/lib/payment-orders/admin-utils';
import { Button } from '@/components/ui';
import { ArrowLeft, Eye } from 'lucide-react';

export default function AdminPaymentOrdersPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<{ orderId: string; url: string } | null>(null);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }

      const userId = session.user.id;
      if (!isAdmin(userId)) {
        setAuthorized(false);
        return;
      }

      setAuthorized(true);
    } catch (err) {
      setAuthorized(false);
    }
  };

  if (authorized === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="container mx-auto max-w-4xl p-4 md:p-6">
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-8 text-center">
          <h2 className="mb-2 text-xl font-semibold">Acceso Denegado</h2>
          <p className="text-muted-foreground mb-4">
            No tienes permisos para acceder a esta página.
          </p>
          <Button variant="outline" onClick={() => router.push('/')}>
            Volver al Inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          icon={<ArrowLeft className="h-4 w-4" />}
          className="mb-4"
        >
          Volver
        </Button>

        <div>
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
          <p className="text-muted-foreground">
            Revisa y aprueba órdenes de pago pendientes
          </p>
        </div>
      </div>

      <AdminPanel
        onApprove={() => {
          // Order approved, panel will reload automatically
        }}
        onReject={() => {
          // Order rejected, panel will reload automatically
        }}
        onViewReceipt={(orderId, receiptUrl) => {
          setSelectedReceipt({ orderId, url: receiptUrl });
        }}
      />

      {/* Receipt Viewer Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl rounded-xl border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Comprobante</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedReceipt(null)}
              >
                Cerrar
              </Button>
            </div>
            <div className="max-h-[80vh] overflow-auto">
              {selectedReceipt.url.endsWith('.pdf') ? (
                <iframe
                  src={selectedReceipt.url}
                  className="h-[600px] w-full rounded-lg border"
                  title="Comprobante PDF"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selectedReceipt.url}
                  alt="Comprobante"
                  className="w-full rounded-lg border object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

