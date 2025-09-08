'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Repeat, Sparkles } from 'lucide-react';
import { TransactionForm } from '@/components/forms/transaction-form';
import { TransactionType } from '@/types';
import { useModal } from '@/hooks';



export function QuickActions() {
  const router = useRouter();
  const { isOpen, openModal, closeModal } = useModal();
  const [selectedTransactionType, setSelectedTransactionType] = useState<TransactionType>(TransactionType.EXPENSE);

  const actions = [
    {
      name: 'Registrar Ingreso',
      description: 'Añadir entrada de dinero',
      icon: ArrowDownLeft,
      type: 'INCOME' as TransactionType,
      action: 'modal',
      priority: 1,
      color: 'bg-primary/15 hover:bg-primary/25',
      iconColor: 'text-primary',
      borderColor: 'border-primary/25 hover:border-primary/40',
      shadowColor: 'hover:shadow-primary/10'
    },
    {
      name: 'Registrar Gasto',
      description: 'Añadir salida de dinero',
      icon: ArrowUpRight,
      type: 'EXPENSE' as TransactionType,
      action: 'modal',
      priority: 2,
      color: 'bg-neutral-500/15 hover:bg-neutral-500/25 dark:bg-neutral-400/15 dark:hover:bg-neutral-400/25',
      iconColor: 'text-neutral-600 dark:text-neutral-400',
      borderColor: 'border-neutral-500/25 hover:border-neutral-500/40 dark:border-neutral-400/25 dark:hover:border-neutral-400/40',
      shadowColor: 'hover:shadow-gray-500/10'
    },
    {
      name: 'Nueva Transacción',
      description: 'Acceso completo a formularios',
      icon: Plus,
      type: null,
      action: 'navigate',
      route: '/transactions/add',
      priority: 3,
      color: 'bg-primary/15 hover:bg-primary/25',
      iconColor: 'text-primary',
      borderColor: 'border-primary/25 hover:border-primary/40',
      shadowColor: 'hover:shadow-primary/10'
    },
    {
      name: 'Transferir',
      description: 'Mover entre cuentas',
      icon: ArrowRightLeft,
      type: null,
      action: 'navigate',
      route: '/transfers',
      priority: 4,
      color: 'bg-neutral-500/15 hover:bg-neutral-500/25 dark:bg-neutral-400/15 dark:hover:bg-neutral-400/25',
      iconColor: 'text-neutral-600 dark:text-neutral-400',
      borderColor: 'border-neutral-500/25 hover:border-neutral-500/40 dark:border-neutral-400/25 dark:hover:border-neutral-400/40',
      shadowColor: 'hover:shadow-neutral-500/10 dark:hover:shadow-neutral-400/10'
    },
  ];

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
      <div className="space-y-3">
        {actions
          .sort((a, b) => a.priority - b.priority)
          .map((action, index) => (
          <button
            key={action.name}
            onClick={() => handleActionClick(action)}
            className={`
              group w-full p-4 rounded-2xl border backdrop-blur-xl
              ${action.color} ${action.borderColor}
              transition-ios text-left shadow-ios-sm hover:shadow-ios-md ${action.shadowColor}
              hover:scale-[1.02] active:scale-[0.98]
            `}
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-card/40 backdrop-blur-sm border border-border/15 group-hover:border-border/25 transition-ios shadow-ios-xs">
                <action.icon className={`h-5 w-5 ${action.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-ios-body font-semibold text-foreground mb-0.5 group-hover:text-foreground transition-ios">
                  {action.name}
                </h3>
                <p className="text-ios-caption text-muted-foreground group-hover:text-muted-foreground/80 transition-ios">
                  {action.description}
                </p>
              </div>
              <div className="text-muted-foreground/60 group-hover:text-muted-foreground transition-ios">
                <ArrowRightLeft className="h-4 w-4 rotate-90" />
              </div>
            </div>
          </button>
        ))}
      </div>

      <TransactionForm
        isOpen={isOpen}
        onClose={closeModal}
        type={selectedTransactionType}
      />
    </>
  );
}