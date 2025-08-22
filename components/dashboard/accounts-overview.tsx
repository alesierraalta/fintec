import { CreditCard, Wallet, Banknote, TrendingUp } from 'lucide-react';

// Accounts will be loaded from Supabase database
const accounts: any[] = [];

export function AccountsOverview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">Resumen de Cuentas</h3>
        <button className="text-sm text-accent-primary hover:text-accent-secondary">
          Gestionar
        </button>
      </div>
      
      <div className="space-y-3">
        {accounts.map((account) => (
          <div key={account.name} className="flex items-center justify-between p-4 bg-background-elevated rounded-2xl border border-border-primary hover:bg-background-elevated/80 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-background-tertiary rounded-xl border border-border-primary">
                <account.icon className="h-4 w-4 text-accent-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{account.name}</p>
                <p className="text-xs text-text-muted">{account.type}</p>
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
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border-primary">
        <div className="flex justify-between items-center">
          <span className="text-sm text-text-muted">Balance Total</span>
          <span className="text-lg font-bold text-text-primary">$0.00</span>
        </div>
      </div>
    </div>
  );
}
