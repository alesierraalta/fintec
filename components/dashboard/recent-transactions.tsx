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
  const formatAmount = (amountMinor: number) => {
    // Convert from minor units (cents) to major units (dollars)
    const amount = amountMinor / 100;
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
          bgColor: 'bg-success/10',
          iconColor: 'text-success',
          borderColor: 'border-success/20',
          amountColor: 'text-success',
          label: 'Ingreso'
        };
      case 'expense':
        return {
          icon: <ArrowUpRight className="h-4 w-4" />,
          bgColor: 'bg-danger/10',
          iconColor: 'text-danger',
          borderColor: 'border-danger/20',
          amountColor: 'text-danger',
          label: 'Gasto'
        };
      case 'transfer':
        return {
          icon: <Repeat className="h-4 w-4" />,
          bgColor: 'bg-info/10',
          iconColor: 'text-info',
          borderColor: 'border-info/20',
          amountColor: 'text-info',
          label: 'Transferencia'
        };
      default:
        return {
          icon: <ArrowUpRight className="h-4 w-4" />,
          bgColor: 'bg-text-muted/10',
          iconColor: 'text-text-muted',
          borderColor: 'border-text-muted/20',
          amountColor: 'text-text-muted',
          label: 'Transacción'
        };
    }
  };

  const getAccountIcon = (account: string) => {
    if (account.includes('Tarjeta')) return CreditCard;
    if (account.includes('Banco')) return Wallet;
    return Wallet;
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="font-medium text-text-primary mb-2">No hay transacciones</h3>
        <p className="text-sm text-text-muted">Crea tu primera transacción para ver el historial aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-hidden">
      {transactions.map((transaction, index) => {
        const amount = (transaction.amountMinor || 0) / 100;
        const typeInfo = getTypeInfo(transaction.type, amount);
        const AccountIcon = getAccountIcon('Cuenta');
        const CategoryIcon = ShoppingCart;

        return (
          <div 
            key={transaction.id} 
            className={`
              group relative bg-background-elevated border rounded-2xl p-3 sm:p-4 
              hover:bg-background-elevated/80 
              transition-colors duration-200 cursor-pointer overflow-hidden
              ${typeInfo.borderColor}
              ${transaction.pending ? 'opacity-75' : ''}
            `}
          >
            {/* Pending indicator */}
            {transaction.pending && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-warning rounded-full animate-pulse"></div>
              </div>
            )}

            <div className="flex items-start justify-between min-w-0">
              {/* Left side - Transaction info */}
              <div className="flex items-start space-x-3 flex-1 min-w-0 overflow-hidden">
                {/* Main transaction icon */}
                <div className={`
                  p-2 sm:p-3 rounded-2xl border ${typeInfo.bgColor} ${typeInfo.borderColor}
                  group-hover:scale-110 transition-transform duration-200 flex-shrink-0
                `}>
                  <div className={typeInfo.iconColor}>
                    {typeInfo.icon}
                  </div>
                </div>

                {/* Transaction details */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  {/* Main description */}
                  <div className="flex items-start space-x-2 mb-1">
                    <h4 className="font-semibold text-text-primary text-base truncate flex-1 min-w-0">
                      {transaction.description || 'Transacción'}
                    </h4>
                    {transaction.pending && (
                      <span className="text-xs bg-warning/20 text-warning px-2 py-1 rounded-full font-medium flex-shrink-0">
                        Pendiente
                      </span>
                    )}
                  </div>

                  {/* Category and type */}
                  <div className="flex items-center space-x-3 mb-2 overflow-hidden">
                    <div className="flex items-center space-x-1 min-w-0 flex-1">
                      <CategoryIcon className="h-3 w-3 text-text-muted flex-shrink-0" />
                      <span className="text-sm text-text-muted truncate">Categoría</span>
                    </div>
                    <span className="text-xs bg-background-tertiary text-text-muted px-2 py-1 rounded-full flex-shrink-0">
                      {typeInfo.label}
                    </span>
                  </div>

                  {/* Account and location info - Mobile optimized */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-xs text-text-muted overflow-hidden">
                    <div className="flex items-center space-x-1 min-w-0">
                      <AccountIcon className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">Mi Cuenta</span>
                    </div>
                    <div className="flex items-center space-x-1 min-w-0">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">En línea</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Amount and time */}
              <div className="text-right ml-2 sm:ml-4 flex-shrink-0">
                <div className={`text-sm sm:text-lg font-bold ${typeInfo.amountColor} mb-1 truncate`}>
                  {formatAmount(amount)}
                </div>
                <div className="hidden sm:flex items-center justify-end space-x-1 text-xs text-text-muted">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(transaction.date || new Date().toISOString())}</span>
                  <span>•</span>
                  <span>Ahora</span>
                </div>
                {/* Mobile simplified date/time */}
                <div className="sm:hidden text-xs text-text-muted truncate">
                  {formatDate(transaction.date || new Date().toISOString())}
                </div>
              </div>
            </div>

            {/* Hover effect indicator */}
            <div className="absolute inset-0 rounded-2xl bg-accent-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
          </div>
        );
      })}

      {/* View all button */}
      <div className="pt-4">
        <button className="w-full p-3 sm:p-4 bg-background-tertiary hover:bg-background-elevated border border-border-primary rounded-2xl transition-all duration-200 hover:scale-[1.02] group">
          <div className="flex items-center justify-center space-x-2 min-w-0">
            <TrendingUp className="h-4 w-4 text-accent-primary group-hover:scale-110 transition-transform flex-shrink-0" />
            <span className="text-text-primary font-medium truncate">Ver todas las transacciones</span>
          </div>
        </button>
      </div>
    </div>
  );
}
