'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Repeat, Sparkles } from 'lucide-react';
import { TransactionForm } from '@/components/forms/transaction-form';
import { TransactionType } from '@/types';
import { useModal } from '@/hooks';

const actions = [
  {
    name: '💰 ¡Registrar Ingreso!',
    description: '¡Celebra cada peso que ganas!',
    subtitle: '+$0 → Progreso inmediato',
    icon: ArrowDownLeft,
    color: 'bg-gradient-to-br from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-600 hover:via-green-600 hover:to-emerald-700',
    shadowColor: 'hover:shadow-emerald-500/25',
    type: 'INCOME' as TransactionType,
    action: 'modal',
    priority: 1
  },
  {
    name: '🎯 Controlar Gasto',
    description: '¡Toma el control ahora!',
    subtitle: 'Cada registro = más claridad',
    icon: ArrowUpRight,
    color: 'bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-600 hover:from-blue-700 hover:via-blue-600 hover:to-cyan-700',
    shadowColor: 'hover:shadow-blue-500/25',
    type: 'EXPENSE' as TransactionType,
    action: 'modal',
    priority: 2
  },
  {
    name: '🚀 Nueva Experiencia',
    description: '¡Potencia tu gestión!',
    subtitle: 'Desbloquea todas las funciones',
    icon: Sparkles,
    color: 'bg-gradient-to-br from-purple-600 via-indigo-500 to-purple-700 hover:from-purple-700 hover:via-indigo-600 hover:to-purple-800',
    shadowColor: 'hover:shadow-purple-500/25',
    type: null,
    action: 'navigate',
    route: '/transactions/add',
    priority: 3
  },
  {
    name: '⚡ Transferir Dinero',
    description: '¡Mueve tu dinero al instante!',
    subtitle: 'Entre cuentas sin complicaciones',
    icon: ArrowRightLeft,
    color: 'bg-gradient-to-br from-cyan-600 via-teal-500 to-cyan-700 hover:from-cyan-700 hover:via-teal-600 hover:to-cyan-800',
    shadowColor: 'hover:shadow-cyan-500/25',
    type: null,
    action: 'navigate',
    route: '/transfers',
    priority: 4
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
      {/* Psychological Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-full px-4 py-2 border border-green-500/20 mb-2">
          <Sparkles className="h-4 w-4 text-green-400" />
          <span className="text-sm font-medium text-green-400">¡Tu momento de brillar!</span>
        </div>
        <p className="text-xs text-text-muted">Cada acción te acerca más a tus metas</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {actions
            .sort((a, b) => a.priority - b.priority)
            .map((action, index) => (
            <button
              key={action.name}
              onClick={() => handleActionClick(action)}
              className={`
                group relative ${action.color} ${action.shadowColor} 
                p-5 rounded-2xl transition-all duration-300 text-left 
                hover:scale-[1.02] hover:shadow-xl transform
                border border-white/20 hover:border-white/30
                ${index === 0 ? 'ring-2 ring-green-400/30 shadow-green-500/20' : ''}
                w-full
              `}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-4 flex-1 min-w-0 pr-3">
                  <div className="p-3 bg-white/20 rounded-2xl group-hover:bg-white/30 transition-colors flex-shrink-0">
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white mb-1 group-hover:text-yellow-100 transition-colors">
                      {action.name}
                    </h3>
                    <p className="text-xs text-white/80 group-hover:text-white/90 transition-colors">
                      {action.description}
                    </p>
                  </div>
                </div>
                
                {/* Priority indicator for first action - Now properly positioned */}
                {index === 0 && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-full px-2 py-1 flex-shrink-0">
                    <span className="text-xs font-bold text-white">¡TOP!</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/70 italic flex-1 min-w-0 pr-2">
                  {action.subtitle}
                </p>
                <div className="flex items-center space-x-1 text-white/80 group-hover:text-white transition-all flex-shrink-0">
                  <span className="text-xs font-medium">¡Hazlo ya!</span>
                  <Plus className="h-3 w-3" />
                </div>
              </div>
              
              {/* Simplified hover effect */}
              <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
            </button>
          ))}
        </div>
        
        {/* Motivational Footer */}
        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20">
          <div className="text-center">
            <Sparkles className="h-5 w-5 text-yellow-500 mx-auto mb-2" />
            <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
              🔥 ¡Cada registro suma puntos hacia tu libertad financiera!
            </p>
          </div>
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
