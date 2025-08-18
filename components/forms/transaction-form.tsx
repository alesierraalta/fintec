'use client';

import { useState } from 'react';
import { Button, Input, Select, Modal } from '@/components/ui';
import { TransactionType } from '@/types';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Repeat, 
  Calendar,
  DollarSign,
  FileText,
  Tag
} from 'lucide-react';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  type?: TransactionType;
}

const transactionTypes = [
  { value: 'INCOME', label: 'Ingreso', icon: ArrowDownLeft, color: 'text-green-500' },
  { value: 'EXPENSE', label: 'Gasto', icon: ArrowUpRight, color: 'text-red-500' },
  { value: 'TRANSFER_OUT', label: 'Transferencia', icon: Repeat, color: 'text-blue-500' },
];

const accounts = [
  { value: 'acc1', label: 'Cuenta Principal' },
  { value: 'acc2', label: 'Tarjeta de Crédito' },
  { value: 'acc3', label: 'Cuenta de Ahorros' },
  { value: 'acc4', label: 'Efectivo' },
];

const categories = [
  { value: 'cat1', label: 'Alimentación' },
  { value: 'cat2', label: 'Transporte' },
  { value: 'cat3', label: 'Entretenimiento' },
  { value: 'cat4', label: 'Servicios' },
  { value: 'cat5', label: 'Salud' },
  { value: 'cat6', label: 'Salario' },
  { value: 'cat7', label: 'Freelance' },
];

export function TransactionForm({ isOpen, onClose, type = 'EXPENSE' }: TransactionFormProps) {
  const [formData, setFormData] = useState({
    type: type,
    accountId: '',
    categoryId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
    tags: '',
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simular guardado
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Transaction data:', formData);
    setLoading(false);
    onClose();
    
    // Reset form
    setFormData({
      type: type,
      accountId: '',
      categoryId: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      note: '',
      tags: '',
    });
  };

  const selectedType = transactionTypes.find(t => t.value === formData.type);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Nueva Transacción"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Tipo de Transacción
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {transactionTypes.map((typeOption) => {
              const Icon = typeOption.icon;
              const isSelected = formData.type === typeOption.value;
              
              return (
                <button
                  key={typeOption.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: typeOption.value as TransactionType })}
                  className={`p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-primary-600 bg-primary-600/10 text-primary-400'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mx-auto mb-2" />
                  <span className="text-xs font-medium">{typeOption.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount */}
        <div>
          <Input
            label="Monto"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            icon={<DollarSign className="h-4 w-4" />}
            required
          />
        </div>

        {/* Account */}
        <div>
          <Select
            label="Cuenta"
            value={formData.accountId}
            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
            options={accounts}
            placeholder="Seleccionar cuenta"
            required
          />
        </div>

        {/* Category */}
        <div>
          <Select
            label="Categoría"
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            options={categories}
            placeholder="Seleccionar categoría"
            required
          />
        </div>

        {/* Description */}
        <div>
          <Input
            label="Descripción"
            placeholder="Ej: Compra en supermercado"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            icon={<FileText className="h-4 w-4" />}
            required
          />
        </div>

        {/* Date */}
        <div>
          <Input
            label="Fecha"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            icon={<Calendar className="h-4 w-4" />}
            required
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nota (Opcional)
          </label>
          <textarea
            placeholder="Información adicional..."
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-600 focus:border-transparent resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <Input
            label="Etiquetas (Opcional)"
            placeholder="Ej: urgente, recurrente"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            icon={<Tag className="h-4 w-4" />}
          />
          <p className="text-xs text-gray-500 mt-1">
            Separa las etiquetas con comas
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-700">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={loading}
            icon={selectedType?.icon && <selectedType.icon className="h-4 w-4" />}
          >
            {loading ? 'Guardando...' : 'Guardar Transacción'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
