'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select, Modal } from '@/components/ui';
import { AccountType, Account } from '@/types';
import { useRepository } from '@/providers/repository-provider';
import { useAuth } from '@/hooks/use-auth';
import { Money, toMinorUnits, fromMinorUnits, CURRENCIES } from '@/lib/money';
import {
  Wallet,
  CreditCard,
  Banknote,
  TrendingUp,
  PiggyBank,
  DollarSign,
  Bitcoin
} from 'lucide-react';

interface AccountFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Callback after successful save
  account?: Account | null; // For editing
}

const accountTypes = [
  {
    value: 'BANK',
    label: 'Cuenta Bancaria',
    icon: Banknote,
    description: 'Cuenta corriente o de ahorros',
    color: 'text-blue-500'
  },
  {
    value: 'CARD',
    label: 'Tarjeta de Crédito',
    icon: CreditCard,
    description: 'Tarjeta de crédito o débito',
    color: 'text-purple-500'
  },
  {
    value: 'CASH',
    label: 'Efectivo',
    icon: Wallet,
    description: 'Dinero en efectivo',
    color: 'text-green-500'
  },
  {
    value: 'SAVINGS',
    label: 'Ahorros',
    icon: PiggyBank,
    description: 'Cuenta de ahorros especial',
    color: 'text-pink-500'
  },
  {
    value: 'INVESTMENT',
    label: 'Inversión',
    icon: TrendingUp,
    description: 'Cuenta de inversiones',
    color: 'text-orange-500'
  },
  {
    value: 'CRYPTO',
    label: 'Criptomoneda',
    icon: Bitcoin, // Make sure Bitcoin is imported from lucide-react
    description: 'Billetera digital',
    color: 'text-yellow-500'
  },
];

const currencies = [
  { value: 'USD', label: 'USD - Dólar Americano' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'VES', label: 'VES - Bolívar Venezolano' },
  { value: 'GBP', label: 'GBP - Libra Esterlina' },
  { value: 'JPY', label: 'JPY - Yen Japonés' },
  { value: 'CAD', label: 'CAD - Dólar Canadiense' },
  { value: 'AUD', label: 'AUD - Dólar Australiano' },
  { value: 'MXN', label: 'MXN - Peso Mexicano' },
  { value: 'BRL', label: 'BRL - Real Brasileño' },
  { value: 'BTC', label: 'BTC - Bitcoin' },
  { value: 'ETH', label: 'ETH - Ethereum' },
];

