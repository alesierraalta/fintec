'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select, Modal } from '@/components/ui';
import { CategoryForm } from '@/components/forms/category-form';
import { TransactionType } from '@/types';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { useModal } from '@/hooks';
import type { Transaction, Account, Category, CategoryKind } from '@/types/domain';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Repeat, 
  Calendar,
  DollarSign,
  FileText,
  Tag,
  Plus
} from 'lucide-react';
import { logger } from '@/lib/utils/logger';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  onSuccess?: () => void;
  type?: TransactionType;
}

const transactionTypes = [
  { value: 'INCOME', label: 'Ingreso', icon: ArrowDownLeft, color: 'text-green-600', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' },
  { value: 'EXPENSE', label: 'Gasto', icon: ArrowUpRight, color: 'text-red-600', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' },
  { value: 'TRANSFER_OUT', label: 'Transferencia', icon: Repeat, color: 'text-blue-600', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
];

export function TransactionForm({ isOpen, onClose, transaction, onSuccess, type = TransactionType.EXPENSE }: TransactionFormProps) {
  const repository = useRepository();
  const { user } = useAuth();
  const { isOpen: isCategoryModalOpen, openModal: openCategoryModal, closeModal: closeCategoryModal } = useModal();
  
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
    if (!formData.accountId || !formData.categoryId || !formData.amount) {
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
      // Get selected account to determine currency
      const selectedAccount = accounts.find(acc => acc.id === formData.accountId);
      const currencyCode = selectedAccount?.currencyCode || 'USD';

      const transactionData = {
        type: formData.type as TransactionType,
        accountId: formData.accountId,
        categoryId: formData.categoryId,
        currencyCode: currencyCode,
        amountMinor: Math.round(amount * 100),
        date: formData.date,
        description: formData.description.trim(),
        note: formData.note?.trim() || undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
      };

      if (transaction) {
        // Update existing transaction
        const updateData = { ...transactionData, id: transaction.id };
        await repository.transactions.update(transaction.id, updateData);
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
    .filter(cat => {
      if (!formData.type) return true;
      // Map TransactionType to CategoryKind
      if (formData.type === 'INCOME') return cat.kind === 'INCOME';
      if (formData.type === 'EXPENSE') return cat.kind === 'EXPENSE';
      // TRANSFER types can use either category kind
      return true;
    })
    .map(category => ({
      value: category.id,
      label: category.name
    }));

  const handleCategorySaved = async (createdCategory?: Category) => {
    // Reload categories after creating a new one
    if (!user) return;
    
    try {
      const allCategories = await repository.categories.findAll();
      setCategories(allCategories.filter(cat => cat.active));
      
      // Auto-select the newly created category
      if (createdCategory) {
        setFormData(prev => ({ ...prev, categoryId: createdCategory.id }));
      }
    } catch (error) {
      logger.error('Error reloading categories:', error);
    }
  };

  const getCategoryKindForTransaction = () => {
    // Map TransactionType to CategoryKind for new category creation
    if (formData.type === 'INCOME') return 'INCOME';
    if (formData.type === 'EXPENSE') return 'EXPENSE';
    return 'EXPENSE'; // Default fallback
  };

  if (loadingData) {
    return (
      <Modal
        open={isOpen}
        onClose={onClose}
        title="Cargando..."
        size="md"
      >
        <div className="p-8 text-center bg-card/30 backdrop-blur-sm rounded-2xl border border-border/20">
          <div className="bg-muted/50 backdrop-blur-sm rounded-xl p-3 w-fit mx-auto mb-3">
            <DollarSign className="h-8 w-8 text-muted-foreground mx-auto animate-pulse" />
          </div>
          <p className="text-ios-body text-muted-foreground">Cargando datos...</p>
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
        {/* iOS-style Transaction Type */}
        <div>
          <label className="block text-ios-caption font-medium text-muted-foreground mb-3 uppercase tracking-wide">
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
                  className={`p-4 rounded-2xl border backdrop-blur-sm transition-ios hover:scale-[1.02] ${
                    isSelected
                      ? `${typeOption.borderColor} ${typeOption.bgColor} ${typeOption.color} shadow-ios-sm`
                      : 'border-border/20 bg-card/30 text-muted-foreground hover:bg-card/50 hover:border-border/30'
                  }`}
                >
                  <Icon className="h-6 w-6 mx-auto mb-2" />
                  <span className="text-ios-caption font-medium">{typeOption.label}</span>
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

        {/* iOS-style Category */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-ios-caption font-medium text-muted-foreground uppercase tracking-wide">
              Categoría
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openCategoryModal}
              className="text-ios-caption text-blue-600 hover:text-blue-700 border-blue-500/20 hover:border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 px-3 py-1.5 rounded-xl backdrop-blur-sm transition-ios"
            >
              <Plus className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="whitespace-nowrap">Nueva Categoría</span>
            </Button>
          </div>
          <Select
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

        {/* iOS-style Note */}
        <div>
          <label className="block text-ios-caption font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            Nota (Opcional)
          </label>
          <textarea
            placeholder="Información adicional..."
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 bg-card/60 backdrop-blur-sm border border-border/20 rounded-2xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 resize-none transition-ios"
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
          <p className="text-ios-caption text-muted-foreground mt-2">
            Separa las etiquetas con comas
          </p>
        </div>

        {/* iOS-style Actions */}
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-border/20">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="bg-card/30 backdrop-blur-sm border border-border/20 hover:bg-card/50 transition-ios rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={loading}
            icon={selectedType?.icon && <selectedType.icon className="h-4 w-4" />}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-ios-sm hover:shadow-ios-md transition-ios rounded-xl"
          >
            {loading ? 'Guardando...' : 'Guardar Transacción'}
          </Button>
        </div>
      </form>

      {/* Category Creation Modal */}
      <CategoryForm
        isOpen={isCategoryModalOpen}
        onClose={closeCategoryModal}
        onSave={handleCategorySaved}
        category={null}
        parentCategoryId={null}
        defaultKind={getCategoryKindForTransaction() as CategoryKind}
      />
    </Modal>
  );
}
