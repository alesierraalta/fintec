'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { AccountForm } from '@/components/forms/account-form';
import { Button } from '@/components/ui';
import { useModal } from '@/hooks';
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
import { CurrencySelector } from '@/components/currency/currency-selector';

const mockAccounts = [
  {
    id: '1',
    name: 'Cuenta Principal',
    type: 'BANK',
    balance: 8450.50,
    currency: 'USD',
    currencyType: 'fiat',
    active: true,
    change: '+2.5%',
    changeType: 'positive',
  },
  {
    id: '2',
    name: 'Tarjeta de Crédito',
    type: 'CARD',
    balance: -1250.00,
    currency: 'USD',
    currencyType: 'fiat',
    active: true,
    change: '+15.2%',
    changeType: 'negative',
  },
  {
    id: '3',
    name: 'Cuenta de Ahorros',
    type: 'SAVINGS',
    balance: 5200.00,
    currency: 'USD',
    currencyType: 'fiat',
    active: true,
    change: '+8.1%',
    changeType: 'positive',
  },
  {
    id: '4',
    name: 'Efectivo VES',
    type: 'CASH',
    balance: 1825000.00,
    currency: 'VES',
    currencyType: 'fiat',
    active: true,
    change: '-12.0%',
    changeType: 'negative',
  },
  {
    id: '5',
    name: 'Bitcoin Wallet',
    type: 'CRYPTO',
    balance: 0.25,
    currency: 'BTC',
    currencyType: 'crypto',
    active: true,
    change: '+22.3%',
    changeType: 'positive',
  },
  {
    id: '6',
    name: 'Ethereum Wallet',
    type: 'CRYPTO',
    balance: 4.8,
    currency: 'ETH',
    currencyType: 'crypto',
    active: true,
    change: '-3.1%',
    changeType: 'negative',
  },
  {
    id: '7',
    name: 'USDT Stablecoin',
    type: 'CRYPTO',
    balance: 2500.00,
    currency: 'USDT',
    currencyType: 'crypto',
    active: true,
    change: '+0.1%',
    changeType: 'positive',
  },
];

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
  const [showBalances, setShowBalances] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const handleEditAccount = (account: any) => {
    setSelectedAccount(account);
    openModal();
  };

  const handleNewAccount = () => {
    setSelectedAccount(null);
    openModal();
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

  // Calculate total balance in USD equivalent (mock conversion)
  const totalBalance = mockAccounts.reduce((sum, account) => {
    if (account.currency === 'USD') return sum + account.balance;
    if (account.currency === 'VES') return sum + (account.balance / 36.50); // BCV rate
    if (account.currency === 'BTC') return sum + (account.balance * 43250);
    if (account.currency === 'ETH') return sum + (account.balance * 2650);
    if (account.currency === 'USDT') return sum + account.balance;
    return sum;
  }, 0);

  return (
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
            <p className="text-sm text-green-400 mt-1">+5.2% este mes</p>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Cuentas Activas</h3>
            <p className="text-3xl font-bold text-white">{mockAccounts.filter(acc => acc.active).length}</p>
            <p className="text-sm text-gray-400 mt-1">de {mockAccounts.length} total</p>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Criptomonedas</h3>
            <p className="text-3xl font-bold text-white">
              {mockAccounts.filter(acc => acc.currencyType === 'crypto').length}
            </p>
            <p className="text-sm text-gray-400 mt-1">wallets activos</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Divisas</h3>
            <p className="text-3xl font-bold text-white">
              {[...new Set(mockAccounts.map(acc => acc.currency))].length}
            </p>
            <p className="text-sm text-gray-400 mt-1">diferentes</p>
          </div>
        </div>

        {/* BCV Rates Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <BCVRates />
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Conversión Rápida</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Convertir de:</label>
                <CurrencySelector
                  selectedCurrency="USD"
                  onCurrencySelect={(currency, type) => console.log('From:', currency, type)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Convertir a:</label>
                <CurrencySelector
                  selectedCurrency="VES"
                  onCurrencySelect={(currency, type) => console.log('To:', currency, type)}
                />
              </div>
              <div className="pt-2">
                <p className="text-sm text-gray-400 mb-1">1 USD =</p>
                <p className="text-xl font-bold text-white">Bs. 36.50</p>
              </div>
            </div>
          </div>
        </div>

        {/* Accounts List */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white">Todas las Cuentas</h3>
          </div>
          
          <div className="divide-y divide-gray-800">
            {mockAccounts.map((account) => {
              const Icon = accountIcons[account.type as keyof typeof accountIcons];
              
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
            })}
          </div>
        </div>
      </div>

      <AccountForm
        isOpen={isOpen}
        onClose={closeModal}
        account={selectedAccount}
      />
    </MainLayout>
  );
}
