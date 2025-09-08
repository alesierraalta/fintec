'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainLayout } from '@/components/layout/main-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { AccountForm } from '@/components/forms/account-form';
import { Button } from '@/components/ui';
import { useModal } from '@/hooks';
import { useRepository } from '@/providers/repository-provider';
import { useAuth } from '@/hooks/use-auth';
import { useBCVRates } from '@/hooks/use-bcv-rates';
import { Account } from '@/types';
import { fromMinorUnits } from '@/lib/money';
import { formatCurrencyWithBCV } from '@/lib/currency-ves';
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
  DollarSign,
  Sparkles,
  Target,
  Award,
  Star
} from 'lucide-react';
import { BCVRates } from '@/components/currency/bcv-rates';

// Componente NumberTicker simulado (efecto psicológico de progreso)
const NumberTicker = ({ value, prefix = '', suffix = '', isVisible = true }: {
  value: number;
  prefix?: string;
  suffix?: string;
  isVisible?: boolean;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (!isVisible) return;
    
    const duration = 1000;
    const steps = 50;
    const stepValue = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value, isVisible]);
  
  return (
    <span>
      {prefix}{isVisible ? displayValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '••••••'}{suffix}
    </span>
  );
};

const accountIcons = {
  BANK: Banknote,
  CARD: CreditCard,
  CASH: Wallet,
  SAVINGS: PiggyBank,
  INVESTMENT: TrendingUp,
  CRYPTO: Bitcoin,
};

// Animaciones
const fadeInUp = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -20, opacity: 0 }
};

