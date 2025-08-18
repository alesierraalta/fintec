'use client';

import { useState } from 'react';
import { Button, Input, Select, Modal } from '@/components/ui';
import { AccountType } from '@/types';
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
  account?: any; // For editing
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
  { value: 'GBP', label: 'GBP - Libra Esterlina' },
  { value: 'JPY', label: 'JPY - Yen Japonés' },
  { value: 'CAD', label: 'CAD - Dólar Canadiense' },
  { value: 'AUD', label: 'AUD - Dólar Australiano' },
  { value: 'MXN', label: 'MXN - Peso Mexicano' },
  { value: 'BRL', label: 'BRL - Real Brasileño' },
];

export function AccountForm({ isOpen, onClose, account }: AccountFormProps) {
  const [formData, setFormData] = useState({
    name: account?.name || '',
    type: account?.type || 'BANK',
    currencyCode: account?.currencyCode || 'USD',
    balance: account?.balance || '',
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simular guardado
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Account data:', formData);
    setLoading(false);
    onClose();
    
    // Reset form
    if (!account) {
      setFormData({
        name: '',
        type: 'BANK',
        currencyCode: 'USD',
        balance: '',
      });
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
            icon={<DollarSign className="h-4 w-4" />}
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
                {formData.balance && ` • $${formData.balance}`}
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
