'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/money';
import { supabase } from '@/repositories/supabase/client';
import type { PaymentOrder } from '@/types/payment-order';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Upload,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui';

interface OrderListProps {
  onViewOrder?: (orderId: string) => void;
  onUploadReceipt?: (orderId: string) => void;
}

const statusConfig = {
  pending: {
    label: 'Pendiente',
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
  },
  pending_review: {
    label: 'En Revisión',
    icon: Eye,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  approved: {
    label: 'Aprobada',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
  },
  rejected: {
    label: 'Rechazada',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
  },
  expired: {
    label: 'Expirada',
    icon: Clock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
  },
};

export function OrderList({ onViewOrder, onUploadReceipt }: OrderListProps) {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      const response = await fetch('/api/payment-orders', {
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
        <p className="text-muted-foreground">No tienes órdenes de pago aún</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const config = statusConfig[order.status];
        const StatusIcon = config.icon;

        return (
          <div
            key={order.id}
            className="rounded-xl border bg-card p-6 shadow-lg transition-shadow hover:shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${config.bgColor} ${config.borderColor} border`}
                  >
                    <StatusIcon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {order.description || 'Orden de Pago'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {config.label}
                    </p>
                  </div>
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

                {order.adminNotes && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-sm">
                      <span className="font-medium">Nota del admin:</span>{' '}
                      {order.adminNotes}
                    </p>
                  </div>
                )}
              </div>

              <div className="ml-4 flex flex-col gap-2">
                {order.status === 'pending' && onUploadReceipt && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUploadReceipt(order.id)}
                    icon={<Upload className="h-4 w-4" />}
                  >
                    Subir Comprobante
                  </Button>
                )}
                {onViewOrder && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewOrder(order.id)}
                    icon={<Eye className="h-4 w-4" />}
                  >
                    Ver Detalles
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


