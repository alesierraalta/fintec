'use client';

import { memo, useState } from 'react';
import dynamic from 'next/dynamic';
import { FormLoading } from '@/components/ui/suspense-loading';
import { useRouter } from 'next/navigation';
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Repeat,
  Sparkles,
} from 'lucide-react';
import { TransactionType } from '@/types';
import { useModal } from '@/hooks';

const TransactionForm = dynamic(
  () =>
    import('@/components/forms/transaction-form').then(
      (mod) => mod.TransactionForm
    ),
  { loading: () => <FormLoading />, ssr: false }
);

const ACTIONS_DATA = [
  {
    name: 'Registrar Ingreso',
    description: 'Añadir entrada de dinero',
    icon: ArrowDownLeft,
    type: 'INCOME' as TransactionType,
    action: 'modal',
    priority: 1,
    color: 'bg-primary/8 hover:bg-primary/15',
    iconColor: 'text-primary',
    borderColor: 'border-primary/15 hover:border-primary/25',
    shadowColor: 'hover:shadow-primary/10',
  },
  {
    name: 'Registrar Gasto',
    description: 'Añadir salida de dinero',
    icon: ArrowUpRight,
    type: 'EXPENSE' as TransactionType,
    action: 'modal',
    priority: 2,
    color:
      'bg-neutral-500/8 hover:bg-neutral-500/15 dark:bg-neutral-400/8 dark:hover:bg-neutral-400/15',
    iconColor: 'text-neutral-600 dark:text-neutral-400',
    borderColor:
      'border-neutral-500/15 hover:border-neutral-500/25 dark:border-neutral-400/15 dark:hover:border-neutral-400/25',
    shadowColor: 'hover:shadow-gray-500/10',
  },
  {
    name: 'Nueva Transacción',
    description: 'Acceso completo a formularios',
    icon: Plus,
    type: null,
    action: 'navigate',
    route: '/transactions/add',
    priority: 3,
    color: 'bg-primary/8 hover:bg-primary/15',
    iconColor: 'text-primary',
    borderColor: 'border-primary/15 hover:border-primary/25',
    shadowColor: 'hover:shadow-primary/10',
  },
  {
    name: 'Transferir',
    description: 'Mover entre cuentas',
    icon: ArrowRightLeft,
    type: null,
    action: 'navigate',
    route: '/transfers',
    priority: 4,
    color:
      'bg-neutral-500/8 hover:bg-neutral-500/15 dark:bg-neutral-400/8 dark:hover:bg-neutral-400/15',
    iconColor: 'text-neutral-600 dark:text-neutral-400',
    borderColor:
      'border-neutral-500/15 hover:border-neutral-500/25 dark:border-neutral-400/15 dark:hover:border-neutral-400/25',
    shadowColor: 'hover:shadow-neutral-500/10 dark:hover:shadow-neutral-400/10',
  },
];

export const QuickActions = memo(function QuickActions() {
  const router = useRouter();
  const { isOpen, openModal, closeModal } = useModal();
  const [selectedTransactionType, setSelectedTransactionType] =
    useState<TransactionType>(TransactionType.EXPENSE);

  const handleActionClick = (action: (typeof ACTIONS_DATA)[0]) => {
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
        {ACTIONS_DATA.sort((a, b) => a.priority - b.priority).map(
          (action, index) => (
            <button
              key={action.name}
              onClick={() => handleActionClick(action)}
              className={`group w-full rounded-2xl border p-4 backdrop-blur-xl ${action.color} ${action.borderColor} transition-ios text-left shadow-ios-sm hover:shadow-ios-md ${action.shadowColor} hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="flex items-center space-x-4">
                <div className="transition-ios rounded-xl border border-border/15 bg-card/40 p-3 shadow-ios-sm backdrop-blur-sm group-hover:border-border/25">
                  <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="transition-ios mb-0.5 text-ios-body font-semibold text-foreground group-hover:text-foreground">
                    {action.name}
                  </h3>
                  <p className="transition-ios text-ios-caption text-muted-foreground group-hover:text-muted-foreground/80">
                    {action.description}
                  </p>
                </div>
                <div className="transition-ios text-muted-foreground/60 group-hover:text-muted-foreground">
                  <ArrowRightLeft className="h-4 w-4 rotate-90" />
                </div>
              </div>
            </button>
          )
        )}
      </div>

      {isOpen && (
        <TransactionForm
          isOpen={isOpen}
          onClose={closeModal}
          type={selectedTransactionType}
        />
      )}
    </>
  );
});
