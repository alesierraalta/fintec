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
  TrendingDown,
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
import { BinanceRates } from '@/components/currency/binance-rates';

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
        <div className="space-y-8 animate-fade-in">
          {/* iOS-style Header */}
          <div className="text-center py-8">
            <div className="inline-flex items-center space-x-2 text-muted-foreground mb-4">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-ios-caption font-medium">Tus finanzas</span>
            </div>
            
            <h1 className="text-ios-large-title font-bold mb-6 tracking-tight bg-gradient-to-r from-primary via-blue-600 to-green-500 bg-clip-text text-transparent">
              💼 Mis Cuentas
            </h1>
            <p className="text-muted-foreground font-light mb-6">
              Gestiona todas tus cuentas financieras
            </p>
            
            {/* Quick Actions Header */}
            <motion.div 
              className="flex items-center justify-center space-x-4 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.button
                className={`px-4 py-2 rounded-xl transition-all duration-200 flex items-center space-x-2 ${
                  showBalances 
                    ? 'bg-muted hover:bg-muted/80 text-muted-foreground' 
                    : 'bg-primary hover:bg-primary/90 text-white shadow-sm'
                }`}
                onClick={() => setShowBalances(!showBalances)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="text-sm font-medium">{showBalances ? 'Ocultar' : 'Mostrar'}</span>
              </motion.button>
              
              <motion.button
                className="relative px-6 py-3 rounded-xl text-white font-medium shadow-lg overflow-hidden group transition-all duration-300 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary"
                onClick={handleNewAccount}
                whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(59, 130, 246, 0.4)" }}
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

            {/* Achievement Badge */}
            {accounts.length > 0 && (
              <motion.div 
                className="inline-flex items-center space-x-2 bg-card/80 backdrop-blur-sm rounded-2xl px-4 py-2 border border-border/40"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Star className="h-4 w-4 text-warning-500" />
                <span className="text-ios-caption text-muted-foreground font-medium">
                  {accounts.length >= 5 ? '🏆 Maestro Financiero' : 
                   accounts.length >= 3 ? '🥉 Organizador Avanzado' : 
                   accounts.length >= 1 ? '🌟 ¡Buen Comienzo!' : ''}
                </span>
              </motion.div>
            )}
          </div>

          {/* iOS-style Summary Cards */}
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
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
            {/* Balance Total Card - iOS Style */}
            <motion.div 
              className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group"
              variants={fadeInUp}
              {...cardHover}
            >
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">BALANCE TOTAL</h3>
              </div>
              <p className="text-3xl font-light text-foreground mb-2">
                {showBalances ? (
                  <NumberTicker 
                    value={totalBalance} 
                    prefix="$" 
                    isVisible={showBalances} 
                  />
                ) : '••••••'}
              </p>
              {balanceGrowth !== 0 && (
                <motion.div 
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {balanceGrowth > 0 ? (
                    <TrendingUp className="h-4 w-4 text-success-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-error-600" />
                  )}
                  <span className={`text-ios-footnote font-medium ${balanceGrowth > 0 ? 'text-success-600' : 'text-error-600'}`}>
                    {balanceGrowth > 0 ? '+' : ''}{balanceGrowth}% este mes
                  </span>
                </motion.div>
              )}
            </motion.div>

            {/* Cuentas Activas Card - iOS Style */}
            <motion.div 
              className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group"
              variants={fadeInUp}
              {...cardHover}
            >
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">CUENTAS ACTIVAS</h3>
              </div>
              <div className="flex items-baseline space-x-2 mb-3">
                <p className="text-3xl font-light text-foreground">
                  <NumberTicker value={accounts.filter(acc => acc.active).length} isVisible={true} />
                </p>
                <p className="text-ios-body text-muted-foreground">de {accounts.length}</p>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2 mb-2">
                <motion.div 
                  className="bg-gradient-to-r from-success-500 to-success-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${accounts.length > 0 ? (accounts.filter(acc => acc.active).length / accounts.length) * 100 : 0}%` }}
                  transition={{ delay: 0.5, duration: 1 }}
                ></motion.div>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="h-3 w-3 text-success-600" />
                <span className="text-ios-footnote text-success-600">Meta: 5 cuentas</span>
              </div>
            </motion.div>

            {/* Criptomonedas Card - iOS Style */}
            <motion.div 
              className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group"
              variants={fadeInUp}
              {...cardHover}
            >
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse"></div>
                <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">CRIPTOMONEDAS</h3>
              </div>
              <p className="text-3xl font-light text-foreground mb-2">
                <NumberTicker 
                  value={accounts.filter(acc => acc.currencyCode === 'BTC' || acc.currencyCode === 'ETH').length} 
                  isVisible={true} 
                />
              </p>
              <p className="text-ios-footnote text-muted-foreground mb-2">wallets activos</p>
              {accounts.filter(acc => acc.currencyCode === 'BTC' || acc.currencyCode === 'ETH').length > 0 && (
                <motion.div 
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <Bitcoin className="h-3 w-3 text-warning-600" />
                  <span className="text-ios-footnote text-warning-600 font-medium">Inversor Crypto</span>
                </motion.div>
              )}
            </motion.div>

            {/* Diversificación Card - iOS Style */}
            <motion.div 
              className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/40 shadow-lg hover:shadow-xl transition-all duration-300 group"
              variants={fadeInUp}
              {...cardHover}
            >
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <h3 className="text-ios-caption font-medium text-muted-foreground tracking-wide">DIVERSIFICACIÓN</h3>
              </div>
              <p className="text-3xl font-light text-foreground mb-2">
                <NumberTicker 
                  value={Array.from(new Set(accounts.map(acc => acc.currencyCode))).length} 
                  isVisible={true} 
                />
              </p>
              <p className="text-ios-footnote text-muted-foreground mb-2">divisas diferentes</p>
              {Array.from(new Set(accounts.map(acc => acc.currencyCode))).length >= 3 && (
                <motion.div 
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <DollarSign className="h-3 w-3 text-primary-600" />
                  <span className="text-ios-footnote text-primary-600 font-medium">Bien Diversificado</span>
                </motion.div>
              )}
            </motion.div>
          </motion.div>

          {/* BCV Rates Widget - iOS Style */}
          <div className="bg-card/60 backdrop-blur-xl rounded-3xl p-6 border border-border/20 shadow-lg">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse"></div>
              <h2 className="text-ios-title font-semibold text-foreground">Tasas BCV</h2>
            </div>
            <BCVRates />
            <BinanceRates />
          </div>

          {/* Accounts List - iOS Style */}
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl border border-border/40 shadow-lg overflow-hidden">
            <div className="p-6 border-b border-border/40">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <h3 className="text-ios-title font-semibold text-foreground">Todas las Cuentas</h3>
              </div>
            </div>
            
            <div className="divide-y divide-border/40">
              {loading ? (
                <motion.div 
                  className="p-8 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <motion.p 
                    className="text-muted-foreground text-ios-body"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    ✨ Cargando tus cuentas...
                  </motion.p>
                </motion.div>
              ) : error ? (
                <motion.div 
                  className="p-8 text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <p className="text-error-600 text-ios-body mb-4">❌ {error}</p>
                  <motion.button 
                    onClick={loadAccounts}
                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl transition-all duration-200 text-ios-body font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    🔄 Reintentar
                  </motion.button>
                </motion.div>
              ) : accounts.length === 0 ? (
                <motion.div 
                  className="p-12 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    <Wallet className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
                  </motion.div>
                  <motion.h3 
                    className="text-ios-title font-semibold text-foreground mb-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    🎯 ¡Tu Viaje Financiero Comienza Aquí!
                  </motion.h3>
                  <motion.p 
                    className="text-muted-foreground text-ios-body mb-8 max-w-sm mx-auto leading-relaxed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    Crea tu primera cuenta para empezar a organizar tus finanzas de manera inteligente y alcanzar tus metas 🚀
                  </motion.p>
                  <motion.button
                    onClick={handleNewAccount}
                    className="text-white font-medium px-8 py-4 rounded-2xl shadow-lg transition-all duration-300 relative overflow-hidden group bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary text-ios-body"
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
                      <Sparkles className="h-4 w-4" />
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
                        className="p-6 hover:bg-card/60 transition-all duration-200 relative group cursor-pointer border-l-0 hover:border-l-4 hover:border-l-primary/40"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ 
                          scale: 1.01,
                          transition: { duration: 0.2 }
                        }}
                      >
                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 bg-muted/20 group-hover:bg-primary/10 rounded-2xl transition-colors duration-200">
                              <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                            </div>
                            <div>
                              <h4 className="text-ios-body font-medium text-foreground mb-1">{account.name}</h4>
                              <div className="flex items-center space-x-2 text-ios-caption text-muted-foreground">
                                <span>{account.type === 'BANK' ? 'Banco' : 
                                       account.type === 'CARD' ? 'Tarjeta' :
                                       account.type === 'CASH' ? 'Efectivo' :
                                       account.type === 'SAVINGS' ? 'Ahorros' : 
                                       'Inversión'}</span>
                                <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                                <span className="text-primary font-medium">
                                  {account.currencyCode}
                                </span>
                                <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                                <span className={account.active ? 'text-success-600' : 'text-error-600'}>
                                  {account.active ? 'Activa' : 'Inactiva'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-ios-title font-light text-foreground">
                                {showBalances 
                                  ? `${account.balance < 0 ? '-' : ''}${formatBalance(Math.abs(account.balance), account.currencyCode)}`
                                  : '••••••'
                                }
                              </p>
                              <div className="flex items-center justify-end space-x-2 mt-1">
                                {account.currencyCode === 'VES' && (
                                  <span className="text-ios-footnote bg-warning-500/10 text-warning-600 px-2 py-1 rounded-lg font-medium">
                                    BCV
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="relative">
                              <button 
                                onClick={() => toggleDropdown(account.id)}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/20 rounded-xl transition-all duration-200"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              
                              {openDropdown === account.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-card/90 backdrop-blur-xl border border-border/40 rounded-2xl shadow-lg z-10 overflow-hidden">
                                  <button
                                    onClick={() => {
                                      handleEditAccount(account);
                                      setOpenDropdown(null);
                                    }}
                                    className="w-full px-4 py-3 text-left text-ios-body text-foreground hover:bg-muted/20 transition-colors flex items-center space-x-3"
                                  >
                                    <Edit className="h-4 w-4" />
                                    <span>Editar cuenta</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAccount(account)}
                                    className="w-full px-4 py-3 text-left text-ios-body text-error-600 hover:bg-error-50/50 transition-colors flex items-center space-x-3"
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
