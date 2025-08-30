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
  DollarSign
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
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Tipo de Cuenta
          </label>
          <div className="grid grid-cols-1 gap-3">
            {accountTypes.map((typeOption) => {
              const Icon = typeOption.icon;
              const isSelected = formData.type === typeOption.value;
              
              return (
                <button
                  key={typeOption.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: typeOption.value as AccountType })}
                  className={`p-4 rounded-lg border transition-all text-left ${
                    isSelected
                      ? 'border-primary-600 bg-primary-600/10 text-primary-400'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-5 w-5 ${isSelected ? 'text-primary-400' : typeOption.color}`} />
                    <div>
                      <p className="font-medium">{typeOption.label}</p>
                      <p className="text-xs opacity-70">{typeOption.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Currency */}
        <div>
          <Select
            label="Moneda"
            value={formData.currencyCode}
            onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
            options={currencies}
            placeholder="Seleccionar moneda"
            required
          />
        </div>

        {/* Initial Balance */}
        <div>
          <Input
            label="Balance Inicial"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.balance}
            onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
            icon={<span className="text-gray-400 text-sm">{CURRENCIES[formData.currencyCode]?.symbol || formData.currencyCode}</span>}
          />
          <p className="text-xs text-gray-500 mt-1">
            Ingresa el balance actual de esta cuenta (opcional)
          </p>
        </div>

        {/* Preview Card */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-2">Vista previa:</p>
          <div className="flex items-center space-x-3">
            {selectedType && <selectedType.icon className={`h-5 w-5 ${selectedType.color}`} />}
            <div>
              <p className="text-white font-medium">
                {formData.name || 'Nombre de la cuenta'}
              </p>
              <p className="text-sm text-gray-400">
                {selectedType?.label} • {formData.currencyCode}
                {formData.balance && ` • ${CURRENCIES[formData.currencyCode]?.symbol || formData.currencyCode}${parseFloat(formData.balance).toFixed(2)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={loading}
            icon={selectedType?.icon && <selectedType.icon className="h-4 w-4" />}
          >
            {loading 
              ? (account ? 'Actualizando...' : 'Creando...') 
              : (account ? 'Actualizar Cuenta' : 'Crear Cuenta')
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
}
