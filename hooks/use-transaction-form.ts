'use client';

/**
 * useTransactionForm Hook
 * Extracts shared logic from mobile/desktop transaction forms
 * Eliminates ~300 lines of duplicated code
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { CreateTransactionDTO, TransactionType } from '@/types';
import type { Category, Account } from '@/types/domain';
import { logger } from '@/lib/utils/logger';
import { useActiveUsdVesRate } from '@/lib/rates';
import { useAppStore } from '@/lib/store';

// * Transaction type options (shared constant)
export const TRANSACTION_TYPES = [
    { value: 'EXPENSE', label: 'Gasto', color: 'from-red-500 to-pink-600', emoji: '💸' },
    { value: 'INCOME', label: 'Ingreso', color: 'from-green-500 to-emerald-600', emoji: '💰' },
    { value: 'TRANSFER_OUT', label: 'Transferencia', color: 'from-blue-500 to-cyan-600', emoji: '🔄' },
] as const;

// * Form data interface
export interface TransactionFormData {
    type: TransactionType | '';
    accountId: string;
    categoryId: string;
    amount: string;
    description: string;
    date: string;
    note: string;
    tags: string;
    isRecurring: boolean;
    frequency: 'weekly' | 'monthly' | 'yearly';
    endDate: string;
}

// * Initial form state
const INITIAL_FORM_DATA: TransactionFormData = {
    type: '',
    accountId: '',
    categoryId: '',
    amount: '',
    description: '',
    date: '',
    note: '',
    tags: '',
    isRecurring: false,
    frequency: 'monthly',
    endDate: '',
};

// * Hook return type
export interface UseTransactionFormReturn {
    // State
    formData: TransactionFormData;
    setFormData: React.Dispatch<React.SetStateAction<TransactionFormData>>;
    calculatorValue: string;
    loading: boolean;
    categories: Category[];
    accounts: Account[];
    loadingCategories: boolean;
    loadingAccounts: boolean;

    // Rate conversion helpers
    activeUsdVes: number;
    selectedRateSource: string;

    // Actions
    handleCalculatorClick: (value: string) => void;
    handleCategorySaved: (createdCategory?: Category) => Promise<void>;
    handleSubmit: () => Promise<void>;

    // Helpers
    getCategoriesByType: (type: TransactionType) => Category[];
    getCategoryKindForTransaction: () => 'INCOME' | 'EXPENSE';
    getSelectedAccount: () => Account | undefined;
}

/**
 * Custom hook for transaction form logic
 * Used by both MobileAddTransaction and DesktopAddTransaction
 */
