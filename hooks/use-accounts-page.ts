'use client';

import { useCallback, useEffect, useState, type MutableRefObject } from 'react';
import type { Account } from '@/types';
import { logger } from '@/lib/utils/logger';
import { toast } from 'sonner';
import { useBalanceAlerts } from '@/hooks/use-balance-alerts';
import { useModal } from '@/hooks';
import { useRepository } from '@/providers/repository-provider';

export interface AccountsPageState {
  accounts: Account[];
  transactions: any[];
  categories: any[];
  selectedAccount: Account | null;
  openDropdown: string | null;
  dropdownPosition: { top: number; left: number };
  selectedAccountForAlert: Account | null;
  showAlertSettings: boolean;
  accountToDelete: Account | null;
  deletingAccount: boolean;
  showRatesHistory: boolean;
  showBalances: boolean;
  error: string | null;
  loading: boolean;
  expandedAccount: string | null;
}

export interface AccountsPageActions {
  loadAllData: () => Promise<void>;
  loadAccounts: () => Promise<void>;
  handleEditAccount: (account: Account) => void;
  handleNewAccount: () => void;
  handleAccountSaved: () => void;
  handleDeleteAccount: (account: Account) => void;
  confirmDeleteAccount: () => Promise<void>;
  cancelDeleteAccount: () => void;
  handleAlertSettings: (account: Account) => void;
  handleCloseAlertSettings: () => void;
  toggleDropdown: (accountId: string) => void;
  setSelectedAccount: (a: Account | null) => void;
  setShowRatesHistory: (b: boolean) => void;
  setShowBalances: (b: boolean) => void;
  closeModal: () => void;
  calculateDropdownPosition: (accountId: string) => void;
  closeDropdown: () => void;
  getCategoryName: (categoryId?: string) => string;
  getAccountCategoryStats: (accountId: string) => Array<{
    categoryName: string;
    income: number;
    expenses: number;
    count: number;
    net: number;
  }>;
}

export type AccountsPageHook = AccountsPageState & AccountsPageActions;

export interface UseAccountsPageOpts {
  user: { id?: string } | null;
  repository: ReturnType<typeof useRepository>;
  onOpenHistory: () => void;
  dropdownRefs: MutableRefObject<{
    [key: string]: HTMLButtonElement | null;
  }>;
}

const DEFAULT_DROPDOWN_POSITION = { top: 0, left: 0 };

