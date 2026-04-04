'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  FileText,
  Tag,
  Plus,
  Minus,
  Check,
  X,
  CreditCard,
  Wallet,
  Building2,
  Utensils,
  Car,
  ShoppingBag,
  Music,
  Stethoscope,
  Home,
  Book,
  Dumbbell,
  Plane,
  Smartphone,
  Banknote,
  Heart,
  Zap,
  Receipt,
  Briefcase,
  Coffee,
  TrendingUp,
  Gift,
  Star,
  Repeat,
  PiggyBank,
} from 'lucide-react';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { useModal } from '@/hooks';
import { CreateTransactionDTO, DebtStatus, TransactionType } from '@/types';
import {
  TransactionFormSchema,
  TransactionFormType,
} from '@/lib/validations/schemas';
import { dateUtils } from '@/lib/dates/dayjs';
import { calculate_next_execution_date } from '@/lib/dates/recurring';
import { motion } from 'framer-motion';
import { cardVariants, buttonVariants, fieldVariants } from '@/lib/animations';
import { useFormShortcuts } from '@/lib/hotkeys';
import { useNotifications } from '@/lib/store';
import { CategoryForm } from '@/components/forms/category-form';
import type { Category, Account } from '@/types/domain';
import { logger } from '@/lib/utils/logger';
import { CURRENCIES } from '@/lib/money';
import { useActiveUsdVesRate } from '@/lib/rates';
import { useAppStore } from '@/lib/store';
import { evaluateCalculatorExpression } from '@/lib/utils/evaluate-calculator-expression';

// Data constants (same as mobile)
const transactionTypes = [
  {
    value: 'EXPENSE',
    label: 'Gasto',
    icon: Minus,
    color: 'from-red-500 to-pink-600',
    emoji: '💸',
  },
  {
    value: 'INCOME',
    label: 'Ingreso',
    icon: Plus,
    color: 'from-green-500 to-emerald-600',
    emoji: '💰',
  },
  {
    value: 'TRANSFER_OUT',
    label: 'Transferencia',
    icon: Repeat,
    color: 'from-blue-500 to-cyan-600',
    emoji: '🔄',
  },
];

// Accounts are now loaded from database

// Categories are now loaded from database

