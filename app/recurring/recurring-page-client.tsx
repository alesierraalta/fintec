'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { MainLayout } from '@/components/layout/main-layout';
import {
  Plus,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { supabase } from '@/repositories/supabase/client';
import {
  RecurringTransaction,
  RecurringTransactionSummary,
  UpdateRecurringTransactionDTO,
} from '@/types/recurring-transactions';
import { getFrequencyLabel } from '@/types/recurring-transactions';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import { toast } from 'sonner';
import { RecurringRowActionsMenu } from '@/components/recurring/recurring-row-actions-menu';
import { RecurringEditDialog } from '@/components/recurring/recurring-edit-dialog';
import { RecurringDeleteDialog } from '@/components/recurring/recurring-delete-dialog';

export default function RecurringPage() {
  const [recurringTransactions, setRecurringTransactions] = useState<
    RecurringTransaction[]
  >([]);
  const [summary, setSummary] = useState<RecurringTransactionSummary | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<RecurringTransaction | null>(null);
  const [activeRowMutation, setActiveRowMutation] = useState<{
    id: string;
    type: 'edit' | 'delete';
  } | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<
    'weekly' | 'monthly' | 'yearly'
  >('monthly');
  const usdEquivalentType = useAppStore((s) => s.selectedRateSource);
  const shouldFetchBinanceRates = usdEquivalentType === 'binance';
  const shouldFetchBcvRates = !shouldFetchBinanceRates;
  const bcvRates = useBCVRates({ enabled: shouldFetchBcvRates });
  const { rates: binanceRates } = useBinanceRates({
    enabled: shouldFetchBinanceRates,
  });

  const frequencyOptions = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'yearly', label: 'Anual' },
  ];

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }, []);

  const extractErrorMessage = useCallback(
    (responseBody: any, fallback: string): string => {
      if (responseBody?.error && typeof responseBody.error === 'string') {
        return responseBody.error;
      }

      if (
        Array.isArray(responseBody?.details) &&
        responseBody.details.length > 0 &&
        responseBody.details[0]?.message
      ) {
        return responseBody.details[0].message;
      }

      return fallback;
    },
    []
  );

  const refreshRecurringData = useCallback(async () => {
    try {
      const token = await getAccessToken();

      if (!token) {
        setRecurringTransactions([]);
        setSummary(null);
        return;
      }

      const response = await fetch('/api/recurring-transactions', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          extractErrorMessage(result, 'No se pudo cargar la data')
        );
      }

      setRecurringTransactions(result.data.transactions);
      setSummary(result.data.summary);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al cargar transacciones recurrentes'
      );
    }
  }, [extractErrorMessage, getAccessToken]);

  useEffect(() => {
    const initializePage = async () => {
      try {
        setLoading(true);
        await refreshRecurringData();
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [refreshRecurringData]);

  // Helper function to get frequency multiplier
  const getFrequencyMultiplier = (
    transactionFrequency: string,
    selectedFrequency: string
  ): number => {
    const frequencyMap: { [key: string]: number } = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      yearly: 365,
    };

    const transactionDays = frequencyMap[transactionFrequency] || 30;
    const selectedDays = frequencyMap[selectedFrequency] || 30;

    return selectedDays / transactionDays;
  };

  // Helper function to convert USD to BS based on selected rate
  const convertToBS = useMemo(() => {
    return (amountUSD: number): number => {
      if (usdEquivalentType === 'binance') {
        return amountUSD * (binanceRates?.usdt_ves || 1);
      } else if (usdEquivalentType === 'bcv_usd') {
        return amountUSD * (bcvRates?.usd || 1);
      } else {
        return amountUSD * (bcvRates?.eur || 1);
      }
    };
  }, [usdEquivalentType, binanceRates?.usdt_ves, bcvRates?.usd, bcvRates?.eur]);

  // Calculate totals based on selected frequency
  const calculateTotals = useMemo(() => {
    let incomeUSD = 0;
    let expensesUSD = 0;

    recurringTransactions.forEach((transaction) => {
      if (!transaction.isActive) return;

      const amountInMajor = transaction.amountMinor / 100;
      const frequencyMultiplier = getFrequencyMultiplier(
        transaction.frequency,
        selectedFrequency
      );
      const total = amountInMajor * frequencyMultiplier;

      if (transaction.type === 'INCOME') {
        incomeUSD += total;
      } else {
        expensesUSD += total;
      }
    });

    const incomeBS = convertToBS(incomeUSD);
    const expensesBS = convertToBS(expensesUSD);
    const netUSD = incomeUSD - expensesUSD;
    const netBS = incomeBS - expensesBS;

    return {
      incomeUSD,
      expensesUSD,
      incomeBS,
      expensesBS,
      netUSD,
      netBS,
    };
  }, [recurringTransactions, selectedFrequency, convertToBS]);

  const handleOpenEditDialog = useCallback(
    (transaction: RecurringTransaction) => {
      setSelectedTransaction(transaction);
      setEditDialogOpen(true);
    },
    []
  );

  const handleOpenDeleteDialog = useCallback(
    (transaction: RecurringTransaction) => {
      setSelectedTransaction(transaction);
      setDeleteDialogOpen(true);
    },
    []
  );

  const handleEditRecurringTransaction = useCallback(
    async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateRecurringTransactionDTO;
    }) => {
      setActiveRowMutation({ id, type: 'edit' });

      try {
        const token = await getAccessToken();
        if (!token) {
          throw new Error('No autenticado');
        }

        const response = await fetch('/api/recurring-transactions', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id, ...data }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            extractErrorMessage(result, 'No se pudo actualizar la transaccion')
          );
        }

        toast.success('Transaccion recurrente actualizada');
        setEditDialogOpen(false);
        setSelectedTransaction(null);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Error al actualizar la transaccion recurrente'
        );
      } finally {
        await refreshRecurringData();
        setActiveRowMutation(null);
      }
    },
    [extractErrorMessage, getAccessToken, refreshRecurringData]
  );

  const handleDeleteRecurringTransaction = useCallback(
    async (id: string) => {
      setActiveRowMutation({ id, type: 'delete' });

      try {
        const token = await getAccessToken();
        if (!token) {
          throw new Error('No autenticado');
        }

        const response = await fetch(
          `/api/recurring-transactions?id=${encodeURIComponent(id)}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            extractErrorMessage(result, 'No se pudo eliminar la transaccion')
          );
        }

        toast.success('Transaccion recurrente eliminada');
        setDeleteDialogOpen(false);
        setSelectedTransaction(null);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Error al eliminar la transaccion recurrente'
        );
      } finally {
        await refreshRecurringData();
        setActiveRowMutation(null);
      }
    },
    [extractErrorMessage, getAccessToken, refreshRecurringData]
  );

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="flex h-64 items-center justify-center">
            <div className="text-lg text-muted-foreground">
              Cargando transacciones recurrentes...
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto space-y-6 p-4 pb-safe-bottom sm:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Transacciones Recurrentes</h1>
            <p className="mt-2 text-muted-foreground">
              Gestiona tus ingresos y gastos que se repiten automáticamente
            </p>
          </div>
          <Button className="flex min-h-[44px] items-center gap-2 self-start">
            <Plus className="h-4 w-4" />
            Nueva Recurrente
          </Button>
        </div>

        {/* Frequency Selector and Totals */}
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Frequency and Rate Selectors */}
          <div className="flex flex-col gap-4 lg:w-96 lg:flex-row">
            <div className="lg:w-48">
              <Select
                label="Frecuencia de resumen"
                value={selectedFrequency}
                onChange={(e) =>
                  setSelectedFrequency(
                    e.target.value as 'weekly' | 'monthly' | 'yearly'
                  )
                }
                options={frequencyOptions}
                placeholder="Selecciona frecuencia"
              />
            </div>
            {/* Rate selector removed; uses global header RateSelector */}
          </div>

          {/* Total Income and Expenses */}
          <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                  Total Ingresos Recurrentes
                </CardTitle>
                <ArrowUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  ${calculateTotals.incomeUSD.toFixed(2)}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  Bs.{' '}
                  {calculateTotals.incomeBS.toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {selectedFrequency === 'weekly'
                    ? 'Por semana'
                    : selectedFrequency === 'monthly'
                      ? 'Por mes'
                      : 'Por año'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
                  Total Gastos Recurrentes
                </CardTitle>
                <ArrowDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                  ${calculateTotals.expensesUSD.toFixed(2)}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">
                  Bs.{' '}
                  {calculateTotals.expensesBS.toLocaleString('es-VE', {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {selectedFrequency === 'weekly'
                    ? 'Por semana'
                    : selectedFrequency === 'monthly'
                      ? 'Por mes'
                      : 'Por año'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Net Balance Card */}
        <div className="mt-6">
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Balance Neto Recurrente
              </CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                ${calculateTotals.netUSD.toFixed(2)}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                Bs.{' '}
                {calculateTotals.netBS.toLocaleString('es-VE', {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {selectedFrequency === 'weekly'
                  ? 'Por semana'
                  : selectedFrequency === 'monthly'
                    ? 'Por mes'
                    : 'Por año'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Activas</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalActive}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Próximas</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.nextExecutions.thisWeek}
                </div>
                <p className="text-xs text-muted-foreground">Esta semana</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hoy</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.nextExecutions.today}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.nextExecutions.thisMonth}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recurring Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Transacciones Recurrentes</CardTitle>
            <CardDescription>
              Lista de todas tus transacciones que se repiten automáticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recurringTransactions.length === 0 ? (
              <div className="py-8 text-center">
                <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">
                  No hay transacciones recurrentes
                </h3>
                <p className="mb-4 text-muted-foreground">
                  Crea tu primera transacción recurrente para automatizar tus
                  finanzas
                </p>
                <Button className="flex min-h-[44px] items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Crear Primera Recurrente
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recurringTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex flex-col gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            transaction.type === 'INCOME'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          <DollarSign className="h-5 w-5" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold">{transaction.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {getFrequencyLabel(transaction.frequency)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
                      <Badge
                        variant={transaction.isActive ? 'default' : 'outline'}
                      >
                        {transaction.isActive ? 'Activa' : 'Inactiva'}
                      </Badge>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${(transaction.amountMinor / 100).toFixed(2)}{' '}
                          {transaction.currencyCode}
                          {activeRowMutation?.id === transaction.id && (
                            <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border border-current border-t-transparent align-middle" />
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Próxima:{' '}
                          {new Date(
                            transaction.nextExecutionDate
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <RecurringRowActionsMenu
                        transactionId={transaction.id}
                        transactionName={transaction.name}
                        onEdit={() => handleOpenEditDialog(transaction)}
                        onDelete={() => handleOpenDeleteDialog(transaction)}
                        disabled={Boolean(
                          activeRowMutation &&
                            activeRowMutation.id !== transaction.id
                        )}
                        loading={activeRowMutation?.id === transaction.id}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <RecurringEditDialog
          open={editDialogOpen}
          transaction={selectedTransaction}
          isSubmitting={activeRowMutation?.type === 'edit'}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) {
              setSelectedTransaction(null);
            }
          }}
          onSubmit={handleEditRecurringTransaction}
        />

        <RecurringDeleteDialog
          open={deleteDialogOpen}
          transaction={selectedTransaction}
          isDeleting={activeRowMutation?.type === 'delete'}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) {
              setSelectedTransaction(null);
            }
          }}
          onConfirmDelete={handleDeleteRecurringTransaction}
        />
      </div>
    </MainLayout>
  );
}
