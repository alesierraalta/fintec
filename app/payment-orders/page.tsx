'use client';

import { useState } from 'react';
import { CreateOrderForm } from '@/components/payment-orders/create-order-form';
import { PaymentInstructions } from '@/components/payment-orders/payment-instructions';
import { ReceiptUpload } from '@/components/payment-orders/receipt-upload';
import { OrderList } from '@/components/payment-orders/order-list';
import { Modal } from '@/components/ui';
import { supabase } from '@/repositories/supabase/client';
import type { PaymentOrder } from '@/types/payment-order';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui';

type ViewMode = 'list' | 'create' | 'instructions' | 'upload';

export default function PaymentOrdersPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadOrderId, setUploadOrderId] = useState<string | null>(null);

  const handleCreateSuccess = async (orderId: string) => {
    // Load order details
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/payment-orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();
      if (result.success) {
        setCurrentOrder(result.data);
        setViewMode('instructions');
      }
      } catch (err) {
        // Error loading order - will be handled by UI
      }
  };

  const handleUploadClick = (orderId: string) => {
    setUploadOrderId(orderId);
    setShowUploadModal(true);
  };

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    setUploadOrderId(null);
    setViewMode('list');
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-6">
      <div className="mb-6">
        {viewMode !== 'list' && (
          <Button
            variant="ghost"
            onClick={() => {
              setViewMode('list');
              setCurrentOrder(null);
            }}
            icon={<ArrowLeft className="h-4 w-4" />}
            className="mb-4"
          >
            Volver
          </Button>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Órdenes de Pago</h1>
            <p className="text-muted-foreground">
              Gestiona tus pagos móviles con Mercantil Banco
            </p>
          </div>
          {viewMode === 'list' && (
            <Button
              variant="primary"
              onClick={() => setViewMode('create')}
              icon={<Plus className="h-4 w-4" />}
            >
              Nueva Orden
            </Button>
          )}
        </div>
      </div>

      {viewMode === 'list' && (
        <OrderList
          onViewOrder={(orderId) => {
            // Load order and show details
            // For now, just show upload option if pending
          }}
          onUploadReceipt={handleUploadClick}
        />
      )}

      {viewMode === 'create' && (
        <div className="rounded-xl border bg-card p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold">Crear Nueva Orden</h2>
          <CreateOrderForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setViewMode('list')}
          />
        </div>
      )}

      {viewMode === 'instructions' && currentOrder && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold">Instrucciones de Pago</h2>
            <PaymentInstructions order={currentOrder} />
          </div>
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => {
                setUploadOrderId(currentOrder.id);
                setShowUploadModal(true);
              }}
            >
              Subir Comprobante
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setUploadOrderId(null);
        }}
        title="Subir Comprobante"
      >
        {uploadOrderId && (
          <ReceiptUpload
            orderId={uploadOrderId}
            onSuccess={handleUploadSuccess}
            onCancel={() => {
              setShowUploadModal(false);
              setUploadOrderId(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

