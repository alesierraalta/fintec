import { useState, useEffect } from 'react';
import { CreditCard, Wallet, Banknote, TrendingUp } from 'lucide-react';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { fromMinorUnits } from '@/lib/money';
import { useBCVRates } from '@/hooks/use-bcv-rates';

export function AccountsOverview() {
  const repository = useRepository();
  const { user } = useAuth();
  const bcvRates = useBCVRates();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    const loadAccounts = async () => {
      if (!user) return;
      try {
        const userAccounts = await repository.accounts.findByUserId(user.id);
        
        // Mapear las cuentas para la UI
        const formattedAccounts = userAccounts.map(account => {
          const balanceMinor = Number(account.balance) || 0;
          const balanceMajor = fromMinorUnits(balanceMinor, account.currencyCode);
          
          return {
            id: account.id,
            name: account.name,
            type: account.type || 'Cuenta',
            balance: `$${balanceMajor.toFixed(2)}`,
                        icon: account.type === 'CARD' ? CreditCard :
                  account.type === 'CASH' ? Banknote : Wallet,
            changeType: balanceMajor >= 0 ? 'positive' : 'negative',
            change: balanceMajor >= 0 ? '+0.0%' : '0.0%',
            active: account.active
          };
        });
        
        setAccounts(formattedAccounts);
        
        // Calcular balance total (con conversión BCV como header)
        const total = userAccounts.reduce((sum, acc) => {
          const balanceMinor = Number(acc.balance) || 0;
          const balanceMajor = fromMinorUnits(balanceMinor, acc.currencyCode);
          
          // Apply BCV conversion for VES currency (same as header)
          if (acc.currencyCode === 'VES') {
            return sum + (balanceMajor / bcvRates.usd);
          }
          return sum + balanceMajor;
        }, 0);
        
        setTotalBalance(total);
        
      } catch (error) {
        setAccounts([]);
        setTotalBalance(0);
      }
    };
    
    loadAccounts();
  }, [user, repository]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">Resumen de Cuentas</h3>
        <button className="text-sm text-accent-primary hover:text-accent-secondary">
          Gestionar
        </button>
      </div>
      
      <div className="space-y-3">
        {accounts.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="font-medium text-text-primary mb-2">Sin cuentas creadas</h3>
            <p className="text-sm text-text-muted mb-4">Crea tu primera cuenta para empezar a gestionar tus finanzas.</p>
            <button className="text-sm text-accent-primary hover:text-accent-secondary">
              Crear Cuenta
            </button>
          </div>
        ) : (
          accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-4 bg-background-elevated rounded-2xl border border-border-primary hover:bg-background-elevated/80 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-background-tertiary rounded-xl border border-border-primary">
                  <account.icon className="h-4 w-4 text-accent-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{account.name}</p>
                  <p className="text-xs text-text-muted">{account.type}</p>
                  {!account.active && (
                    <span className="text-xs text-danger">Inactiva</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-text-primary">{account.balance}</p>
                <p className={`text-xs ${
                  account.changeType === 'positive' ? 'text-success' : 'text-danger'
                }`}>
                  {account.change}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border-primary">
        <div className="flex justify-between items-center">
          <span className="text-sm text-text-muted">Balance Total</span>
          <span className="text-lg font-bold text-text-primary">${totalBalance.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
