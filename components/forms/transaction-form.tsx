'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select, Modal } from '@/components/ui';
import { TransactionType } from '@/types';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import type { Transaction, Account, Category } from '@/types/domain';
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
  transaction?: Transaction | null;
  onSuccess?: () => void;
  type?: TransactionType;
}

const transactionTypes = [
  { value: 'INCOME', label: 'Ingreso', icon: ArrowDownLeft, color: 'text-green-500' },
  { value: 'EXPENSE', label: 'Gasto', icon: ArrowUpRight, color: 'text-red-500' },
  { value: 'TRANSFER_OUT', label: 'Transferencia', icon: Repeat, color: 'text-blue-500' },
];

export function TransactionForm({ isOpen, onClose, transaction, onSuccess, type = 'EXPENSE' }: TransactionFormProps) {
  const repository = useRepository();
  const { user } = useAuth();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState({
    type: transaction?.type || type,
    accountId: transaction?.accountId || '',
    categoryId: transaction?.categoryId || '',
    amount: transaction ? (transaction.amountMinor / 100).toString() : '',
    description: transaction?.description || '',
    date: transaction?.date || new Date().toISOString().split('T')[0],
    note: transaction?.note || '',
    tags: transaction?.tags?.join(', ') || '',
  });

  const [loading, setLoading] = useState(false);

  // Load accounts and categories
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        setLoadingData(true);
        const [userAccounts, allCategories] = await Promise.all([
          repository.accounts.findByUserId(user.id),
          repository.categories.findAll()
        ]);
        
        setAccounts(userAccounts.filter(acc => acc.active));
        setCategories(allCategories.filter(cat => cat.active));
      } catch (error) {
        console.error('Error loading form data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen, user, repository]);

  // Update form data when transaction changes
  useEffect(() => {
    if (transaction) {
      setFormData({
        type: transaction.type,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId || '',
        amount: (transaction.amountMinor / 100).toString(),
        description: transaction.description || '',
        date: transaction.date,
        note: transaction.note || '',
        tags: transaction.tags?.join(', ') || '',
      });
    } else {
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
    }
  }, [transaction, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Basic validation
    if (!formData.accountId || !formData.categoryId || !formData.amount || !formData.description) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor ingresa un monto válido');
      return;
    }

    setLoading(true);
    
    try {
      const transactionData = {
        type: formData.type as TransactionType,
        accountId: formData.accountId,
        categoryId: formData.categoryId,
        currencyCode: 'USD', // TODO: Get from selected account
        amountMinor: Math.round(amount * 100),
        date: formData.date,
        description: formData.description.trim(),
        note: formData.note?.trim() || undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
      };

      if (transaction) {
        // Update existing transaction
        await repository.transactions.update(transaction.id, transactionData);
      } else {
        // Create new transaction
        await repository.transactions.create(transactionData);
      }

      onSuccess?.();
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
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Error al guardar la transacción');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = transactionTypes.find(t => t.value === formData.type);

  // Transform data for Select components
  const accountOptions = accounts.map(account => ({
    value: account.id,
    label: `${account.name} (${account.currencyCode})`
  }));

  const categoryOptions = categories
    .filter(cat => !formData.type || cat.kind === formData.type)
    .map(category => ({
      value: category.id,
      label: category.name
    }));

  if (loadingData) {
    return (
      <Modal
        open={isOpen}
        onClose={onClose}
        title="Cargando..."
        size="md"
      >
        <div className="p-8 text-center">
          <p className="text-gray-400">Cargando datos...</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={transaction ? "Editar Transacción" : "Nueva Transacción"}
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
            options={accountOptions}
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
            options={categoryOptions}
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