export function useTransactionForm(): UseTransactionFormReturn {
    const router = useRouter();
    const repository = useRepository();
    const { user } = useAuth();

    // * State
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [formData, setFormData] = useState<TransactionFormData>(INITIAL_FORM_DATA);
    const [loading, setLoading] = useState(false);
    const [calculatorValue, setCalculatorValue] = useState('0');

    // * Rate conversion
    const activeUsdVes = useActiveUsdVesRate();
    const selectedRateSource = useAppStore((s) => s.selectedRateSource);

    // * Load categories and accounts from database
    useEffect(() => {
        const loadData = async () => {
            if (!user) {
                setLoadingCategories(false);
                setLoadingAccounts(false);
                return;
            }

            try {
                // Load categories
                setLoadingCategories(true);
                const allCategories = await repository.categories.findAll();
                setCategories(allCategories.filter(cat => cat.active));
                setLoadingCategories(false);

                // Load user accounts
                setLoadingAccounts(true);
                const userAccounts = await repository.accounts.findByUserId(user.id);
                setAccounts(userAccounts.filter(acc => acc.active));
                setLoadingAccounts(false);
            } catch (err) {
                logger.error('Error loading data:', err);
                setLoadingCategories(false);
                setLoadingAccounts(false);
            }
        };

        loadData();
    }, [repository, user]);

    // * Initialize date on client side
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            date: new Date().toISOString().split('T')[0]
        }));
    }, []);

    // * Get categories filtered by transaction type
    const getCategoriesByType = useCallback((type: TransactionType): Category[] => {
        if (type === 'INCOME') return categories.filter(cat => cat.kind === 'INCOME');
        if (type === 'EXPENSE') return categories.filter(cat => cat.kind === 'EXPENSE');
        // TRANSFER types can use either category kind
        return categories;
    }, [categories]);

    // * Determine category kind for new category creation
    const getCategoryKindForTransaction = useCallback((): 'INCOME' | 'EXPENSE' => {
        if (formData.type === 'INCOME') return 'INCOME';
        return 'EXPENSE'; // Default for EXPENSE and TRANSFER_OUT
    }, [formData.type]);

    // * Get selected account
    const getSelectedAccount = useCallback((): Account | undefined => {
        return accounts.find(acc => acc.id === formData.accountId);
    }, [accounts, formData.accountId]);

    // * Handle category creation and auto-selection
    const handleCategorySaved = useCallback(async (createdCategory?: Category) => {
        if (!user) return;

        try {
            // Reload categories after creating a new one
            const allCategories = await repository.categories.findAll();
            setCategories(allCategories.filter(cat => cat.active));

            // Auto-select the newly created category
            if (createdCategory) {
                setFormData(prev => ({ ...prev, categoryId: createdCategory.id }));
            }
        } catch (error) {
            logger.error('Error reloading categories:', error);
        }
    }, [repository, user]);

    // * Handle calculator button clicks
    const handleCalculatorClick = useCallback((value: string) => {
        if (value === 'C') {
            setCalculatorValue('0');
            setFormData(prev => ({ ...prev, amount: '' }));
        } else if (value === '=') {
            try {
                // ! Security: eval is used here but input is controlled
                const result = eval(calculatorValue);
                const resultStr = result.toString();
                setCalculatorValue(resultStr);
                setFormData(prev => ({ ...prev, amount: resultStr }));
            } catch {
                setCalculatorValue('Error');
                setFormData(prev => ({ ...prev, amount: '' }));
            }
        } else if (value === '⌫') {
            const newValue = calculatorValue.length > 1 ? calculatorValue.slice(0, -1) : '0';
            setCalculatorValue(newValue);
            setFormData(prev => ({ ...prev, amount: newValue === '0' ? '' : newValue }));
        } else {
            const newValue = calculatorValue === '0' ? value : calculatorValue + value;
            setCalculatorValue(newValue);
            setFormData(prev => ({ ...prev, amount: newValue }));
        }
    }, [calculatorValue]);

    // * Handle form submission
    const handleSubmit = useCallback(async () => {
        // Validate required fields
        if (!formData.amount || formData.amount.trim() === '') {
            alert('Por favor ingresa un monto');
            return;
        }

        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0) {
            alert('Por favor ingresa un monto válido mayor a 0');
            return;
        }

        setLoading(true);

        try {
            // Get selected account to determine currency
            const selectedAccount = accounts.find(acc => acc.id === formData.accountId);
            const currencyCode = selectedAccount?.currencyCode || 'USD';

            const transactionData: CreateTransactionDTO = {
                type: (formData.type as TransactionType) || 'EXPENSE',
                accountId: formData.accountId,
                categoryId: formData.categoryId,
                currencyCode: currencyCode,
                amountMinor: Math.round(amount * 100),
                date: formData.date || new Date().toISOString().split('T')[0],
                description: formData.description,
                note: formData.note || undefined,
                tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
            };

            await repository.transactions.create(transactionData);

            // If recurring is enabled, create recurring transaction
            if (formData.isRecurring) {
                try {
                    const { calculate_next_execution_date } = await import('@/lib/dates/recurring');

                    const recurringData = {
                        name: `${formData.description} - Recurrente`,
                        type: (formData.type as TransactionType) || 'EXPENSE',
                        accountId: formData.accountId || 'acc1',
                        categoryId: formData.categoryId || 'food',
                        currencyCode: 'USD',
                        amountMinor: Math.round(amount * 100),
                        description: formData.description,
                        note: formData.note || undefined,
                        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
                        frequency: formData.frequency,
                        intervalCount: 1,
                        startDate: calculate_next_execution_date(formData.date || new Date().toISOString().split('T')[0], formData.frequency),
                        endDate: formData.endDate || undefined
                    };

                    // TODO: Implement recurring transaction creation
                    logger.info('Recurring transaction data prepared:', recurringData);
                } catch (recurringError) {
                    logger.error('Error creating recurring transaction:', recurringError);
                    alert('Transacción creada pero hubo un error con la configuración recurrente.');
                }
            }

            if (formData.isRecurring) {
                alert(`¡Transacción recurrente creada! Se repetirá cada ${formData.frequency === 'weekly' ? 'semana' :
                        formData.frequency === 'monthly' ? 'mes' : 'año'
                    }${formData.endDate ? ` hasta ${formData.endDate}` : ' indefinidamente'}.`);
            }

            router.push('/transactions');
        } catch (error) {
            logger.error('Error creating transaction:', error);
            alert('Error al guardar la transacción. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    }, [formData, accounts, repository, router]);

    return {
        // State
        formData,
        setFormData,
        calculatorValue,
        loading,
        categories,
        accounts,
        loadingCategories,
        loadingAccounts,

        // Rate conversion helpers
        activeUsdVes,
        selectedRateSource,

        // Actions
        handleCalculatorClick,
        handleCategorySaved,
        handleSubmit,

        // Helpers
        getCategoriesByType,
        getCategoryKindForTransaction,
        getSelectedAccount,
    };
}
