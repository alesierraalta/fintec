'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select, Modal } from '@/components/ui';
import { CategoryForm } from '@/components/forms/category-form';
import { DebtStatus, TransactionType } from '@/types';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { useModal } from '@/hooks';
import { useSubscription } from '@/hooks/use-subscription';
import { UpgradeModal } from '@/components/subscription/upgrade-modal';
import type {
  Transaction,
  Account,
  Category,
  CategoryKind,
} from '@/types/domain';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  Calendar,
  DollarSign,
  FileText,
  Tag,
  Plus,
} from 'lucide-react';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  onSuccess?: () => void;
  type?: TransactionType;
}

const transactionTypes = [
  {
    value: 'INCOME',
    label: 'Ingreso',
    icon: ArrowDownLeft,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
  },
  {
    value: 'EXPENSE',
    label: 'Gasto',
    icon: ArrowUpRight,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
  },
  {
    value: 'TRANSFER_OUT',
    label: 'Transferencia',
    icon: Repeat,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
];

export function TransactionForm({
  isOpen,
  onClose,
  transaction,
  onSuccess,
  type = TransactionType.EXPENSE,
}: TransactionFormProps) {
  const repository = useRepository();
  const { user } = useAuth();
  const {
    isOpen: isCategoryModalOpen,
    openModal: openCategoryModal,
    closeModal: closeCategoryModal,
  } = useModal();
  const { usageStatus, isAtLimit, tier } = useSubscription();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [formData, setFormData] = useState({
    type: transaction?.type || type,
    accountId: transaction?.accountId || '',
    categoryId: transaction?.categoryId || '',
    amount: transaction ? (transaction.amountMinor / 100).toString() : '',
    description: transaction?.description || '',
    date: transaction?.date || new Date().toISOString().split('T')[0],
    note: transaction?.note || '',
    tags: transaction?.tags?.join(', ') || '',
    isDebt: transaction?.isDebt === true,
    debtDirection: transaction?.debtDirection || '',
    debtStatus: transaction?.debtStatus || DebtStatus.OPEN,
    counterpartyName: transaction?.counterpartyName || '',
    settledAt: transaction?.settledAt
      ? transaction.settledAt.split('T')[0]
      : '',
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
          repository.categories.findAll(),
        ]);

        setAccounts(userAccounts.filter((acc) => acc.active));
        setCategories(allCategories.filter((cat) => cat.active));
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
        isDebt: transaction.isDebt === true,
        debtDirection: transaction.debtDirection || '',
        debtStatus: transaction.debtStatus || DebtStatus.OPEN,
        counterpartyName: transaction.counterpartyName || '',
        settledAt: transaction.settledAt
          ? transaction.settledAt.split('T')[0]
          : '',
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
        isDebt: false,
        debtDirection: '',
        debtStatus: DebtStatus.OPEN,
        counterpartyName: '',
        settledAt: '',
      });
    }
  }, [transaction, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check if user is at transaction limit (only for new transactions)
    if (!transaction && tier === 'free' && isAtLimit('transactions')) {
      setShowUpgradeModal(true);
      return;
    }

    // Basic validation
    if (!formData.accountId || !formData.categoryId || !formData.amount) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Por favor ingresa un monto valido');
      return;
    }

    const canShowDebtFields =
      formData.type === TransactionType.INCOME ||
      formData.type === TransactionType.EXPENSE;

    if (formData.isDebt && canShowDebtFields && !formData.debtDirection) {
      toast.error('Selecciona la direccion de la deuda');
      return;
    }

    if (
      formData.isDebt &&
      formData.debtStatus === DebtStatus.SETTLED &&
      !formData.settledAt
    ) {
      toast.error('Indica la fecha de liquidacion para deuda saldada');
      return;
    }

    setLoading(true);

    try {
      // Get selected account to determine currency
      const selectedAccount = accounts.find(
        (acc) => acc.id === formData.accountId
      );
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
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : undefined,
        isDebt: canShowDebtFields ? formData.isDebt : false,
        debtDirection:
          canShowDebtFields && formData.isDebt
            ? (formData.debtDirection as any)
            : undefined,
        debtStatus:
          canShowDebtFields && formData.isDebt
            ? formData.debtStatus || DebtStatus.OPEN
            : undefined,
        counterpartyName:
          canShowDebtFields && formData.isDebt
            ? formData.counterpartyName.trim() || undefined
            : undefined,
        settledAt:
          canShowDebtFields &&
          formData.isDebt &&
          formData.debtStatus === DebtStatus.SETTLED
            ? new Date(formData.settledAt).toISOString()
            : undefined,
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
        isDebt: false,
        debtDirection: '',
        debtStatus: DebtStatus.OPEN,
        counterpartyName: '',
        settledAt: '',
      });
    } catch (error) {
      toast.error('Error al guardar la transaccion');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = transactionTypes.find((t) => t.value === formData.type);

  // Transform data for Select components
  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: `${account.name} (${account.currencyCode})`,
  }));

  const categoryOptions = categories
    .filter((cat) => {
      if (!formData.type) return true;
      // Map TransactionType to CategoryKind
      if (formData.type === 'INCOME') return cat.kind === 'INCOME';
      if (formData.type === 'EXPENSE') return cat.kind === 'EXPENSE';
      // TRANSFER types can use either category kind
      return true;
    })
    .map((category) => ({
      value: category.id,
      label: category.name,
    }));

  const handleCategorySaved = async (createdCategory?: Category) => {
    // Reload categories after creating a new one
    if (!user) return;

    try {
      const allCategories = await repository.categories.findAll();
      setCategories(allCategories.filter((cat) => cat.active));

      // Auto-select the newly created category
      if (createdCategory) {
        setFormData((prev) => ({ ...prev, categoryId: createdCategory.id }));
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
      <Modal open={isOpen} onClose={onClose} title="Cargando..." size="md">
        <div className="rounded-2xl border border-border/20 bg-card/30 p-8 text-center backdrop-blur-sm">
          <div className="mx-auto mb-3 w-fit rounded-xl bg-muted/50 p-3 backdrop-blur-sm">
            <DollarSign className="mx-auto h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
          <p className="text-ios-body text-muted-foreground">
            Cargando datos...
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={transaction ? 'Editar Transacción' : 'Nueva Transacción'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* iOS-style Transaction Type */}
        <div>
          <label className="mb-3 block text-ios-caption font-medium uppercase tracking-wide text-muted-foreground">
            Tipo de Transacción
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {transactionTypes.map((typeOption) => {
              const Icon = typeOption.icon;
              const isSelected = formData.type === typeOption.value;

              return (
                <button
                  key={typeOption.value}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      type: typeOption.value as TransactionType,
                    })
                  }
                  className={`transition-ios rounded-2xl border p-4 backdrop-blur-sm hover:scale-[1.02] ${
                    isSelected
                      ? `${typeOption.borderColor} ${typeOption.bgColor} ${typeOption.color} shadow-ios-sm`
                      : 'border-border/20 bg-card/30 text-muted-foreground hover:border-border/30 hover:bg-card/50'
                  }`}
                >
                  <Icon className="mx-auto mb-2 h-6 w-6" />
                  <span className="text-ios-caption font-medium">
                    {typeOption.label}
                  </span>
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
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            icon={<DollarSign className="h-4 w-4" />}
            required
          />
        </div>

        {/* Account */}
        <div>
          <Select
            label="Cuenta"
            value={formData.accountId}
            onChange={(e) =>
              setFormData({ ...formData, accountId: e.target.value })
            }
            options={accountOptions}
            placeholder="Seleccionar cuenta"
            required
          />
        </div>

        {/* iOS-style Category */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <label className="block text-ios-caption font-medium uppercase tracking-wide text-muted-foreground">
              Categoría
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openCategoryModal}
              className="transition-ios rounded-xl border-blue-500/20 bg-blue-500/5 px-3 py-1.5 text-ios-caption text-blue-600 backdrop-blur-sm hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-700"
            >
              <Plus className="mr-1 h-3 w-3 flex-shrink-0" />
              <span className="whitespace-nowrap">Nueva Categoría</span>
            </Button>
          </div>
          <Select
            value={formData.categoryId}
            onChange={(e) =>
              setFormData({ ...formData, categoryId: e.target.value })
            }
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
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            icon={<FileText className="h-4 w-4" />}
            required
          />
        </div>

        {(formData.type === TransactionType.INCOME ||
          formData.type === TransactionType.EXPENSE) && (
          <div className="space-y-3 rounded-2xl border border-border/20 bg-card/30 p-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="transaction-is-debt"
                className="text-ios-body font-medium text-foreground"
              >
                Es deuda
              </label>
              <input
                id="transaction-is-debt"
                type="checkbox"
                checked={formData.isDebt}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isDebt: e.target.checked,
                    debtDirection: e.target.checked ? prev.debtDirection : '',
                    debtStatus: e.target.checked
                      ? prev.debtStatus
                      : DebtStatus.OPEN,
                    counterpartyName: e.target.checked
                      ? prev.counterpartyName
                      : '',
                    settledAt: e.target.checked ? prev.settledAt : '',
                  }))
                }
                className="h-5 w-5 rounded border-border/30 bg-card/60"
              />
            </div>

            {formData.isDebt && (
              <>
                <Select
                  label="Direccion"
                  value={formData.debtDirection}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      debtDirection: e.target.value as any,
                    })
                  }
                  options={[
                    { value: '', label: 'Seleccionar direccion' },
                    { value: 'OWE', label: 'Debo' },
                    { value: 'OWED_TO_ME', label: 'Me deben' },
                  ]}
                  required
                />

                <Select
                  label="Estado"
                  value={formData.debtStatus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      debtStatus: e.target.value as DebtStatus,
                      settledAt:
                        e.target.value === DebtStatus.SETTLED
                          ? formData.settledAt
                          : '',
                    })
                  }
                  options={[
                    { value: DebtStatus.OPEN, label: 'Abierta' },
                    { value: DebtStatus.SETTLED, label: 'Saldada' },
                  ]}
                />

                {formData.debtStatus === DebtStatus.SETTLED && (
                  <Input
                    label="Fecha de liquidacion"
                    type="date"
                    value={formData.settledAt}
                    onChange={(e) =>
                      setFormData({ ...formData, settledAt: e.target.value })
                    }
                    required
                  />
                )}

                <Input
                  label="Contraparte (Opcional)"
                  placeholder="Nombre de la persona o empresa"
                  value={formData.counterpartyName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      counterpartyName: e.target.value,
                    })
                  }
                />
              </>
            )}
          </div>
        )}

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
          <label className="mb-3 block text-ios-caption font-medium uppercase tracking-wide text-muted-foreground">
            Nota (Opcional)
          </label>
          <textarea
            placeholder="Información adicional..."
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            rows={3}
            className="transition-ios w-full resize-none rounded-2xl border border-border/20 bg-card/60 px-4 py-3 text-foreground placeholder-muted-foreground backdrop-blur-sm focus:border-blue-500/30 focus:ring-2 focus:ring-blue-500/20"
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
          <p className="mt-2 text-ios-caption text-muted-foreground">
            Separa las etiquetas con comas
          </p>
        </div>

        {/* iOS-style Actions */}
        <div className="flex flex-col justify-end space-y-3 border-t border-border/20 pt-6 sm:flex-row sm:space-x-3 sm:space-y-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="transition-ios rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm hover:bg-card/50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={loading}
            icon={
              selectedType?.icon && <selectedType.icon className="h-4 w-4" />
            }
            className="transition-ios rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 shadow-ios-sm hover:from-blue-700 hover:to-blue-800 hover:shadow-ios-md"
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

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        suggestedTier="base"
        reason="Has alcanzado tu límite de 500 transacciones mensuales. Actualiza a Base para transacciones ilimitadas."
      />
    </Modal>
  );
}
