'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Car, Film, Zap, Heart, Package } from 'lucide-react';
import { useRepository } from '@/providers';
import { useAuth } from '@/hooks/use-auth';

export function SpendingChart() {
  const repository = useRepository();
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [totalSpending, setTotalSpending] = useState(0);

  useEffect(() => {
    const loadSpendingData = async () => {
      if (!user) return;
      try {
        const transactions = await repository.transactions.findAll();
        const expenses = transactions.filter(t => t.type === 'EXPENSE');
        const total = expenses.reduce((sum, t) => sum + (t.amountMinor / 100), 0);
        setTotalSpending(total);
        
        // Simplificado: solo mostrar el total por ahora
        if (total > 0) {
          setData([{
            name: 'Gastos',
            value: total,
            color: '#ef4444',
            icon: ShoppingCart,
            percentage: 100
          }]);
        }
      } catch (error) {
        setData([]);
        setTotalSpending(0);
      }
    };
    loadSpendingData();
  }, [user, repository]);
  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="font-medium text-text-primary mb-2">Sin gastos registrados</h3>
        <p className="text-sm text-text-muted">Cuando tengas gastos, aparecerán aquí organizados por categoría.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-text-primary">¿En Qué Gastas?</h3>
          <p className="text-sm text-text-muted mt-1">Análisis de gastos por categoría</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-text-primary">${totalSpending.toLocaleString()}</p>
          <p className="text-sm text-text-muted">Total este mes</p>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={3}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#252525',
                  border: '1px solid #2a2a2a',
                  borderRadius: '0.75rem',
                  color: '#ffffff',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value) => [`$${value.toLocaleString()}`, 'Gasto']}
                labelStyle={{ color: '#a1a1a1' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Center Stats */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <TrendingUp className="h-8 w-8 text-accent-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-text-primary">{data.length}</p>
            <p className="text-sm text-text-muted">Categorías</p>
          </div>
        </div>
      </div>

      {/* Legend with icons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.name} className="flex items-center justify-between p-3 bg-background-elevated rounded-xl border border-border-primary hover:bg-background-elevated/80 transition-colors">
              <div className="flex items-center space-x-3">
                <div 
                  className="p-2 rounded-lg" 
                  style={{ backgroundColor: `${item.color}20` }}
                >
                  <Icon className="h-4 w-4" style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{item.name}</p>
                  <p className="text-xs text-text-muted">{item.percentage}%</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-text-primary">${item.value.toLocaleString()}</p>
                <div className="flex items-center space-x-1">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-text-muted">{item.percentage}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border-primary">
        <div className="text-center">
          <p className="text-lg font-bold text-success">0%</p>
          <p className="text-xs text-text-muted">vs mes anterior</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-text-primary">{data.length}</p>
          <p className="text-xs text-text-muted">Categorías</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-accent-primary">$0</p>
          <p className="text-xs text-text-muted">Promedio</p>
        </div>
      </div>
    </div>
  );
}