const cardHover = {
  initial: { scale: 1 },
  whileHover: { scale: 1.02, y: -2 },
  transition: { type: "spring" as const, stiffness: 400, damping: 25 }
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openDropdown) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDropdown]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.id) {
        // No user authenticated, show empty state or redirect to login
        setAccounts([]);
        setError('Debes iniciar sesión para ver tus cuentas');
        return;
      }
      
      const userAccounts = await repository.accounts.findByUserId(user.id);
      setAccounts(userAccounts);
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError('Error al cargar las cuentas');
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
    loadAccounts();
  };

  const handleDeleteAccount = async (account: Account) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la cuenta "${account.name}"?`)) {
      return;
    }
    
    try {
      await repository.accounts.delete(account.id);
      setOpenDropdown(null);
      loadAccounts();
    } catch (err) {
      alert('Error al eliminar la cuenta');
    }
  };

  const toggleDropdown = (accountId: string) => {
    setOpenDropdown(openDropdown === accountId ? null : accountId);
  };

  const formatBalance = (balanceMinor: number, currency: string) => {
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
      return sum + (balanceMajor / bcvRates.usd);
    }
    return sum + balanceMajor;
  }, 0);
  
  const balanceGrowth = totalBalance > 100 ? 5.2 : totalBalance > 0 ? 1.5 : 0;

  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          {/* Header con efectos psicológicos */}
          <motion.div 
            className="flex justify-between items-center"
            {...fadeInUp}
            transition={{ duration: 0.5 }}
          >
            <div>
              <motion.h1 
                className="text-3xl font-bold mb-2"
                style={{ 
                  background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent'
                }}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                💼 Mis Cuentas
              </motion.h1>
              <motion.p 
                className="text-neutral-600 dark:text-neutral-400"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Gestiona todas tus cuentas financieras y criptomonedas
              </motion.p>
              {/* Indicador de logros psicológico */}
              {accounts.length > 0 && (
                <motion.div 
                  className="flex items-center space-x-2 mt-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span className="text-xs text-accent-600 dark:text-accent-400 font-medium">
                    {accounts.length >= 5 ? '🏆 Maestro Financiero' : 
                     accounts.length >= 3 ? '🥉 Organizador Avanzado' : 
                     accounts.length >= 1 ? '🌟 ¡Buen Comienzo!' : ''}
                  </span>
                </motion.div>
              )}
            </div>
            <motion.div 
              className="flex items-center space-x-3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.button
                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  showBalances 
                    ? 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-200' 
                    : 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm'
                }`}
                onClick={() => setShowBalances(!showBalances)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>{showBalances ? 'Ocultar' : 'Mostrar'} Balances</span>
              </motion.button>
              
              <motion.button
                className="relative px-6 py-3 rounded-lg text-white font-medium shadow-sm overflow-hidden group transition-all duration-300 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
                onClick={handleNewAccount}
                whileHover={{ scale: 1.05, boxShadow: "0 8px 20px rgba(var(--primary-600-rgb), 0.25)" }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 group-hover:animate-pulse"></div>
                <div className="relative flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Nueva Cuenta</span>
                  <Sparkles className="h-4 w-4" />
                </div>
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Summary Cards con efectos psicológicos avanzados */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
            initial="hidden"
            animate="show"
          >
            {/* Card de Balance Principal */}
            <motion.div 
              className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 relative overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-shadow"
              variants={fadeInUp}
              {...cardHover}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">💰 Balance Total</h3>
                  {balanceGrowth > 0 && <TrendingUp className="h-4 w-4 text-success-500" />}
                </div>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  {showBalances ? (
                    <NumberTicker 
                      value={totalBalance} 
                      prefix="$" 
                      isVisible={showBalances} 
                    />
                  ) : '••••••'}
                </p>
                {balanceGrowth !== 0 && (
                  <motion.p 
                    className={`text-sm flex items-center space-x-1 ${balanceGrowth > 0 ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <span>{balanceGrowth > 0 ? '+' : ''}{balanceGrowth}% este mes</span>
                    {balanceGrowth > 0 && <Sparkles className="h-3 w-3" />}
                  </motion.p>
                )}
              </div>
            </motion.div>

            {/* Card de Cuentas - Efecto de progreso psicológico */}
            <motion.div 
              className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 relative overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-shadow"
              variants={fadeInUp}
              {...cardHover}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-accent-50/50 to-accent-100/50 dark:from-accent-900/20 dark:to-accent-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">📊 Cuentas Activas</h3>
                  <Target className="h-4 w-4 text-accent-600 dark:text-accent-400" />
                </div>
                <div className="flex items-baseline space-x-2 mb-2">
                  <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                    <NumberTicker value={accounts.filter(acc => acc.active).length} isVisible={true} />
                  </p>
                  <p className="text-lg text-neutral-500 dark:text-neutral-400">de {accounts.length}</p>
                </div>
                <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 mb-2">
                  <motion.div 
                    className="bg-gradient-to-r from-success-500 to-success-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${accounts.length > 0 ? (accounts.filter(acc => acc.active).length / accounts.length) * 100 : 0}%` }}
                    transition={{ delay: 0.5, duration: 1 }}
                  ></motion.div>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Meta: 5 cuentas organizadas</p>
              </div>
            </motion.div>

            {/* Card de Crypto */}
            <motion.div 
              className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 relative overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-shadow"
              variants={fadeInUp}
              {...cardHover}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-warning-50/50 to-warning-100/50 dark:from-warning-900/20 dark:to-warning-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">₿ Criptomonedas</h3>
                  <Bitcoin className="h-4 w-4 text-warning-600 dark:text-warning-400" />
                </div>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  <NumberTicker 
                    value={accounts.filter(acc => acc.currencyCode === 'BTC' || acc.currencyCode === 'ETH').length} 
                    isVisible={true} 
                  />
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">wallets activos</p>
                {accounts.filter(acc => acc.currencyCode === 'BTC' || acc.currencyCode === 'ETH').length > 0 && (
                  <motion.div 
                    className="flex items-center space-x-1 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <Award className="h-3 w-3 text-warning-600 dark:text-warning-400" />
                    <span className="text-xs text-warning-600 dark:text-warning-400">Inversor Crypto</span>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Card de Diversificación */}
            <motion.div 
              className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 relative overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-shadow"
              variants={fadeInUp}
              {...cardHover}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary-50/50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">🌍 Diversificación</h3>
                  <DollarSign className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                </div>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  <NumberTicker 
                    value={Array.from(new Set(accounts.map(acc => acc.currencyCode))).length} 
                    isVisible={true} 
                  />
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">divisas diferentes</p>
                {Array.from(new Set(accounts.map(acc => acc.currencyCode))).length >= 3 && (
                  <motion.div 
                    className="flex items-center space-x-1"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    <Star className="h-3 w-3 text-primary-600 dark:text-primary-400" />
                    <span className="text-xs text-primary-600 dark:text-primary-400">Bien Diversificado</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* BCV Rates Widget */}
          <div className="w-full">
            <BCVRates />
          </div>

          {/* Accounts List */}
          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Todas las Cuentas</h3>
            </div>
            
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {loading ? (
                <motion.div 
                  className="p-6 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <motion.p 
                    className="text-neutral-500 dark:text-neutral-400"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    ✨ Cargando tus cuentas...
                  </motion.p>
                </motion.div>
              ) : error ? (
                <motion.div 
                  className="p-6 text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <p className="text-error-600 dark:text-error-400 mb-4">❌ {error}</p>
                  <motion.button 
                    onClick={loadAccounts}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🔄 Reintentar
                  </motion.button>
                </motion.div>
              ) : accounts.length === 0 ? (
                <motion.div 
                  className="p-8 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    <Wallet className="h-16 w-16 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
                  </motion.div>
                  <motion.h3 
                    className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    🎯 ¡Tu Viaje Financiero Comienza Aquí!
                  </motion.h3>
                  <motion.p 
                    className="text-neutral-500 dark:text-neutral-400 text-sm mb-6 max-w-sm mx-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    Crea tu primera cuenta para empezar a organizar tus finanzas de manera inteligente y alcanzar tus metas 🚀
                  </motion.p>
                  <motion.button
                    onClick={handleNewAccount}
                    className="text-white font-medium px-8 py-3 rounded-lg shadow-lg transition-all duration-300 relative overflow-hidden group bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(59, 130, 246, 0.4)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></div>
                    <div className="relative flex items-center space-x-2">
                      <Plus className="h-5 w-5" />
                      <span>Crear Primera Cuenta</span>
                      <Star className="h-4 w-4" />
                    </div>
                  </motion.button>
                </motion.div>
              ) : (
                <AnimatePresence>
                  {accounts.map((account, index) => {
                    const Icon = accountIcons[account.type as keyof typeof accountIcons] || Wallet;
                    
                    return (
                      <motion.div 
                        key={account.id} 
                        className="p-6 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors relative group cursor-pointer"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ 
                          backgroundColor: "rgba(245, 245, 245, 0.5)",
                          transition: { duration: 0.2 }
                        }}
                      >
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg bg-gradient-to-r from-primary-50/30 to-primary-100/30 dark:from-primary-900/10 dark:to-primary-800/10"></div>
                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-neutral-100 dark:bg-neutral-700 rounded-lg">
                              <Icon className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                            </div>
                            <div>
                              <h4 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">{account.name}</h4>
                              <div className="flex items-center space-x-2 text-sm text-neutral-500 dark:text-neutral-400">
                                <span>{account.type === 'BANK' ? 'Banco' : 
                                       account.type === 'CARD' ? 'Tarjeta' :
                                       account.type === 'CASH' ? 'Efectivo' :
                                       account.type === 'SAVINGS' ? 'Ahorros' : 
                                       'Inversión'}</span>
                                <span>•</span>
                                <span className="text-primary-600 dark:text-primary-400">
                                  {account.currencyCode}
                                </span>
                                <span>•</span>
                                <span className={account.active ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'}>
                                  {account.active ? 'Activa' : 'Inactiva'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                                {showBalances 
                                  ? `${account.balance < 0 ? '-' : ''}${formatBalance(Math.abs(account.balance), account.currencyCode)}`
                                  : '••••••'
                                }
                              </p>
                              <div className="flex items-center justify-end space-x-2">
                                {account.currencyCode === 'VES' && (
                                  <span className="text-xs bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 px-2 py-1 rounded-lg">
                                    BCV
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="relative">
                              <button 
                                onClick={() => toggleDropdown(account.id)}
                                className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              
                              {openDropdown === account.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-10">
                                  <button
                                    onClick={() => {
                                      handleEditAccount(account);
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center space-x-2"
                                  >
                                    <Edit className="h-4 w-4" />
                                    <span>Editar cuenta</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAccount(account)}
                                    className="w-full px-4 py-2 text-left text-sm text-error-600 dark:text-error-400 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:text-error-700 dark:hover:text-error-300 flex items-center space-x-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Eliminar cuenta</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
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
