import { useState, useEffect } from 'react';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';
import { 
  ArrowDownLeft, ArrowUpRight, Repeat, ShoppingCart, Car, Coffee, 
  Briefcase, CreditCard, Wallet, TrendingUp, Calendar, MapPin
} from 'lucide-react';

export function RecentTransactions() {
  const repository = useRepository();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    const loadTransactions = async () => {
      if (!user) return;
      try {
        const allTransactions = await repository.transactions.findAll();
        setTransactions(allTransactions.slice(0, 5)); // Solo los últimos 5
      } catch (error) {
        setTransactions([]);
      }
    };
    loadTransactions();
  }, [user, repository]);

  const formatAmount = (amount: number) => {
    const formatted = Math.abs(amount).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return amount > 0 ? `+$${formatted}` : `-$${formatted}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  const getTypeInfo = (type: string, amount: number) => {
    switch (type) {
      case 'income':
        return {
          icon: <ArrowDownLeft className="h-4 w-4" />,
          iconColor: 'text-green-600',
          amountColor: 'text-green-600',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20',
          label: 'Ingreso'
        };
      case 'expense':
        return {
          icon: <ArrowUpRight className="h-4 w-4" />,
          iconColor: 'text-red-600',
          amountColor: 'text-red-600',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          label: 'Gasto'
        };
      case 'transfer':
        return {
          icon: <Repeat className="h-4 w-4" />,
          iconColor: 'text-blue-600',
          amountColor: 'text-blue-600',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
          label: 'Transferencia'
        };
      default:
        return {
          icon: <ArrowUpRight className="h-4 w-4" />,
          iconColor: 'text-muted-foreground',
          amountColor: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          borderColor: 'border-border/20',
          label: 'Transacción'
        };
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-muted/20 rounded-full mx-auto mb-6 flex items-center justify-center backdrop-blur-sm">
          <Wallet className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-ios-headline font-medium text-foreground mb-3">Sin movimientos</h3>
        <p className="text-ios-body text-muted-foreground">Los registros aparecerán aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {transactions.map((transaction, index) => {
        const amount = (transaction.amountMinor || 0) / 100;
        const typeInfo = getTypeInfo(transaction.type, amount);

        return (
          <div 
            key={transaction.id} 
            className="group p-4 hover:bg-muted/20 transition-ios rounded-xl border-b border-border/10 last:border-b-0 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              {/* Left side - Transaction info */}
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                {/* iOS-style icon */}
                <div className={`p-2 rounded-lg ${typeInfo.bgColor} border ${typeInfo.borderColor} backdrop-blur-sm`}>
                  <div className={typeInfo.iconColor}>
                    {typeInfo.icon}
                  </div>
                </div>

                {/* Transaction details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-1">
                    <h4 className="text-ios-body font-medium text-foreground truncate">
                      {transaction.description || 'Transacción'}
                    </h4>
                    {transaction.pending && (
                      <span className="text-ios-caption text-orange-600 bg-orange-500/10 px-2 py-0.5 rounded-full">
                        Pendiente
                      </span>
                    )}
                  </div>
                  <p className="text-ios-caption text-muted-foreground">
                    {typeInfo.label} • {formatDate(transaction.date || new Date().toISOString())}
                  </p>
                </div>
              </div>

              {/* Right side - Amount */}
              <div className="text-right">
                <div className={`text-ios-body font-semibold ${typeInfo.amountColor}`}>
                  {formatAmount(amount)}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* iOS-style view all button */}
      <div className="pt-6 border-t border-border/10">
        <button className="w-full p-3 text-center text-ios-body text-primary hover:text-primary/80 font-medium transition-ios bg-primary/5 hover:bg-primary/10 rounded-xl backdrop-blur-sm">
          Ver todos los movimientos
        </button>
      </div>
    </div>
  );
}