export function DesktopAddTransaction() {
  const router = useRouter();
  const repository = useRepository();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const {
    isOpen: isCategoryModalOpen,
    openModal: openCategoryModal,
    closeModal: closeCategoryModal,
  } = useModal();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState({
    type: '' as TransactionType | '',
    accountId: '',
    categoryId: '',
    amount: '',
    description: '',
    date: '',
    note: '',
    tags: '',
    isDebt: false,
    debtDirection: '' as 'OWE' | 'OWED_TO_ME' | '',
    debtStatus: DebtStatus.OPEN as DebtStatus,
    counterpartyName: '',
    settledAt: '',
    isRecurring: false,
    frequency: 'monthly' as 'weekly' | 'monthly' | 'yearly',
    endDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [animateSuccess, setAnimateSuccess] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState('0');
  const activeUsdVes = useActiveUsdVesRate();
  const selectedRateSource = useAppStore((s) => s.selectedRateSource);

  // Load categories and accounts from database
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setError('Usuario no autenticado');
        setLoadingCategories(false);
        setLoadingAccounts(false);
        return;
      }

      try {
        // Load categories
        setLoadingCategories(true);
        const allCategories = await repository.categories.findAll();
        setCategories(allCategories.filter((cat) => cat.active));
        setLoadingCategories(false);

        // Load user accounts
        setLoadingAccounts(true);
        const userAccounts = await repository.accounts.findByUserId(user.id);
        setAccounts(userAccounts.filter((acc) => acc.active));
        setLoadingAccounts(false);
      } catch (err) {
        setError('Error al cargar los datos');
        setLoadingCategories(false);
        setLoadingAccounts(false);
      }
    };

    loadData();
  }, [repository, user]);

  // Helper function to get categories by type
  const getCategoriesByType = (type: TransactionType) => {
    // Map TransactionType to CategoryKind
    if (type === 'INCOME')
      return categories.filter((cat) => cat.kind === 'INCOME');
    if (type === 'EXPENSE')
      return categories.filter((cat) => cat.kind === 'EXPENSE');
    // TRANSFER types can use either category kind
    return categories;
  };

  // Helper function to determine category kind for new category creation
  const getCategoryKindForTransaction = () => {
    if (formData.type === 'INCOME') return 'INCOME';
    if (formData.type === 'EXPENSE') return 'EXPENSE';
    return 'EXPENSE'; // Default for TRANSFER_OUT
  };

  // Handle category creation and auto-selection
  const handleCategorySaved = async (createdCategory?: Category) => {
    if (!user) return;

    try {
      // Reload categories after creating a new one
      const allCategories = await repository.categories.findAll();
      setCategories(allCategories.filter((cat) => cat.active));

      // Auto-select the newly created category
      if (createdCategory) {
        setFormData((prev) => ({ ...prev, categoryId: createdCategory.id }));
      }
    } catch (error) {
      logger.error('Error reloading categories:', error);
      addNotification({
        read: false,
        type: 'error',
        title: 'Error',
        message: 'Error al recargar las categorías',
      });
    }
  };

  // Initialize date on client side
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      date: new Date().toISOString().split('T')[0],
    }));
  }, []);

  const handleCalculatorClick = (value: string) => {
    if (value === 'C') {
      setCalculatorValue('0');
      setFormData((prev) => ({ ...prev, amount: '' }));
    } else if (value === '=') {
      try {
        const result = evaluateCalculatorExpression(calculatorValue);
        const resultStr = Number.parseFloat(result.toFixed(8)).toString();
        setCalculatorValue(resultStr);
        setFormData((prev) => ({ ...prev, amount: resultStr }));
      } catch {
        setCalculatorValue('Error');
        setFormData((prev) => ({ ...prev, amount: '' }));
      }
    } else if (value === '⌫') {
      const newValue =
        calculatorValue.length > 1 ? calculatorValue.slice(0, -1) : '0';
      setCalculatorValue(newValue);
      setFormData((prev) => ({
        ...prev,
        amount: newValue === '0' ? '' : newValue,
      }));
    } else {
      const newValue =
        calculatorValue === '0' ? value : calculatorValue + value;
      setCalculatorValue(newValue);
      setFormData((prev) => ({ ...prev, amount: newValue }));
    }
  };

  const handleCalculatorInputChange = (value: string) => {
    const sanitizedValue = value
      .replace(',', '.')
      .replace(/\s+/g, '')
      .replace(/[^0-9.+*/-]/g, '');

    const nextValue = sanitizedValue === '' ? '0' : sanitizedValue;
    setCalculatorValue(nextValue);
    setFormData((prev) => ({
      ...prev,
      amount: nextValue === '0' ? '' : nextValue,
    }));
  };

  const mapKeyboardKeyToCalculatorButton = (key: string): string | null => {
    if (/^[0-9]$/.test(key)) return key;
    if (key === '.') return '.';
    if (key === '+' || key === '-' || key === '*' || key === '/') return key;
    if (key === 'Enter') return '=';
    if (key === 'Backspace') return '⌫';
    if (key === 'Delete' || key === 'Escape') return 'C';
    return null;
  };

  const handleSubmit = async () => {
    const canShowDebtFields =
      formData.type === TransactionType.INCOME ||
      formData.type === TransactionType.EXPENSE;

    // Validate required fields
    if (!formData.type) {
      addNotification({
        read: false,
        type: 'error',
        title: 'Campo requerido',
        message: 'Por favor selecciona un tipo de transacción',
      });
      return;
    }
    if (!formData.accountId) {
      addNotification({
        read: false,
        type: 'error',
        title: 'Campo requerido',
        message: 'Por favor selecciona una cuenta',
      });
      return;
    }
    if (!formData.categoryId) {
      addNotification({
        read: false,
        type: 'error',
        title: 'Campo requerido',
        message: 'Por favor selecciona una categoría',
      });
      return;
    }
    if (!formData.amount || formData.amount.trim() === '') {
      addNotification({
        read: false,
        type: 'error',
        title: 'Campo requerido',
        message: 'Por favor ingresa un monto',
      });
      return;
    }

    const amount = parseFloat(formData.amount.replace(/[,$]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      addNotification({
        read: false,
        type: 'error',
        title: 'Monto inválido',
        message: 'Por favor ingresa un monto válido mayor a 0',
      });
      return;
    }

    if (formData.isDebt && canShowDebtFields && !formData.debtDirection) {
      addNotification({
        read: false,
        type: 'error',
        title: 'Campo requerido',
        message: 'Selecciona la direccion de la deuda',
      });
      return;
    }

    if (
      formData.isDebt &&
      formData.debtStatus === DebtStatus.SETTLED &&
      !formData.settledAt
    ) {
      addNotification({
        read: false,
        type: 'error',
        title: 'Campo requerido',
        message: 'Indica la fecha de liquidacion para deuda saldada',
      });
      return;
    }

    if (!user) {
      addNotification({
        read: false,
        type: 'error',
        title: 'Error de autenticación',
        message: 'Usuario no autenticado',
      });
      return;
    }

    setLoading(true);

    try {
      // Get selected account to determine currency
      const selectedAccount = accounts.find(
        (acc) => acc.id === formData.accountId
      );
      const currencyCode = selectedAccount?.currencyCode || 'USD';

      const transactionData: CreateTransactionDTO = {
        type: formData.type as TransactionType,
        accountId: formData.accountId,
        categoryId: formData.categoryId,
        currencyCode: currencyCode,
        amountMinor: Math.round(amount * 100),
        date: formData.date || new Date().toISOString().split('T')[0],
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
            ? formData.settledAt
            : undefined,
      };

      const createdTransaction =
        await repository.transactions.create(transactionData);

      // If recurring is enabled, create recurring transaction
      if (formData.isRecurring) {
        try {
          const recurringData = {
            name: `${formData.description} - Recurrente`,
            type: formData.type as TransactionType,
            accountId: formData.accountId,
            categoryId: formData.categoryId,
            currencyCode: currencyCode,
            amountMinor: Math.round(amount * 100),
            description: formData.description.trim(),
            note: formData.note?.trim() || undefined,
            tags: formData.tags
              ? formData.tags
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean)
              : undefined,
            frequency: formData.frequency as any,
            intervalCount: 1,
            startDate: calculate_next_execution_date(
              formData.date,
              formData.frequency
            ),
            endDate: formData.endDate || undefined,
          };

          await repository.recurringTransactions.create(recurringData, user.id);

          addNotification({
            read: false,
            type: 'info',
            title: 'Transacción recurrente creada',
            message: `Se creará automáticamente cada ${formData.frequency === 'weekly' ? 'semana' : formData.frequency === 'monthly' ? 'mes' : 'año'}`,
          });
        } catch (recurringError) {
          logger.error('Error creating recurring transaction:', recurringError);
          addNotification({
            read: false,
            type: 'warning',
            title: 'Transacción creada',
            message:
              'La transacción se creó pero hubo un error con la recurrencia',
          });
        }
      }

      // Success notification
      addNotification({
        read: false,
        type: 'success',
        title: '¡Transacción creada!',
        message: `Transacción de ${currencyCode === 'VES' ? 'Bs.' : '$'}${amount.toLocaleString()} guardada exitosamente${formData.isRecurring ? ' con recurrencia configurada' : ''}`,
      });

      if (formData.isRecurring) {
        // TODO: Implement recurring transactions functionality
        logger.info('Recurring transaction feature not implemented yet');

        addNotification({
          read: false,
          type: 'info',
          title: 'Transacción recurrente',
          message: `Se repetirá cada ${
            formData.frequency === 'weekly'
              ? 'semana'
              : formData.frequency === 'monthly'
                ? 'mes'
                : 'año'
          }${formData.endDate ? ` hasta ${formData.endDate}` : ' indefinidamente'}`,
        });
      }

      setAnimateSuccess(true);
      setTimeout(() => {
        router.push('/transactions');
      }, 2000);
    } catch (error) {
      // More detailed error message
      let errorMessage =
        'No se pudo guardar la transacción. Por favor intenta de nuevo.';

      if (error instanceof Error) {
        if (error.message.includes('row-level security')) {
          errorMessage =
            'Error de permisos. Verifica que estés autenticado correctamente.';
        } else if (error.message.includes('foreign key')) {
          errorMessage =
            'Error en los datos. Verifica que la cuenta y categoría sean válidas.';
        } else if (error.message.includes('not-null')) {
          errorMessage = 'Faltan campos requeridos en la transacción.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      addNotification({
        read: false,
        type: 'error',
        title: 'Error al guardar',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  if (animateSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-fade-in text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success">
            <Check className="h-10 w-10 text-white" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-white">
            ¡Transacción Creada!
          </h2>
          <p className="text-gray-300">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="focus-ring flex min-h-[44px] items-center space-x-2 rounded-xl border border-border/60 bg-card/40 px-4 py-2 text-foreground backdrop-blur-md transition-all duration-300 hover:bg-card/60"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Volver</span>
          </button>

          <h1 className="text-center text-6xl font-bold text-foreground">
            Nueva Transacción
          </h1>

          <div className="w-20"></div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 pb-32 lg:grid-cols-3">
          {/* Left Column - Transaction Type & Account */}
          <div className="space-y-6">
            {/* Transaction Type */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
              <h3 className="mb-4 flex items-center text-xl font-semibold text-white">
                <Repeat className="mr-2 h-5 w-5 text-blue-400" />
                Tipo de Transacción
              </h3>
              <div className="space-y-3">
                {transactionTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = formData.type === type.value;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          type: type.value as TransactionType,
                        })
                      }
                      className={`w-full transform rounded-xl p-4 transition-all duration-300 ${
                        isSelected
                          ? `bg-gradient-to-r ${type.color} border-0 shadow-xl`
                          : 'border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                            isSelected ? 'bg-white/20' : 'bg-white/10'
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-gray-300'}`}
                          />
                        </div>
                        <div className="text-left">
                          <p
                            className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}
                          >
                            {type.label}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Account Selection */}
            {formData.type && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
                <h3 className="mb-4 flex items-center text-xl font-semibold text-white">
                  <Wallet className="mr-2 h-5 w-5 text-green-400" />
                  Cuenta
                </h3>
                <div className="space-y-3">
                  {loadingAccounts ? (
                    <div className="col-span-full text-center text-gray-400">
                      Cargando cuentas...
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="col-span-full text-center text-gray-400">
                      No tienes cuentas disponibles. <br />
                      <span className="text-sm">
                        Crea una cuenta primero en la sección de Cuentas.
                      </span>
                    </div>
                  ) : (
                    accounts.map((account) => {
                      const isSelected = formData.accountId === account.id;

                      return (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, accountId: account.id })
                          }
                          className={`w-full transform rounded-xl p-4 transition-all duration-300 ${
                            isSelected
                              ? 'border border-success/40 bg-success/90 shadow-xl'
                              : 'border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                isSelected ? 'bg-white/20' : 'bg-white/10'
                              }`}
                            >
                              <span className="text-xl">
                                {account.type === 'BANK'
                                  ? '🏦'
                                  : account.type === 'CARD'
                                    ? '💳'
                                    : account.type === 'CASH'
                                      ? '💵'
                                      : account.type === 'INVESTMENT'
                                        ? '📈'
                                        : '💰'}
                              </span>
                            </div>
                            <div className="flex-1 text-left">
                              <p
                                className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}
                              >
                                {account.name}
                              </p>
                              <p
                                className={`amount-strong text-sm ${isSelected ? 'text-white/80' : 'text-gray-400'}`}
                              >
                                {account.currencyCode === 'VES'
                                  ? `Bs. ${Math.abs(account.balance / 100).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                                  : `$${Math.abs(account.balance / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${account.currencyCode}`}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Middle Column - Category & Calculator */}
          <div className="space-y-6">
            {/* Category Selection */}
            {formData.type && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center text-xl font-semibold text-white">
                    <Tag className="mr-2 h-5 w-5 text-pink-400" />
                    Categoría
                  </h3>
                  <button
                    type="button"
                    onClick={openCategoryModal}
                    className="flex items-center space-x-1 rounded-lg border border-primary bg-primary/10 px-3 py-2 text-xs text-primary transition-colors hover:border-blue-400 hover:bg-primary/20 hover:text-blue-300"
                  >
                    <Plus className="h-3 w-3 flex-shrink-0" />
                    <span className="whitespace-nowrap">Nueva Categoría</span>
                  </button>
                </div>
                <div className="grid max-h-96 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
                  {loadingCategories ? (
                    <div className="col-span-full text-center text-gray-400">
                      Cargando categorías...
                    </div>
                  ) : (
                    getCategoriesByType(formData.type as TransactionType)?.map(
                      (category) => {
                        const isSelected = formData.categoryId === category.id;

                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => {
                              const newData = {
                                ...formData,
                                categoryId: category.id,
                              };
                              if (category.name === 'Suscripciones') {
                                newData.isRecurring = true;
                                newData.frequency = 'monthly';
                              }
                              setFormData(newData);
                            }}
                            className={`relative rounded-xl p-3 transition-all duration-300 ${
                              isSelected
                                ? 'border-0 shadow-xl'
                                : 'border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10'
                            }`}
                            style={
                              isSelected
                                ? { backgroundColor: category.color }
                                : {}
                            }
                          >
                            <div className="flex flex-col items-center space-y-2">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                  isSelected ? 'bg-white/20' : 'bg-white/10'
                                }`}
                              >
                                <span className="text-lg">
                                  {category.icon === 'Utensils'
                                    ? '🍽️'
                                    : category.icon === 'Car'
                                      ? '🚗'
                                      : category.icon === 'ShoppingBag'
                                        ? '🛍️'
                                        : category.icon === 'Music'
                                          ? '🎵'
                                          : category.icon === 'Stethoscope'
                                            ? '🩺'
                                            : category.icon === 'Home'
                                              ? '🏠'
                                              : category.icon === 'Book'
                                                ? '📚'
                                                : category.icon === 'Dumbbell'
                                                  ? '🏋️'
                                                  : category.icon === 'Plane'
                                                    ? '✈️'
                                                    : category.icon ===
                                                        'Smartphone'
                                                      ? '📱'
                                                      : category.icon ===
                                                          'Calendar'
                                                        ? '📅'
                                                        : category.icon ===
                                                            'Banknote'
                                                          ? '💵'
                                                          : category.icon ===
                                                              'Heart'
                                                            ? '❤️'
                                                            : category.icon ===
                                                                'Zap'
                                                              ? '⚡'
                                                              : category.icon ===
                                                                  'Building2'
                                                                ? '🏢'
                                                                : category.icon ===
                                                                    'Receipt'
                                                                  ? '🧾'
                                                                  : category.icon ===
                                                                      'Briefcase'
                                                                    ? '💼'
                                                                    : category.icon ===
                                                                        'Coffee'
                                                                      ? '☕'
                                                                      : category.icon ===
                                                                          'TrendingUp'
                                                                        ? '📈'
                                                                        : category.icon ===
                                                                            'Gift'
                                                                          ? '🎁'
                                                                          : category.icon ===
                                                                              'Star'
                                                                            ? '⭐'
                                                                            : category.icon ===
                                                                                'Repeat'
                                                                              ? '🔄'
                                                                              : category.icon ===
                                                                                  'PiggyBank'
                                                                                ? '🐷'
                                                                                : '💰'}
                                </span>
                              </div>
                              <span
                                className={`text-center text-xs font-medium ${
                                  isSelected ? 'text-white' : 'text-gray-300'
                                }`}
                              >
                                {category.name}
                              </span>
                            </div>
                          </button>
                        );
                      }
                    )
                  )}
                </div>
              </div>
            )}

            {/* Visual Calculator */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
              <h3 className="mb-4 flex items-center text-xl font-semibold text-white">
                <DollarSign className="mr-2 h-5 w-5 text-yellow-400" />
                Monto
              </h3>

              <div className="mb-4 rounded-xl bg-muted/20 p-4">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-2xl font-bold text-white">
                    <span>$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={calculatorValue}
                      onChange={(e) =>
                        handleCalculatorInputChange(e.target.value)
                      }
                      onKeyDown={(e) => {
                        const mappedButton = mapKeyboardKeyToCalculatorButton(
                          e.key
                        );
                        if (!mappedButton) return;

                        if (mappedButton === '=' || mappedButton === 'C') {
                          e.preventDefault();
                          handleCalculatorClick(mappedButton);
                        }
                      }}
                      className="w-full max-w-52 bg-transparent text-right text-white outline-none"
                      aria-label="Monto de la transacción"
                    />
                  </div>
                  {/* Converted preview using selected rate */}
                  <div className="mt-1 text-xs text-white/70">
                    {(() => {
                      const selectedAccount = accounts.find(
                        (acc) => acc.id === formData.accountId
                      );
                      const currencyCode =
                        selectedAccount?.currencyCode || 'USD';
                      const amt = parseFloat(calculatorValue || '0');
                      if (!isFinite(amt) || amt <= 0) return null;
                      if (currencyCode === 'VES') {
                        const usd = activeUsdVes > 0 ? amt / activeUsdVes : 0;
                        return `≈ $${usd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD · ${selectedRateSource.toUpperCase()}`;
                      }
                      if (currencyCode === 'USD') {
                        const ves = activeUsdVes > 0 ? amt * activeUsdVes : 0;
                        return `≈ Bs. ${ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })} · ${selectedRateSource.toUpperCase()}`;
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  'C',
                  '⌫',
                  '/',
                  '*',
                  '7',
                  '8',
                  '9',
                  '-',
                  '4',
                  '5',
                  '6',
                  '+',
                  '1',
                  '2',
                  '3',
                  '=',
                  '0',
                  '.',
                ].map((btn) => (
                  <button
                    key={btn}
                    onClick={() => handleCalculatorClick(btn)}
                    className={`h-12 rounded-lg font-semibold transition-all duration-200 ${
                      ['C', '⌫'].includes(btn)
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                        : ['/', '*', '-', '+', '='].includes(btn)
                          ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                          : 'bg-white/10 text-white hover:bg-white/20'
                    } ${btn === '0' ? 'col-span-2' : ''}`}
                  >
                    {btn}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md">
              <h3 className="mb-4 flex items-center text-xl font-semibold text-white">
                <FileText className="mr-2 h-5 w-5 text-cyan-400" />
                Detalles
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Descripción (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder={
                      formData.type === 'INCOME'
                        ? '¿De dónde viene este ingreso?'
                        : formData.type === 'TRANSFER_OUT'
                          ? '¿Para qué es esta transferencia?'
                          : '¿Para qué fue este gasto?'
                    }
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Nota (Opcional)
                  </label>
                  <textarea
                    placeholder="Información adicional..."
                    value={formData.note}
                    onChange={(e) =>
                      setFormData({ ...formData, note: e.target.value })
                    }
                    rows={3}
                    className="w-full resize-none rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Etiquetas (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="urgente, recurrente, etc."
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                {(formData.type === TransactionType.INCOME ||
                  formData.type === TransactionType.EXPENSE) && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <label
                        htmlFor="isDebt"
                        className="text-sm font-medium text-white"
                      >
                        Es deuda
                      </label>
                      <input
                        id="isDebt"
                        type="checkbox"
                        checked={formData.isDebt}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isDebt: e.target.checked,
                            debtDirection: e.target.checked
                              ? formData.debtDirection
                              : '',
                            debtStatus: e.target.checked
                              ? formData.debtStatus
                              : DebtStatus.OPEN,
                            counterpartyName: e.target.checked
                              ? formData.counterpartyName
                              : '',
                            settledAt: e.target.checked
                              ? formData.settledAt
                              : '',
                          })
                        }
                        className="h-5 w-5 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>

                    {formData.isDebt && (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-300">
                            Direccion de deuda
                          </label>
                          <select
                            value={formData.debtDirection}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                debtDirection: e.target.value as any,
                              })
                            }
                            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                          >
                            <option value="" className="bg-gray-800">
                              Selecciona una opcion
                            </option>
                            <option value="OWE" className="bg-gray-800">
                              Debo
                            </option>
                            <option value="OWED_TO_ME" className="bg-gray-800">
                              Me deben
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-300">
                            Estado
                          </label>
                          <select
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
                            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                          >
                            <option
                              value={DebtStatus.OPEN}
                              className="bg-gray-800"
                            >
                              Abierta
                            </option>
                            <option
                              value={DebtStatus.SETTLED}
                              className="bg-gray-800"
                            >
                              Saldada
                            </option>
                          </select>
                        </div>

                        {formData.debtStatus === DebtStatus.SETTLED && (
                          <div>
                            <label className="mb-2 block text-sm font-medium text-gray-300">
                              Fecha de liquidacion
                            </label>
                            <input
                              type="date"
                              value={formData.settledAt}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  settledAt: e.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                            />
                          </div>
                        )}

                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-300">
                            Contraparte (opcional)
                          </label>
                          <input
                            type="text"
                            placeholder="Nombre de la persona o empresa"
                            value={formData.counterpartyName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                counterpartyName: e.target.value,
                              })
                            }
                            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recurring Transaction Settings */}
                <div className="border-t border-white/10 pt-4">
                  <div className="mb-4 flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={formData.isRecurring}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isRecurring: e.target.checked,
                        })
                      }
                      className="h-5 w-5 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-500/50"
                    />
                    <label
                      htmlFor="isRecurring"
                      className="font-medium text-white"
                    >
                      🔄 Transacción Recurrente
                    </label>
                  </div>

                  {formData.isRecurring && (
                    <div className="space-y-4 pl-8">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          Frecuencia
                        </label>
                        <select
                          value={formData.frequency}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              frequency: e.target.value as
                                | 'weekly'
                                | 'monthly'
                                | 'yearly',
                            })
                          }
                          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                        >
                          <option value="weekly" className="bg-gray-800">
                            Semanal
                          </option>
                          <option value="monthly" className="bg-gray-800">
                            Mensual
                          </option>
                          <option value="yearly" className="bg-gray-800">
                            Anual
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-300">
                          Finalizar el (Opcional)
                        </label>
                        <input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              endDate: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white backdrop-blur-md focus:border-transparent focus:ring-2 focus:ring-blue-500/50"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                          Deja vacío para que continúe indefinidamente
                        </p>
                      </div>

                      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                        <p className="text-sm text-blue-300">
                          💡 Esta transacción se repetirá automáticamente cada{' '}
                          {formData.frequency === 'weekly'
                            ? 'semana'
                            : formData.frequency === 'monthly'
                              ? 'mes'
                              : 'año'}{' '}
                          hasta que la canceles.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="fixed bottom-8 right-8 z-50">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="focus-ring flex min-h-[44px] transform items-center justify-center space-x-3 rounded-xl border-2 border-success/60 bg-success px-8 py-4 text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
            title="Finalizar Transacción"
          >
            {loading ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <Check className="h-6 w-6" />
                <span className="text-lg font-bold">Finalizar</span>
              </>
            )}
          </button>
        </div>

        {/* Cancel Button */}
        <div className="fixed bottom-8 right-60 z-50">
          <button
            type="button"
            onClick={() => router.back()}
            className="focus-ring flex min-h-[44px] transform items-center justify-center space-x-3 rounded-xl border-2 border-destructive/60 bg-destructive px-6 py-4 text-destructive-foreground shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-destructive/90"
            title="Cancelar"
          >
            <X className="h-5 w-5" />
            <span className="font-bold">Cancelar</span>
          </button>
        </div>

        {/* Summary Card (if form is partially filled) */}
        {(formData.type || formData.amount) && (
          <div className="fixed right-8 top-20 z-40 max-w-sm rounded-2xl border border-border/50 bg-card/80 p-4 shadow-2xl backdrop-blur-md">
            <h4 className="mb-2 font-semibold text-foreground">Resumen</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              {formData.type && (
                <p>
                  Tipo:{' '}
                  <span className="text-foreground">
                    {
                      transactionTypes.find((t) => t.value === formData.type)
                        ?.label
                    }
                  </span>
                </p>
              )}
              {formData.amount && (
                <p>
                  Monto:{' '}
                  <span className="font-semibold text-foreground">
                    {(() => {
                      const selectedAccount = accounts.find(
                        (acc) => acc.id === formData.accountId
                      );
                      const currencyCode =
                        selectedAccount?.currencyCode || 'USD';
                      const currency = CURRENCIES[currencyCode];
                      return `${currency?.symbol || '$'}${formData.amount}`;
                    })()}
                  </span>
                </p>
              )}
              {formData.accountId && (
                <p>
                  Cuenta:{' '}
                  <span className="text-foreground">
                    {accounts.find((a) => a.id === formData.accountId)?.name}
                  </span>
                </p>
              )}
              {formData.categoryId && (
                <p>
                  Categoría:{' '}
                  <span className="text-foreground">
                    {
                      getCategoriesByType(
                        formData.type as TransactionType
                      )?.find((c) => c.id === formData.categoryId)?.name
                    }
                  </span>
                </p>
              )}
              {formData.description && (
                <p>
                  Descripción:{' '}
                  <span className="text-foreground">
                    {formData.description}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Category Creation Modal */}
        <CategoryForm
          isOpen={isCategoryModalOpen}
          onClose={closeCategoryModal}
          onSave={handleCategorySaved}
          category={null}
          parentCategoryId={null}
          defaultKind={getCategoryKindForTransaction() as any}
        />
      </div>
    </div>
  );
}
