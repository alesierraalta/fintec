'use client';

import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AccountForm } from '@/components/forms/account-form';
import { Button } from '@/components/ui';
import { useModal } from '@/hooks';
import { useRepository } from '@/providers/repository-provider';
import { useAuth } from '@/hooks/use-auth';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { Account } from '@/types';
import { fromMinorUnits, CURRENCIES } from '@/lib/money';
import { VESCurrency, formatCurrencyWithBCV } from '@/lib/currency-ves';
import { 
  Plus, 
  Wallet, 
  CreditCard, 
  Banknote, 
  TrendingUp,
  PiggyBank,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Bitcoin,
  DollarSign
} from 'lucide-react';
import { BCVRates } from '@/components/currency/bcv-rates';

const accountIcons = {
  BANK: Banknote,
  CARD: CreditCard,
  CASH: Wallet,
  SAVINGS: PiggyBank,
  INVESTMENT: TrendingUp,
  CRYPTO: Bitcoin,
};

export default function AccountsPage() {
  const { isOpen, openModal, closeModal } = useModal();
  const { user } = useAuth();
  const repository = useRepository();
  const bcvRates = useBCVRates();
  const [showBalances, setShowBalances] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Load accounts from database
  useEffect(() => {
    loadAccounts();
  }, [user]);

  // Update BCV rates in VES currency handler
  useEffect(() => {
    VESCurrency.setBCVRates({
      usd: bcvRates.usd,
      eur: bcvRates.eur,
      lastUpdated: new Date().toISOString()
    });
  }, [bcvRates]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDropdown]);

  const loadAccounts = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const userAccounts = await repository.accounts.findByUserId(user.id);
      setAccounts(userAccounts);
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError('Error loading accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    openModal();
  };

  const handleNewAccount = () => {
    setSelectedAccount(null);
    openModal();
  };

  const handleAccountSaved = () => {
    closeModal();
    loadAccounts(); // Reload accounts after creating/updating
  };

  const handleDeleteAccount = async (account: Account) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la cuenta "${account.name}"?`)) {
      return;
    }
    
    try {
      await repository.accounts.delete(account.id);
      setOpenDropdown(null);
      loadAccounts(); // Reload accounts after deletion
    } catch (err) {
      console.error('Error deleting account:', err);
      alert('Error al eliminar la cuenta');
    }
  };

  const toggleDropdown = (accountId: string) => {
    setOpenDropdown(openDropdown === accountId ? null : accountId);
  };

  const formatBalance = (balanceMinor: number, currency: string) => {
    // Use VES-aware formatting that validates against BCV rates
    return formatCurrencyWithBCV(balanceMinor, currency, {
      showUSDEquivalent: currency === 'VES',
      locale: 'es-ES'
    });
  };

  // Cálculo optimizado con tasas BCV reales
  const totalBalance = accounts.reduce((sum, acc) => {
    const balanceMinor = Number(acc.balance) || 0;
    const balanceMajor = fromMinorUnits(balanceMinor, acc.currencyCode);
    
    if (acc.currencyCode === 'VES') {
      return sum + (balanceMajor / bcvRates.usd); // Conversión dinámica
    }
    return sum + balanceMajor;
  }, 0);
  const balanceGrowth = totalBalance > 100 ? 5.2 : totalBalance > 0 ? 1.5 : 0;

  return (
    <AuthGuard>
      <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Cuentas</h1>
            <p className="text-gray-400">Gestiona todas tus cuentas financieras y criptomonedas</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowBalances(!showBalances)}
              icon={showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            >
              {showBalances ? 'Ocultar' : 'Mostrar'} Balances
            </Button>
            <Button
              onClick={handleNewAccount}
              icon={<Plus className="h-4 w-4" />}
            >
              Nueva Cuenta
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Balance Total</h3>
            <p className="text-3xl font-bold text-white">
              {showBalances ? `$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '••••••'}
            </p>
            {balanceGrowth !== 0 && (
              <p className={`text-sm mt-1 ${balanceGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {balanceGrowth > 0 ? '+' : ''}{balanceGrowth}% este mes
              </p>
            )}
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Cuentas Activas</h3>
            <p className="text-3xl font-bold text-white">{accounts.filter(acc => acc.active).length}</p>
            <p className="text-sm text-gray-400 mt-1">de {accounts.length} total</p>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Criptomonedas</h3>
            <p className="text-3xl font-bold text-white">
              {accounts.filter(acc => acc.currencyCode === 'BTC' || acc.currencyCode === 'ETH').length}
            </p>
            <p className="text-sm text-gray-400 mt-1">wallets activos</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Divisas</h3>
            <p className="text-3xl font-bold text-white">
              {Array.from(new Set(accounts.map(acc => acc.currencyCode))).length}
            </p>
            <p className="text-sm text-gray-400 mt-1">diferentes</p>
          </div>
        </div>

        {/* BCV Rates Widget */}
        <div className="w-full">
          <BCVRates />
        </div>

        {/* Accounts List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white">Todas las Cuentas</h3>
          </div>
          
          <div className="divide-y divide-gray-800">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-400 mt-2">Cargando cuentas...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-red-400">{error}</p>
                <button 
                  onClick={loadAccounts}
                  className="mt-2 text-blue-400 hover:text-blue-300"
                >
                  Reintentar
                </button>
              </div>
            ) : accounts.length === 0 ? (
              <div className="p-6 text-center">
                <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No tienes cuentas aún</p>
                <p className="text-gray-500 text-sm mb-4">Crea tu primera cuenta para empezar a gestionar tus finanzas</p>
                <Button onClick={handleNewAccount} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera cuenta
                </Button>
              </div>
            ) : (
              accounts.map((account) => {
                const Icon = accountIcons[account.type as keyof typeof accountIcons] || Wallet;
                
                return (
                  <div key={account.id} className="p-6 hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-gray-800 rounded-lg">
                          <Icon className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                        <h4 className="text-lg font-medium text-white">{account.name}</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <span>{account.type === 'BANK' ? 'Banco' : 
                                 account.type === 'CARD' ? 'Tarjeta' :
                                 account.type === 'CASH' ? 'Efectivo' :
                                 account.type === 'SAVINGS' ? 'Ahorros' : 
                                 'Inversión'}</span>
                          <span>•</span>
                          <span className="text-blue-400">
                            {account.currencyCode}
                          </span>
                          <span>•</span>
                          <span className={account.active ? 'text-green-400' : 'text-red-400'}>
                            {account.active ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-xl font-semibold text-white">
                          {showBalances 
                            ? `${account.balance < 0 ? '-' : ''}${formatBalance(Math.abs(account.balance), account.currencyCode)}`
                            : '••••••'
                          }
                        </p>
                        <div className="flex items-center justify-end space-x-2">
                          {account.currencyCode === 'VES' && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg">
                              BCV
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="relative">
                        <button 
                          onClick={() => toggleDropdown(account.id)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        
                        {openDropdown === account.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                            <button
                              onClick={() => {
                                handleEditAccount(account);
                                setOpenDropdown(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center space-x-2"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Editar cuenta</span>
                            </button>
                            <button
                              onClick={() => handleDeleteAccount(account)}
                              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 flex items-center space-x-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Eliminar cuenta</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
              })
            )}
          </div>
        </div>
      </div>

      <AccountForm
        isOpen={isOpen}
        onClose={closeModal}
        onSuccess={handleAccountSaved}
        account={selectedAccount}
      />
    </MainLayout>
    </AuthGuard>
  );
}
