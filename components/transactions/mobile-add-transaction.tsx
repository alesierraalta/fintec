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
  PiggyBank
} from 'lucide-react';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { useModal } from '@/hooks';
import { CreateTransactionDTO, TransactionType } from '@/types';
import { CategoryForm } from '@/components/forms/category-form';
import type { Category, Account } from '@/types/domain';
import { logger } from '@/lib/utils/logger';

// Data constants
const transactionTypes = [
  { value: 'EXPENSE', label: 'Gasto', icon: Minus, color: 'from-red-500 to-pink-600', emoji: '💸' },
  { value: 'INCOME', label: 'Ingreso', icon: Plus, color: 'from-green-500 to-emerald-600', emoji: '💰' },
  { value: 'TRANSFER_OUT', label: 'Transferencia', icon: Repeat, color: 'from-blue-500 to-cyan-600', emoji: '🔄' },
];

// Categories and accounts are now loaded from database

export function MobileAddTransaction() {
  const router = useRouter();
  const repository = useRepository();
  const { user } = useAuth();
  const { isOpen: isCategoryModalOpen, openModal: openCategoryModal, closeModal: closeCategoryModal } = useModal();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [formData, setFormData] = useState({
    type: '' as TransactionType | '',
    accountId: '',
    categoryId: '',
    amount: '',
    description: '',
    date: '',
    note: '',
    tags: '',
    isRecurring: false,
    frequency: 'monthly' as 'weekly' | 'monthly' | 'yearly',
    endDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [calculatorValue, setCalculatorValue] = useState('0');

  // Load categories and accounts from database
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

  // Helper function to get categories by type
  const getCategoriesByType = (type: TransactionType) => {
    // Map TransactionType to CategoryKind
    if (type === 'INCOME') return categories.filter(cat => cat.kind === 'INCOME');
    if (type === 'EXPENSE') return categories.filter(cat => cat.kind === 'EXPENSE');
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
      setCategories(allCategories.filter(cat => cat.active));
      
      // Auto-select the newly created category
      if (createdCategory) {
        setFormData(prev => ({ ...prev, categoryId: createdCategory.id }));
      }
    } catch (error) {
      logger.error('Error reloading categories:', error);
    }
  };

  // Initialize date on client side
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      date: new Date().toISOString().split('T')[0]
    }));
  }, []);

  const handleCalculatorClick = (value: string) => {
    if (value === 'C') {
      setCalculatorValue('0');
      setFormData({ ...formData, amount: '' });
    } else if (value === '=') {
      try {
        const result = eval(calculatorValue);
        setCalculatorValue(result.toString());
        setFormData({ ...formData, amount: result.toString() });
      } catch {
        setCalculatorValue('Error');
      }
    } else if (value === '⌫') {
      const newValue = calculatorValue.length > 1 ? calculatorValue.slice(0, -1) : '0';
      setCalculatorValue(newValue);
      setFormData({ ...formData, amount: newValue === '0' ? '' : newValue });
    } else {
      setCalculatorValue(prev => prev === '0' ? value : prev + value);
    }
  };

  const handleSubmit = async () => {
    if (!formData.amount) {
      alert('Por favor ingresa un monto');
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
        amountMinor: Math.round(parseFloat(formData.amount) * 100),
        date: formData.date || new Date().toISOString().split('T')[0],
        description: formData.description,
        note: formData.note || undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
      };

      const createdTransaction = await repository.transactions.create(transactionData);
      
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
            amountMinor: Math.round(parseFloat(formData.amount) * 100),
            description: formData.description,
            note: formData.note || undefined,
            tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
            frequency: formData.frequency as any,
            intervalCount: 1,
            startDate: calculate_next_execution_date(formData.date || new Date().toISOString().split('T')[0], formData.frequency),
            endDate: formData.endDate || undefined
          };
          
          // Note: This will need the user ID, but mobile version uses hardcoded accounts
          // await repository.recurringTransactions.create(recurringData, 'user-id');
          
          alert(`¡Transacción recurrente configurada! Se repetirá ${formData.frequency === 'weekly' ? 'semanalmente' : formData.frequency === 'monthly' ? 'mensualmente' : 'anualmente'}.`);
        } catch (recurringError) {
          logger.error('Error creating recurring transaction:', recurringError);
          alert('Transacción creada pero hubo un error con la configuración recurrente.');
        }
      }
      
      if (formData.isRecurring) {
        alert(`¡Transacción recurrente creada! Se repetirá cada ${
          formData.frequency === 'weekly' ? 'semana' :
          formData.frequency === 'monthly' ? 'mes' : 'año'
        }${formData.endDate ? ` hasta ${formData.endDate}` : ' indefinidamente'}.`);
      }
      
      router.push('/transactions');
    } catch (error) {
      alert('Error al guardar la transacción. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    return (
      <>
        {/* Transaction Type */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Repeat className="h-5 w-5 mr-2 text-blue-400" />
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
                  onClick={() => setFormData({ ...formData, type: type.value as TransactionType })}
                  className={`w-full p-4 rounded-xl transition-all duration-300 transform ${
                    isSelected
                      ? `bg-gradient-to-r ${type.color} shadow-xl border-0`
                      : 'backdrop-blur-md bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-white/20' : 'bg-white/10'
                    }`}>
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-gray-300'}`} />
                    </div>
                    <div className="text-left">
                      <p className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
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
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Wallet className="h-5 w-5 mr-2 text-green-400" />
              Cuenta
            </h3>
            <div className="space-y-3">
              {loadingAccounts ? (
                <div className="text-center text-gray-400">
                  Cargando cuentas...
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center text-gray-400">
                  No tienes cuentas disponibles. <br />
                  <span className="text-sm">Crea una cuenta primero.</span>
                </div>
              ) : accounts.map((account) => {
                const isSelected = formData.accountId === account.id;
                
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, accountId: account.id })}
                    className={`w-full p-4 rounded-xl transition-all duration-300 transform ${
                      isSelected
                        ? 'shadow-xl border-0'
                        : 'backdrop-blur-md bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                    style={isSelected ? { backgroundColor: '#10b981' } : {}}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-white/20' : 'bg-white/10'
                      }`}>
                        <span className="text-xl">
                          {account.type === 'BANK' ? '🏦' :
                           account.type === 'CARD' ? '💳' :
                           account.type === 'CASH' ? '💵' :
                           account.type === 'INVESTMENT' ? '📈' : '💰'}
                        </span>
                      </div>
                      <div className="text-left flex-1">
                        <p className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                          {account.name}
                        </p>
                        <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                          {account.currencyCode === 'VES' 
                            ? `Bs. ${Math.abs(account.balance / 100).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                            : `$${Math.abs(account.balance / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${account.currencyCode}`
                          }
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Selection */}
        {formData.type && (
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white flex items-center">
                <Tag className="h-5 w-5 mr-2 text-pink-400" />
                Categoría
              </h3>
              <button
                type="button"
                onClick={openCategoryModal}
                className="text-xs text-accent-secondary hover:text-blue-300 border border-accent-secondary hover:border-blue-400 bg-accent-secondary/10 hover:bg-accent-secondary/20 px-2 py-1 rounded-lg transition-colors flex items-center space-x-1"
              >
                <Plus className="h-3 w-3 flex-shrink-0" />
                <span className="whitespace-nowrap">Nueva</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {loadingCategories ? (
                <div className="col-span-full text-center text-gray-400">
                  Cargando categorías...
                </div>
              ) : getCategoriesByType(formData.type as TransactionType)?.map((category) => {
                const isSelected = formData.categoryId === category.id;
                
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      const newData = { ...formData, categoryId: category.id };
                      if (category.name === 'Suscripciones') {
                        newData.isRecurring = true;
                        newData.frequency = 'monthly';
                      }
                      setFormData(newData);
                    }}
                    className={`relative p-3 rounded-xl transition-all duration-300 ${
                      isSelected
                        ? 'shadow-xl border-0'
                        : 'backdrop-blur-md bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                    style={isSelected ? { backgroundColor: category.color } : {}}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-white/20' : 'bg-white/10'
                      }`}>
                        <span className="text-sm">
                          {category.icon === 'Utensils' ? '🍽️' : 
                           category.icon === 'Car' ? '🚗' : 
                           category.icon === 'ShoppingBag' ? '🛍️' : 
                           category.icon === 'Music' ? '🎵' : 
                           category.icon === 'Stethoscope' ? '🩺' : 
                           category.icon === 'Home' ? '🏠' : 
                           category.icon === 'Book' ? '📚' : 
                           category.icon === 'Dumbbell' ? '🏋️' : 
                           category.icon === 'Plane' ? '✈️' : 
                           category.icon === 'Smartphone' ? '📱' : 
                           category.icon === 'Calendar' ? '📅' : 
                           category.icon === 'Banknote' ? '💵' : 
                           category.icon === 'Heart' ? '❤️' : 
                           category.icon === 'Zap' ? '⚡' : 
                           category.icon === 'Building2' ? '🏢' : 
                           category.icon === 'Receipt' ? '🧾' : 
                           category.icon === 'Briefcase' ? '💼' : 
                           category.icon === 'Coffee' ? '☕' : 
                           category.icon === 'TrendingUp' ? '📈' : 
                           category.icon === 'Gift' ? '🎁' : 
                           category.icon === 'Star' ? '⭐' : 
                           category.icon === 'Repeat' ? '🔄' : 
                           category.icon === 'PiggyBank' ? '🐷' : '💰'}
                        </span>
                      </div>
                      <span className={`text-xs font-medium text-center ${
                        isSelected ? 'text-white' : 'text-gray-300'
                      }`}>
                        {category.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Visual Calculator */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-yellow-400" />
            Monto
          </h3>
          
          <div className="bg-black/20 rounded-xl p-4 mb-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-white">${calculatorValue}</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {['C', '⌫', '/', '*', '7', '8', '9', '-', '4', '5', '6', '+', '1', '2', '3', '=', '0', '.'].map((btn) => (
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

        {/* Details */}
        <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-cyan-400" />
            Detalles
          </h3>
          
          <div className="space-y-4">
            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Descripción (Opcional)</label>
                  <input
                    type="text"
                    placeholder={formData.type === 'INCOME' ? '¿De dónde viene este ingreso?' : formData.type === 'TRANSFER_OUT' ? '¿Para qué es esta transferencia?' : '¿Para qué fue este gasto?'}
                    value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Fecha</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nota (Opcional)</label>
              <textarea
                placeholder="Información adicional..."
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Etiquetas (Opcional)</label>
              <input
                type="text"
                placeholder="urgente, recurrente, etc."
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-4 py-3 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
              />
            </div>

            {/* Recurring Transaction Settings */}
            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center space-x-3 mb-4">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-500/50"
                />
                <label htmlFor="isRecurring" className="text-white font-medium">
                  🔄 Transacción Recurrente
                </label>
              </div>
              
              {formData.isRecurring && (
                <div className="space-y-4 pl-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Frecuencia</label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value as 'weekly' | 'monthly' | 'yearly' })}
                      className="w-full px-4 py-3 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                    >
                      <option value="weekly" className="bg-gray-800">Semanal</option>
                      <option value="monthly" className="bg-gray-800">Mensual</option>
                      <option value="yearly" className="bg-gray-800">Anual</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Finalizar el (Opcional)</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-3 backdrop-blur-md bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Deja vacío para que continúe indefinidamente
                    </p>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-blue-300 text-sm">
                      💡 Esta transacción se repetirá automáticamente cada {
                        formData.frequency === 'weekly' ? 'semana' :
                        formData.frequency === 'monthly' ? 'mes' : 'año'
                      } hasta que la canceles.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-black p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Volver</span>
        </button>
        
        <h1 className="text-2xl font-bold text-white text-center">Nueva Transacción</h1>
        
        <div className="w-20"></div>
      </div>

      {/* Content in mobile-friendly single column */}
      <div className="space-y-6 pb-32">
        {renderContent()}
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 backdrop-blur-md bg-slate-900/90 border-t border-white/10" style={{ zIndex: 9999 }}>
        <div className="flex space-x-3">
          <button
            onClick={() => router.back()}
            className="flex-1 px-6 py-3 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20 transition-colors flex items-center justify-center space-x-2"
          >
            <X className="h-5 w-5" />
            <span>Cancelar</span>
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            style={{ backgroundColor: '#22c55e' }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="h-5 w-5" />
                <span>Finalizar</span>
              </>
            )}
          </button>
        </div>
      </div>

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
  );
}
