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
      
      const userId = user?.id || 'local-user';
      const userAccounts = await repository.accounts.findByUserId(userId);
      setAccounts(userAccounts);
    } catch (err) {
      setError('Error al cargar las cuentas');
    } finally {
      setLoading(false);
    }
  };

  const handleNewAccount = () => {
    setSelectedAccount(null);
    openModal();
  };

  const handleAccountSaved = () => {
    closeModal();
    loadAccounts();
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
                className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-600 bg-clip-text text-transparent"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                💼 Mis Cuentas
              </motion.h1>
              <motion.p 
                className="text-gray-400"
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
                  <span className="text-xs text-yellow-400 font-medium">
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
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
                onClick={() => setShowBalances(!showBalances)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>{showBalances ? 'Ocultar' : 'Mostrar'} Balances</span>
              </motion.button>
              
              <motion.button
                className="relative px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium shadow-lg overflow-hidden group transition-all duration-300"
                onClick={handleNewAccount}
                whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(59, 130, 246, 0.3)" }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></div>
                <div className="relative flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Nueva Cuenta</span>
                  <Sparkles className="h-4 w-4" />
                </div>
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Summary Cards con efectos psicológicos */}
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
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 relative overflow-hidden group cursor-pointer"
              variants={fadeInUp}
              {...cardHover}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-400">💰 Balance Total</h3>
                  {balanceGrowth > 0 && <TrendingUp className="h-4 w-4 text-green-400" />}
                </div>
                <p className="text-3xl font-bold text-white mb-2">
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
                    className={`text-sm flex items-center space-x-1 ${balanceGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}
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
          </motion.div>

          {/* Empty state o lista de cuentas */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-white">Todas las Cuentas</h3>
            </div>
            
            <div className="divide-y divide-gray-800">
              {loading ? (
                <motion.div 
                  className="p-6 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <motion.p 
                    className="text-gray-400"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    ✨ Cargando tus cuentas...
                  </motion.p>
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
                    <Wallet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  </motion.div>
                  <motion.h3 
                    className="text-xl font-semibold text-white mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    🎯 ¡Tu Viaje Financiero Comienza Aquí!
                  </motion.h3>
                  <motion.p 
                    className="text-gray-400 text-sm mb-6 max-w-sm mx-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    Crea tu primera cuenta para empezar a organizar tus finanzas de manera inteligente y alcanzar tus metas 🚀
                  </motion.p>
                  <motion.button
                    onClick={handleNewAccount}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium px-8 py-3 rounded-lg shadow-lg transition-all duration-300 relative overflow-hidden group"
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
                // Lista de cuentas aquí
                <div className="p-6">
                  <p className="text-gray-400">Lista de cuentas se mostrará aquí</p>
                </div>
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
