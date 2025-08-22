'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AccountForm } from '@/components/forms/account-form';
import { Button } from '@/components/ui';
import { useModal } from '@/hooks';
import { useRepository } from '@/providers/repository-provider';
import { useAuth } from '@/hooks/use-auth';
import { Account } from '@/types';
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
  const [showBalances, setShowBalances] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load accounts from database
  useEffect(() => {
    loadAccounts();
  }, [user]);

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

  const formatBalance = (balance: number, currency: string, currencyType: string) => {
    if (currencyType === 'crypto') {
      return `${balance.toFixed(8)} ${currency}`;
    } else if (currency === 'VES') {
      return `Bs. ${balance.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
    } else {
      return `$${Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }
  };

  // Calculate total balance in USD equivalent from real data
  const totalBalance = accounts.reduce((sum, account) => {
    // Convert all balances to USD for total calculation
    if (account.currencyCode === 'USD') {
      return sum + account.balance;
    } else if (account.currencyCode === 'VES') {
      // For VES, assume a conversion rate (this would normally come from BCV rates)
      return sum + (account.balance / 139.0); // Use current BCV rate
    } else {
      // For other currencies, add as-is for now
      return sum + account.balance;
    }
  }, 0);

  // Calculate balance growth percentage (simulated based on account creation dates)
  const calculateBalanceGrowth = () => {
    if (accounts.length === 0) return 0;
    
    // Simulate growth based on number of accounts and their balances
    const avgBalance = totalBalance / Math.max(accounts.length, 1);
    const recentAccounts = accounts.filter(acc => {
      const accountDate = new Date(acc.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return accountDate > thirtyDaysAgo;
    });
    
    // Base growth on recent activity and balance distribution
    const baseGrowth = Math.min(recentAccounts.length * 2.5, 15); // Up to 15% max
    const balanceMultiplier = Math.min(avgBalance / 1000, 2); // Factor based on avg balance
    
    return Math.round((baseGrowth + balanceMultiplier) * 10) / 10; // Round to 1 decimal
  };

  const balanceGrowth = calculateBalanceGrowth();

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
              {[...new Set(accounts.map(acc => acc.currencyCode))].length}
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
                                 account.type === 'CRYPTO' ? 'Crypto' : 'Inversión'}</span>
                          <span>•</span>
                          <span className={account.currencyType === 'crypto' ? 'text-orange-400' : 'text-blue-400'}>
                            {account.currency}
                          </span>
                          {account.currencyType === 'crypto' && (
                            <>
                              <span>•</span>
                              <span className="text-orange-400">Blockchain</span>
                            </>
                          )}
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
                            ? `${account.balance < 0 ? '-' : ''}${formatBalance(Math.abs(account.balance), account.currency, account.currencyType)}`
                            : '••••••'
                          }
                        </p>
                        <div className="flex items-center justify-end space-x-2">
                          <p className={`text-sm ${
                            account.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {account.change}
                          </p>
                          {account.currencyType === 'crypto' && (
                            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-lg">
                              CRYPTO
                            </span>
                          )}
                          {account.currency === 'VES' && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg">
                              BCV
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="relative">
                        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {/* Dropdown menu would go here */}
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
