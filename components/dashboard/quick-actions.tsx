'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Repeat, Sparkles } from 'lucide-react';
import { TransactionForm } from '@/components/forms/transaction-form';
import { TransactionType } from '@/types';
import { useModal } from '@/hooks';

const actions = [
  {
    name: 'Nueva Transacción',
    description: 'Experiencia completa',
    icon: Sparkles,
    color: 'bg-gradient-to-r from-accent-primary to-accent-secondary hover:from-accent-primary/80 hover:to-accent-secondary/80',
    type: null,
    action: 'navigate',
    route: '/transactions/add'
  },
  {
    name: 'Añadir Ingreso',
    description: 'Registrar rápido',
    icon: ArrowDownLeft,
    color: 'bg-green-600 hover:bg-green-700',
    type: 'INCOME' as TransactionType,
    action: 'modal'
  },
  {
    name: 'Añadir Gasto',
    description: 'Registrar rápido',
    icon: ArrowUpRight,
    color: 'bg-red-600 hover:bg-red-700',
    type: 'EXPENSE' as TransactionType,
    action: 'modal'
  },
  {
    name: 'Transferencia',
    description: 'Entre cuentas',
    icon: ArrowRightLeft,
    color: 'bg-blue-600 hover:bg-blue-700',
    type: null,
    action: 'navigate',
    route: '/transfers'
  },
];

export function QuickActions() {
  const router = useRouter();
  const { isOpen, openModal, closeModal } = useModal();
  const [selectedTransactionType, setSelectedTransactionType] = useState<TransactionType>(TransactionType.EXPENSE);

  const handleActionClick = (action: typeof actions[0]) => {
    if (action.action === 'navigate' && action.route) {
      router.push(action.route);
    } else if (action.action === 'modal' && action.type) {
      setSelectedTransactionType(action.type);
      openModal();
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action) => (
            <button
              key={action.name}
              onClick={() => handleActionClick(action)}
              className={`${action.color} p-4 rounded-lg transition-colors text-left hover:scale-105 transform`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <action.icon className="h-5 w-5 text-white flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{action.name}</p>
                  <p className="text-xs text-white/70 truncate">{action.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <TransactionForm
        isOpen={isOpen}
        onClose={closeModal}
        type={selectedTransactionType}
      />
    </>
  );
}
