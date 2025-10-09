'use client';

import { useState } from 'react';
import { X, Crown, Zap } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useUpgrade } from '@/hooks/use-subscription';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestedTier?: 'base' | 'premium';
  reason?: string;
}

export function UpgradeModal({ 
  isOpen, 
  onClose, 
  suggestedTier = 'base',
  reason 
}: UpgradeModalProps) {
  const { upgrade, loading } = useUpgrade();
  const [selectedTier, setSelectedTier] = useState<'base' | 'premium'>(suggestedTier);

  const handleUpgrade = async () => {
    await upgrade(selectedTier);
  };

  const tiers = {
    base: {
      name: 'Base',
      price: '$4.99',
      icon: Zap,
      color: 'text-blue-500',
      features: [
        'Transacciones ilimitadas',
        'Historial completo',
        'Exportación de datos',
        'Respaldos automáticos',
        'Tasas en tiempo real',
      ],
    },
    premium: {
      name: 'Premium',
      price: '$9.99',
      icon: Crown,
      color: 'text-purple-500',
      features: [
        'Todo lo de Base',
        'IA: Categorización automática',
        'Predicciones de gastos',
        'Consejos financieros',
        'Detección de anomalías',
        'Optimización de presupuestos',
      ],
    },
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Actualiza tu plan">
      <div className="space-y-6">
        {/* Reason */}
        {reason && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <p className="text-sm font-medium">{reason}</p>
          </div>
        )}

        {/* Tier Selection */}
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(tiers).map(([key, tier]) => {
            const Icon = tier.icon;
            const isSelected = selectedTier === key;

            return (
              <button
                key={key}
                onClick={() => setSelectedTier(key as 'base' | 'premium')}
                className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-primary text-primary-foreground rounded-full p-1">
                      <Zap className="h-3 w-3" />
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${tier.color}`} />
                    <div>
                      <h3 className="font-semibold">{tier.name}</h3>
                      <p className="text-sm text-muted-foreground">{tier.price}/mes</p>
                    </div>
                  </div>

                  <ul className="space-y-1">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="text-xs flex items-start gap-1">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? 'Procesando...' : `Actualizar a ${tiers[selectedTier].name}`}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Serás redirigido a Stripe para completar el pago de forma segura
        </p>
      </div>
    </Modal>
  );
}