export function AccountForm({ isOpen, onClose, onSuccess, account }: AccountFormProps) {
  const { user } = useAuth();
  const repository = useRepository();

  const [formData, setFormData] = useState({
    name: account?.name || '',
    type: account?.type || 'BANK',
    currencyCode: account?.currencyCode || 'USD',
    balance: account?.balance ? fromMinorUnits(account.balance, account.currencyCode || 'USD').toString() : '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form data when account prop changes
  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        type: account.type || 'BANK',
        currencyCode: account.currencyCode || 'USD',
        balance: account.balance ? fromMinorUnits(account.balance, account.currencyCode || 'USD').toString() : '',
      });
    } else {
      setFormData({
        name: '',
        type: 'BANK',
        currencyCode: 'USD',
        balance: '',
      });
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Usuario no autenticado');
      return;
    }

    setLoading(true);
    setError(null);

    try {

      // Validate form data
      if (!formData.name.trim()) {
        throw new Error('El nombre de la cuenta es requerido');
      }

      // Convert balance from decimal to minor units (cents)
      const balanceDecimal = parseFloat(formData.balance) || 0;
      const balanceMinor = toMinorUnits(balanceDecimal, formData.currencyCode);

      const accountData = {
        name: formData.name.trim(),
        type: formData.type as AccountType,
        currencyCode: formData.currencyCode,
        balance: balanceMinor,
        active: true,
        userId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };


      if (account) {
        // Update existing account
        const updateData = { ...accountData, id: account.id };
        const updatedAccount = await repository.accounts.update(account.id, updateData);
      } else {
        // Create new account
        const createdAccount = await repository.accounts.create(accountData);

        // Verificar que la cuenta se guardó correctamente
        if (!createdAccount || !createdAccount.id) {
          throw new Error('La cuenta se creó pero no se devolvió correctamente');
        }

        // Verificar que la cuenta existe en la base de datos
        const verifyAccount = await repository.accounts.findById(createdAccount.id);
        if (!verifyAccount) {
          throw new Error('La cuenta se creó pero no se puede encontrar en la base de datos');
        }

      }

      // Reset form and close modal
      setFormData({
        name: '',
        type: 'BANK',
        currencyCode: 'USD',
        balance: '',
      });

      onSuccess?.(); // Notify parent to reload accounts FIRST
      onClose(); // Close modal AFTER success callback

    } catch (err) {

      // Proporcionar mensajes de error más específicos
      let errorMessage = 'Error al guardar la cuenta';

      if (err instanceof Error) {
        if (err.message.includes('IndexedDB')) {
          errorMessage = 'Error de base de datos. Intenta recargar la página.';
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectedType = accountTypes.find(t => t.value === formData.type);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={account ? 'Editar Cuenta' : 'Nueva Cuenta'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Account Name */}
        <div>
          <Input
            label="Nombre de la Cuenta"
            placeholder="Ej: Cuenta Principal, Tarjeta Visa..."
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            icon={<Wallet className="h-4 w-4" />}
            required
          />
        </div>

        {/* Account Type */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3 ml-1">
            Tipo de Cuenta
          </label>
          <div className="grid grid-cols-2 gap-3">
            {accountTypes.map((typeOption) => {
              const Icon = typeOption.icon;
              const isSelected = formData.type === typeOption.value;

              return (
                <button
                  key={typeOption.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: typeOption.value as AccountType })}
                  className={`relative p-3 rounded-xl border transition-all duration-200 text-left group overflow-hidden ${isSelected
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border-secondary bg-background-tertiary text-text-secondary hover:border-border-primary hover:bg-background-elevated'
                    }`}
                >
                  <div className="relative z-10 flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-white' : 'bg-background-secondary text-text-muted group-hover:text-text-primary'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{typeOption.label}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Currency & Balance Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Select
              label="Moneda"
              value={formData.currencyCode}
              onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
              options={currencies}
              placeholder="Seleccionar"
              required
            />
          </div>

          <div>
            <Input
              label="Balance Inicial"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              icon={<span className="text-text-muted text-sm font-medium">{CURRENCIES[formData.currencyCode]?.symbol || '$'}</span>}
            />
          </div>
        </div>

        {/* Preview Card */}
        <div className="pt-2">
          <p className="text-xs text-text-muted mb-3 ml-1 uppercase tracking-wider font-semibold">Vista Previa</p>
          <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-gray-900 to-black border border-white/10 shadow-xl">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl"></div>

            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-white/60 text-xs font-medium mb-1 uppercase tracking-wider">
                  {selectedType?.label || 'Cuenta'}
                </p>
                <p className="text-white text-lg font-bold tracking-wide truncate pr-4">
                  {formData.name || 'Nombre de Cuenta'}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10`}>
                {selectedType && <selectedType.icon className="h-6 w-6 text-white" />}
              </div>
            </div>

            <div className="relative z-10 mt-8 flex justify-between items-end">
              <div>
                <p className="text-white/60 text-[10px] mb-0.5">Balance Actual</p>
                <p className="text-2xl font-bold text-white tracking-tight">
                  {CURRENCIES[formData.currencyCode]?.symbol} {formData.balance || '0.00'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-white/80 bg-white/10 px-2 py-1 rounded-md border border-white/5">
                  {formData.currencyCode}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-border-secondary">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="hover:bg-background-tertiary"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={loading}
            className="bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20"
          >
            {loading
              ? (account ? 'Guardando...' : 'Creando...')
              : (account ? 'Guardar Cambios' : 'Crear Cuenta')
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
}
