'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/money';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { useModal } from '@/hooks';
import { useDebtActions } from '@/hooks/use-debt-actions';
import { DebtDirection, DebtStatus, DebtSummary, Transaction } from '@/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { TransactionForm } from '@/components/forms/transaction-form';
import { CheckCircle, Pencil, Trash2, Plus, Loader2 } from 'lucide-react';

const EMPTY_SUMMARY: DebtSummary = {
  totalOweBaseMinor: 0,
  totalOwedToMeBaseMinor: 0,
  netDebtBaseMinor: 0,
  openCount: 0,
};

type DirectionFilter = DebtDirection | 'ALL';
type StatusFilter = DebtStatus | 'ALL';

export default function DebtsPageClient() {
  const repository = useRepository();
  const { user } = useAuth();
  const baseCurrency = (user as any)?.baseCurrency || 'USD';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DebtSummary>(EMPTY_SUMMARY);
  const [debts, setDebts] = useState<Transaction[]>([]);
  const [debtDirection, setDebtDirection] = useState<DirectionFilter>('ALL');
  const [debtStatus, setDebtStatus] = useState<StatusFilter>(DebtStatus.OPEN);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals
  const {
    isOpen: isSettleDialogOpen,
    openModal: openSettleDialog,
    closeModal: closeSettleDialog,
  } = useModal();
  const {
    isOpen: isDeleteDialogOpen,
    openModal: openDeleteDialog,
    closeModal: closeDeleteDialog,
  } = useModal();
  const {
    isOpen: isCreateModalOpen,
    openModal: openCreateModal,
    closeModal: closeCreateModal,
  } = useModal();
  const {
    isOpen: isEditModalOpen,
    openModal: openEditModal,
    closeModal: closeEditModal,
  } = useModal();

  // Selected debt for actions
  const [selectedDebt, setSelectedDebt] = useState<Transaction | null>(null);

  const loadDebts = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const summaryFilters = {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };

      const debtFilters = {
        ...summaryFilters,
        debtDirection: debtDirection === 'ALL' ? undefined : debtDirection,
        debtStatus: debtStatus === 'ALL' ? undefined : debtStatus,
      };

      const [nextSummary, debtsPage] = await Promise.all([
        repository.transactions.getDebtSummary(summaryFilters),
        repository.transactions.findDebts(debtFilters, {
          page: 1,
          limit: 100,
          sortBy: 'date',
          sortOrder: 'desc',
        }),
      ]);

      setSummary(nextSummary);
      setDebts(debtsPage.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudieron cargar las deudas'
      );
    } finally {
      setLoading(false);
    }
  }, [repository, user?.id, dateFrom, dateTo, debtDirection, debtStatus]);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  // Debt actions hook (must be after loadDebts)
  const debtActions = useDebtActions({
    repository,
    onSuccess: loadDebts,
  });

  // Action handlers
  const handleSettleClick = useCallback(
    (debt: Transaction) => {
      setSelectedDebt(debt);
      openSettleDialog();
    },
    [openSettleDialog]
  );

  const handleSettleConfirm = useCallback(async () => {
    if (!selectedDebt) return;
    await debtActions.settleDebt(selectedDebt);
    closeSettleDialog();
    setSelectedDebt(null);
  }, [selectedDebt, debtActions, closeSettleDialog]);

  const handleDeleteClick = useCallback(
    (debt: Transaction) => {
      setSelectedDebt(debt);
      openDeleteDialog();
    },
    [openDeleteDialog]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedDebt) return;
    await debtActions.deleteDebt(selectedDebt);
    closeDeleteDialog();
    setSelectedDebt(null);
  }, [selectedDebt, debtActions, closeDeleteDialog]);

  const handleEditClick = useCallback(
    (debt: Transaction) => {
      setSelectedDebt(debt);
      openEditModal();
    },
    [openEditModal]
  );

  const handleCreateSuccess = useCallback(() => {
    closeCreateModal();
    loadDebts();
  }, [closeCreateModal, loadDebts]);

  const handleEditSuccess = useCallback(() => {
    closeEditModal();
    setSelectedDebt(null);
    loadDebts();
  }, [closeEditModal, loadDebts]);

  const netLabel = useMemo(() => {
    if (summary.netDebtBaseMinor > 0) {
      return 'Te deben mas de lo que debes';
    }

    if (summary.netDebtBaseMinor < 0) {
      return 'Debes mas de lo que te deben';
    }

    return 'Balance de deudas en equilibrio';
  }, [summary.netDebtBaseMinor]);

  return (
    <div className="space-y-6 p-4 pb-24 md:p-6">
      <div className="rounded-2xl border border-border-primary bg-background-elevated p-4">
        <h1 className="text-2xl font-semibold text-text-primary">Deudas</h1>
        <p className="mt-1 text-sm text-text-muted">
          Seguimiento de cuanto debes y cuanto te deben.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border-primary bg-background-elevated p-4">
          <p className="text-sm text-text-muted">Cuanto debo</p>
          <p className="mt-2 text-2xl font-semibold text-red-500">
            {formatCurrency(summary.totalOweBaseMinor, baseCurrency)}
          </p>
        </div>

        <div className="rounded-2xl border border-border-primary bg-background-elevated p-4">
          <p className="text-sm text-text-muted">Cuanto me deben</p>
          <p className="mt-2 text-2xl font-semibold text-green-500">
            {formatCurrency(summary.totalOwedToMeBaseMinor, baseCurrency)}
          </p>
        </div>

        <div className="rounded-2xl border border-border-primary bg-background-elevated p-4">
          <p className="text-sm text-text-muted">Neto de deuda</p>
          <p
            className={`mt-2 text-2xl font-semibold ${summary.netDebtBaseMinor >= 0 ? 'text-green-500' : 'text-red-500'}`}
          >
            {formatCurrency(summary.netDebtBaseMinor, baseCurrency)}
          </p>
          <p className="mt-1 text-xs text-text-muted">{netLabel}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border-primary bg-background-elevated p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <label className="text-sm text-text-muted">
            Direccion
            <select
              value={debtDirection}
              onChange={(event) =>
                setDebtDirection(event.target.value as DirectionFilter)
              }
              className="mt-1 w-full rounded-lg border border-border-secondary bg-background px-3 py-2 text-sm text-text-primary"
            >
              <option value="ALL">Todas</option>
              <option value={DebtDirection.OWE}>Debo</option>
              <option value={DebtDirection.OWED_TO_ME}>Me deben</option>
            </select>
          </label>

          <label className="text-sm text-text-muted">
            Estado
            <select
              value={debtStatus}
              onChange={(event) =>
                setDebtStatus(event.target.value as StatusFilter)
              }
              className="mt-1 w-full rounded-lg border border-border-secondary bg-background px-3 py-2 text-sm text-text-primary"
            >
              <option value="ALL">Todos</option>
              <option value={DebtStatus.OPEN}>Abierta</option>
              <option value={DebtStatus.SETTLED}>Saldada</option>
            </select>
          </label>

          <label className="text-sm text-text-muted">
            Desde
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border-secondary bg-background px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <label className="text-sm text-text-muted">
            Hasta
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border-secondary bg-background px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDebtDirection('ALL');
                setDebtStatus(DebtStatus.OPEN);
                setDateFrom('');
                setDateTo('');
              }}
              className="w-full rounded-lg border border-border-secondary px-3 py-2 text-sm text-text-muted hover:text-text-primary"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border-primary bg-background-elevated p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Listado</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">
              {summary.openCount} deudas abiertas
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedDebt(null);
                openCreateModal();
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
              aria-label="Crear nueva deuda"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva Deuda
            </button>
          </div>
        </div>

        {loading && (
          <p className="text-sm text-text-muted">Cargando deudas...</p>
        )}

        {!loading && error && (
          <div className="space-y-2">
            <p className="text-sm text-red-500">{error}</p>
            <button
              type="button"
              onClick={loadDebts}
              className="text-sm text-text-muted underline hover:text-text-primary"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && debts.length === 0 && (
          <p className="text-sm text-text-muted">
            No hay deudas para este filtro.
          </p>
        )}

        {!loading && !error && debts.length > 0 && (
          <div className="space-y-3">
            {debts.map((debt) => (
              <div
                key={debt.id}
                className="rounded-xl border border-border-secondary bg-background p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-text-primary">
                    {debt.description || 'Sin descripcion'}
                  </p>
                  <p className="font-semibold text-text-primary">
                    {formatCurrency(debt.amountMinor || 0, debt.currencyCode)}
                  </p>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <span>
                    {debt.debtDirection === DebtDirection.OWE
                      ? 'Debo'
                      : 'Me deben'}
                  </span>
                  <span>•</span>
                  <span>
                    {debt.debtStatus === DebtStatus.SETTLED
                      ? 'Saldada'
                      : 'Abierta'}
                  </span>
                  <span>•</span>
                  <span>{debt.date.split('T')[0]}</span>
                  {debt.counterpartyName && (
                    <>
                      <span>•</span>
                      <span>{debt.counterpartyName}</span>
                    </>
                  )}
                  {debt.debtStatus === DebtStatus.SETTLED && debt.settledAt && (
                    <>
                      <span>•</span>
                      <span>Saldada el {debt.settledAt.split('T')[0]}</span>
                    </>
                  )}
                </div>

                {/* Action buttons */}
                <div className="mt-3 flex items-center gap-2 border-t border-border-secondary pt-3">
                  {debt.debtStatus === DebtStatus.OPEN && (
                    <button
                      type="button"
                      onClick={() => handleSettleClick(debt)}
                      disabled={debtActions.settlingId === debt.id}
                      aria-label={`Saldar deuda: ${debt.description || 'Sin descripcion'}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-green-600/10 px-2.5 py-1.5 text-xs font-medium text-green-600 hover:bg-green-600/20 disabled:opacity-50"
                    >
                      {debtActions.settlingId === debt.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3.5 w-3.5" />
                      )}
                      Saldar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleEditClick(debt)}
                    aria-label={`Editar deuda: ${debt.description || 'Sin descripcion'}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600/10 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-600/20"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(debt)}
                    disabled={debtActions.deletingId === debt.id}
                    aria-label={`Eliminar deuda: ${debt.description || 'Sin descripcion'}`}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-600/10 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-600/20 disabled:opacity-50"
                  >
                    {debtActions.deletingId === debt.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settle Confirmation Dialog */}
      <AlertDialog open={isSettleDialogOpen} onOpenChange={closeSettleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar liquidacion</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedDebt && (
                <>
                  Estas seguro que deseas saldar la deuda{' '}
                  <strong>
                    {selectedDebt.description || 'sin descripcion'}
                  </strong>{' '}
                  por{' '}
                  <strong>
                    {formatCurrency(
                      selectedDebt.amountMinor || 0,
                      selectedDebt.currencyCode
                    )}
                  </strong>
                  {selectedDebt.counterpartyName && (
                    <>
                      {' '}
                      con <strong>{selectedDebt.counterpartyName}</strong>
                    </>
                  )}
                  ?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSettleConfirm}>
              {debtActions.settlingId === selectedDebt?.id ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Saldando...
                </>
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={closeDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar deuda</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedDebt && (
                <>
                  Estas seguro que deseas eliminar la deuda{' '}
                  <strong>
                    {selectedDebt.description || 'sin descripcion'}
                  </strong>{' '}
                  por{' '}
                  <strong>
                    {formatCurrency(
                      selectedDebt.amountMinor || 0,
                      selectedDebt.currencyCode
                    )}
                  </strong>
                  ? Esta accion no se puede deshacer y afectara el balance de la
                  cuenta asociada.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              {debtActions.deletingId === selectedDebt?.id ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Debt Modal */}
      <TransactionForm
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onSuccess={handleCreateSuccess}
        debtMode="create"
      />

      {/* Edit Debt Modal */}
      <TransactionForm
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        transaction={selectedDebt}
        onSuccess={handleEditSuccess}
        debtMode="edit"
      />
    </div>
  );
}
