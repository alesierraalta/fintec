'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { DollarSign, FileText } from 'lucide-react';
import { toMinorUnits } from '@/lib/money';
import { supabase } from '@/repositories/supabase/client';
import type { CreatePaymentOrderDTO } from '@/types/payment-order';

interface CreateOrderFormProps {
  onSuccess: (orderId: string) => void;
  onCancel?: () => void;
}

export function CreateOrderForm({ onSuccess, onCancel }: CreateOrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate amount
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('El monto debe ser mayor a 0');
      }

      // Get authenticated user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No autenticado');
      }

      // Convert to minor units (VES has 2 decimals)
      const amountMinor = toMinorUnits(amount, 'VES');

      const orderData: CreatePaymentOrderDTO = {
        amountMinor,
        currencyCode: 'VES',
        description: formData.description || undefined,
      };

      // Create order
      const response = await fetch('/api/payment-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Error al crear la orden');
      }

      // Success
      onSuccess(result.data.id);
    } catch (err: any) {
      setError(err.message || 'Error al crear la orden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="number"
        label="Monto (Bs.)"
        placeholder="0.00"
        value={formData.amount}
        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        icon={<DollarSign className="h-5 w-5" />}
        required
        min="0.01"
        step="0.01"
        error={error && formData.amount === '' ? error : undefined}
      />

      <Input
        type="text"
        label="Descripción (opcional)"
        placeholder="Ej: Pago de suscripción"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        icon={<FileText className="h-5 w-5" />}
      />

      {error && formData.amount !== '' && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          className="flex-1"
        >
          Crear Orden
        </Button>
      </div>
    </form>
  );
}


