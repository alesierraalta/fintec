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
    <div className="space-y-6">
      {/* iOS-style Header */}
      <div className="text-center">
        <p className="text-ios-caption font-medium tracking-wide text-muted-foreground uppercase mb-2">Cuentas</p>
        <h3 className="text-ios-title font-semibold text-foreground">Resumen General</h3>
      </div>
      
      <div className="space-y-3">
        {accounts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-muted/20 rounded-full mx-auto mb-6 flex items-center justify-center backdrop-blur-sm">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-ios-headline font-medium text-foreground mb-3">Sin cuentas registradas</h3>
            <p className="text-ios-body text-muted-foreground mb-6">Configura tu primera cuenta para comenzar</p>
            <button className="text-ios-body text-primary font-medium bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-xl transition-ios backdrop-blur-sm">
              Crear cuenta
            </button>
          </div>
        ) : (
          accounts.map((account) => {
            const getAccountColor = (type: string) => {
              switch (type) {
                case 'CARD':
                  return {
                    bg: 'bg-blue-500/10',
                    border: 'border-blue-500/20',
                    icon: 'text-blue-600'
                  };
                case 'CASH':
                  return {
                    bg: 'bg-green-500/10',
                    border: 'border-green-500/20',
                    icon: 'text-green-600'
                  };
                default:
                  return {
                    bg: 'bg-purple-500/10',
                    border: 'border-purple-500/20',
                    icon: 'text-purple-600'
                  };
              }
            };
            const colors = getAccountColor(account.type);
            
            return (
              <div key={account.id} className="flex items-center justify-between p-4 bg-card/40 rounded-2xl border border-border/15 backdrop-blur-xl hover:bg-card/60 transition-ios shadow-ios-sm hover:shadow-ios-md hover:scale-[1.01]">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl ${colors.bg} border ${colors.border} backdrop-blur-sm shadow-ios-xs`}>
                    <account.icon className={`h-5 w-5 ${colors.icon}`} />
                  </div>
                  <div>
                    <p className="text-ios-body font-semibold text-foreground mb-0.5">{account.name}</p>
                    <p className="text-ios-caption text-muted-foreground">{account.type}</p>
                    {!account.active && (
                      <span className="text-ios-caption text-orange-600 bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20 backdrop-blur-sm mt-1 inline-block">Inactiva</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-ios-body font-bold text-foreground">{account.balance}</p>
                  <div className="flex items-center justify-end mt-1">
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                    <p className="text-ios-caption text-green-600 font-medium">
                      {account.change}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* iOS-style Total Balance */}
      <div className="pt-6 border-t border-border/10">
        <div className="text-center bg-gradient-to-br from-blue-500/8 to-purple-500/8 rounded-2xl p-6 backdrop-blur-xl border border-blue-500/15 shadow-ios-sm">
          <p className="text-ios-caption font-semibold uppercase tracking-wide text-muted-foreground mb-3">Balance Total</p>
          <p className="text-ios-large-title font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">${totalBalance.toFixed(2)}</p>
          <div className="flex items-center justify-center mt-2">
            <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
            <p className="text-ios-caption text-green-600 font-medium">+2.5% este mes</p>
          </div>
        </div>
      </div>
    </div>
  );
}