export function useAccountsPage(opts: UseAccountsPageOpts): AccountsPageHook {
  const { user, repository, dropdownRefs } = opts;
  const { isOpen, openModal, closeModal } = useModal();
  void isOpen;
  const { checkAlerts } = useBalanceAlerts();

  // State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  }>(DEFAULT_DROPDOWN_POSITION);
  const [selectedAccountForAlert, setSelectedAccountForAlert] =
    useState<Account | null>(null);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showRatesHistory, setShowRatesHistory] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAccount] = useState<string | null>(null);

  // Data load
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        setAccounts([]);
        setError('Debes iniciar sesión para ver tus cuentas');
        return;
      }

      const [userAccounts, transactionsData, categoriesData] =
        await Promise.all([
          repository.accounts.findByUserId(user.id),
          repository.transactions.findAll(),
          repository.categories.findAll(),
        ]);

      setAccounts(userAccounts);
      setTransactions(transactionsData);
      setCategories(categoriesData);

      await checkAlerts(userAccounts);
    } catch (err) {
      logger.error('Error loading data:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [user, repository, checkAlerts]);

  // Trigger on mount and on user/repository change
  useEffect(() => {
    if (user?.id) {
      void loadAllData();
    }
  }, [loadAllData, user?.id]);

  const loadAccounts = loadAllData;

  // Click-outside listener for the open dropdown
  useEffect(() => {
    if (!openDropdown) return;
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById(
        `account-dropdown-${openDropdown}`
      );
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Recalculate dropdown position on scroll/resize
  useEffect(() => {
    if (!openDropdown) return;
    const handleScroll = () => {
      calculateDropdownPosition(openDropdown);
    };
    const scrollContainer = document.querySelector('main');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, {
        passive: true,
      });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
    // calculateDropdownPosition is stable; intentionally not in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDropdown]);

  // Handlers
  const handleEditAccount = useCallback(
    (account: Account) => {
      setSelectedAccount(account);
      openModal();
    },
    [openModal]
  );

  const handleNewAccount = useCallback(() => {
    setSelectedAccount(null);
    openModal();
  }, [openModal]);

  const handleAccountSaved = useCallback(() => {
    closeModal();
    void loadAccounts();
  }, [closeModal, loadAccounts]);

  const handleDeleteAccount = useCallback((account: Account) => {
    setOpenDropdown(null);
    setAccountToDelete(account);
  }, []);

  const confirmDeleteAccount = useCallback(async () => {
    if (!accountToDelete) return;
    try {
      setDeletingAccount(true);
      await repository.accounts.delete(accountToDelete.id);
      setAccountToDelete(null);
      await loadAccounts();
      toast.success('Cuenta eliminada correctamente');
    } catch (err) {
      toast.error('Error al eliminar la cuenta');
    } finally {
      setDeletingAccount(false);
    }
  }, [accountToDelete, repository, loadAccounts]);

  const cancelDeleteAccount = useCallback(() => {
    if (deletingAccount) return;
    setAccountToDelete(null);
  }, [deletingAccount]);

  const calculateDropdownPosition = useCallback(
    (accountId: string) => {
      const trigger = dropdownRefs.current[accountId];
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom,
          left: rect.right - 192, // 192px = w-48
        });
      }
    },
    [dropdownRefs]
  );

  const toggleDropdown = useCallback(
    (accountId: string) => {
      if (openDropdown !== accountId) {
        calculateDropdownPosition(accountId);
      }
      setOpenDropdown(openDropdown === accountId ? null : accountId);
    },
    [openDropdown, calculateDropdownPosition]
  );

  const handleAlertSettings = useCallback((account: Account) => {
    setSelectedAccountForAlert(account);
    setShowAlertSettings(true);
    setOpenDropdown(null);
  }, []);

  const handleCloseAlertSettings = useCallback(() => {
    setShowAlertSettings(false);
    setSelectedAccountForAlert(null);
    void loadAccounts();
  }, [loadAccounts]);

  // Derivation helpers (depend only on local state)
  const getCategoryName = useCallback(
    (categoryId?: string) =>
      categories.find((c) => c.id === categoryId)?.name || 'Sin categoría',
    [categories]
  );

  const getAccountCategoryStats = useCallback(
    (accountId: string) => {
      const accountTransactions = transactions.filter(
        (t) => t.accountId === accountId
      );
      const categoryStats: Record<
        string,
        { income: number; expenses: number; count: number }
      > = {};

      accountTransactions.forEach((transaction) => {
        const categoryId = transaction.categoryId || 'uncategorized';
        const categoryName = getCategoryName(categoryId);
        if (!categoryStats[categoryName]) {
          categoryStats[categoryName] = { income: 0, expenses: 0, count: 0 };
        }
        const amount = (transaction.amountMinor || 0) / 100;
        categoryStats[categoryName].count++;
        if (transaction.type === 'INCOME') {
          categoryStats[categoryName].income += amount;
        } else if (transaction.type === 'EXPENSE') {
          categoryStats[categoryName].expenses += amount;
        }
      });

      return Object.entries(categoryStats)
        .map(([categoryName, stats]) => ({
          categoryName,
          ...stats,
          net: stats.income - stats.expenses,
        }))
        .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
    },
    [transactions, getCategoryName]
  );

  return {
    // state
    accounts,
    transactions,
    categories,
    selectedAccount,
    openDropdown,
    dropdownPosition,
    selectedAccountForAlert,
    showAlertSettings,
    accountToDelete,
    deletingAccount,
    showRatesHistory,
    showBalances,
    error,
    loading,
    expandedAccount,
    // actions
    loadAllData,
    loadAccounts,
    handleEditAccount,
    handleNewAccount,
    handleAccountSaved,
    handleDeleteAccount,
    confirmDeleteAccount,
    cancelDeleteAccount,
    handleAlertSettings,
    handleCloseAlertSettings,
    toggleDropdown,
    setSelectedAccount,
    setShowRatesHistory,
    setShowBalances,
    closeModal,
    calculateDropdownPosition,
    closeDropdown: () => setOpenDropdown(null),
    getCategoryName,
    getAccountCategoryStats,
  };
}
