'use client';

import { useState, useEffect, useMemo } from 'react';
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
} from '@/types/recurring-transactions';
import { getFrequencyLabel } from '@/types/recurring-transactions';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { useBinanceRates } from '@/hooks/use-binance-rates';
import { formatCurrencyWithBCV } from '@/lib/currency-ves';
import { BCVRates } from '@/components/currency/bcv-rates';
import { BinanceRatesComponent } from '@/components/currency/binance-rates';

export default function RecurringPage() {
  const [recurringTransactions, setRecurringTransactions] = useState<
    RecurringTransaction[]
  >([]);
  const [summary, setSummary] = useState<RecurringTransactionSummary | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [selectedFrequency, setSelectedFrequency] = useState<
    'weekly' | 'monthly' | 'yearly'
  >('monthly');
  const usdEquivalentType = useAppStore((s) => s.selectedRateSource);
  const bcvRates = useBCVRates();
  const { rates: binanceRates } = useBinanceRates();

  const frequencyOptions = [
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'yearly', label: 'Anual' },
  ];

  // Local rate options removed; header RateSelector is the single source

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get the current session token
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          return;
        }

        const response = await fetch('/api/recurring-transactions', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();

        if (result.success) {
          setRecurringTransactions(result.data.transactions);
          setSummary(result.data.summary);
        }
      } catch (error) {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      <div className="container mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Transacciones Recurrentes</h1>
            <p className="mt-2 text-muted-foreground">
              Gestiona tus ingresos y gastos que se repiten automáticamente
            </p>
          </div>
          <Button className="flex items-center gap-2">
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
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Crear Primera Recurrente
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recurringTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
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
                    <div className="flex items-center space-x-4">
                      <Badge
                        variant={transaction.isActive ? 'default' : 'outline'}
                      >
                        {transaction.isActive ? 'Activa' : 'Inactiva'}
                      </Badge>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${(transaction.amountMinor / 100).toFixed(2)}{' '}
                          {transaction.currencyCode}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Próxima:{' '}
                          {new Date(
                            transaction.nextExecutionDate
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
