'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/money';
import { supabase } from '@/repositories/supabase/client';
import { isAdmin } from '@/lib/payment-orders/admin-utils';
import type { PaymentOrder } from '@/types/payment-order';
import { Button } from '@/components/ui';
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Clock,
  DollarSign,
  Calendar,
  User,
  FileText
} from 'lucide-react';

interface AdminPanelProps {
  onApprove?: (orderId: string) => void;
  onReject?: (orderId: string) => void;
  onViewReceipt?: (orderId: string, receiptUrl: string) => void;
}

export function AdminPanel({ onApprove, onReject, onViewReceipt }: AdminPanelProps) {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrder | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No autenticado');
      }

      const userId = session.user.id;
      if (!isAdmin(userId)) {
        throw new Error('No tienes permisos de administrador');
      }

      const response = await fetch('/api/payment-orders?status=pending_review', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al cargar órdenes');
      }

      setOrders(result.data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar órdenes');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    try {
      setApproving(orderId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No autenticado');
      }

      const response = await fetch(`/api/payment-orders/${orderId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al aprobar orden');
      }

      // Reload orders
      await loadOrders();
      if (onApprove) {
        onApprove(orderId);
      }
    } catch (err: any) {
      alert(err.message || 'Error al aprobar orden');
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (orderId: string, reason: string) => {
    try {
      setRejecting(orderId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No autenticado');
      }

      const response = await fetch(`/api/payment-orders/${orderId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reason }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al rechazar orden');
      }

      // Reload orders
      await loadOrders();
      setShowRejectModal(false);
      setSelectedOrder(null);
      setRejectReason('');
      if (onReject) {
        onReject(orderId);
      }
    } catch (err: any) {
      alert(err.message || 'Error al rechazar orden');
    } finally {
      setRejecting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No hay órdenes pendientes de revisión</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div
          key={order.id}
          className="rounded-xl border bg-card p-6 shadow-lg"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold">
                    Orden #{order.id.substring(0, 8).toUpperCase()}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">
                      {formatCurrency(order.amountMinor, order.currencyCode)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('es-VE')}
                    </span>
                  </div>
                </div>

                {order.description && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground">{order.description}</p>
                  </div>
                )}

                {order.receiptUrl && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (onViewReceipt) {
                          onViewReceipt(order.id, order.receiptUrl!);
                        } else {
                          window.open(order.receiptUrl, '_blank');
                        }
                      }}
                      icon={<Eye className="h-4 w-4" />}
                    >
                      Ver Comprobante
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 border-t pt-4">
              <Button
                variant="success"
                size="sm"
                onClick={() => handleApprove(order.id)}
                loading={approving === order.id}
                disabled={approving !== null || rejecting !== null}
                icon={<CheckCircle2 className="h-4 w-4" />}
                className="flex-1"
              >
                Aprobar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setSelectedOrder(order);
                  setShowRejectModal(true);
                }}
                disabled={approving !== null || rejecting !== null}
                icon={<XCircle className="h-4 w-4" />}
                className="flex-1"
              >
                Rechazar
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Reject Modal */}
      {showRejectModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Rechazar Orden</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Por favor, proporciona una razón para rechazar esta orden.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej: Comprobante no coincide con el monto..."
              className="mb-4 w-full rounded-lg border p-3 text-sm"
              rows={3}
              required
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedOrder(null);
                  setRejectReason('');
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => handleReject(selectedOrder.id, rejectReason)}
                loading={rejecting === selectedOrder.id}
                disabled={!rejectReason.trim()}
                className="flex-1"
              >
                Rechazar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



