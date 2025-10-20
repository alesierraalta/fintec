'use client';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Car, Film, Zap, Heart, Package } from 'lucide-react';
import { useOptimizedTransactions } from '@/hooks/use-optimized-data';

import { useCurrencyConverter } from '@/hooks/use-currency-converter';

function SpendingChartComponent() {
  const { expenseTransactions, categories, loading } = useOptimizedTransactions();
  const { convert } = useCurrencyConverter();
  const [data, setData] = useState<any[]>([]);

  // Función memoizada para obtener colores por categoría - Paleta Minimalista
  const getCategoryColor = useCallback((categoryName: string) => {
    const colors = {
      'Alimentación': '#0ea5e9',    // Primary Blue
      'Transporte': '#525252',     // Dark Gray
      'Entretenimiento': '#737373', // Medium Gray
      'Salud': '#0284c7',          // Darker Blue
      'Educación': '#404040',      // Darker Gray
      'Hogar': '#38bdf8',          // Light Blue
      'Ropa': '#a3a3a3',          // Light Gray
      'Otros': '#262626'           // Very Dark Gray
    };
    
    const lowerName = categoryName.toLowerCase();
    for (const [key, color] of Object.entries(colors)) {
      if (lowerName.includes(key.toLowerCase())) {
        return color;
      }
    }
    return colors.Otros;
  }, []);
  
  // Función memoizada para obtener iconos por categoría
  const getCategoryIcon = useCallback((categoryName: string) => {
    const icons = {
      'Alimentación': ShoppingCart,
      'Transporte': Car,
      'Entretenimiento': Film,
      'Salud': Heart,
      'Educación': Package,
      'Hogar': Zap,
      'Ropa': Package,
      'Otros': DollarSign
    };
    
    const lowerName = categoryName.toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
      if (lowerName.includes(key.toLowerCase())) {
        return icon;
      }
    }
    return icons.Otros;
  }, []);

  // Memoized total spending calculation
  const totalSpending = useMemo(() => {
    return expenseTransactions.reduce((sum, transaction) => {
      return sum + convert(Math.abs(transaction.amountMinor), transaction.currencyCode, 'USD');
    }, 0);
  }, [expenseTransactions, convert]);

  // Memoized spending data by category
  const spendingData = useMemo(() => {
    if (expenseTransactions.length === 0) return [];
    
    // Agrupar gastos por categoría
    const categoryMap = new Map();
    
    expenseTransactions.forEach(expense => {
      const category = categories.find(c => c.id === expense.categoryId);
      const categoryName = category?.name || 'Sin categoría';
      const amount = convert(Math.abs(expense.amountMinor), expense.currencyCode, 'USD');
      
      if (categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, categoryMap.get(categoryName) + amount);
      } else {
        categoryMap.set(categoryName, amount);
      }
    });
    
    // Convertir a array y ordenar por monto
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalSpending > 0 ? Math.round((value / totalSpending) * 100) : 0,
        color: getCategoryColor(name),
        icon: getCategoryIcon(name)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Mostrar máximo 8 categorías
  }, [expenseTransactions, categories, totalSpending, getCategoryColor, getCategoryIcon, convert]);

  // Update data when spendingData changes
  useEffect(() => {
    setData(spendingData);
  }, [spendingData]);
  if (data.length === 0) {
    return (
      <div className="text-center py-12 bg-card/30 backdrop-blur-sm rounded-3xl border border-border/20">
        <div className="bg-muted/50 backdrop-blur-sm rounded-2xl p-4 w-fit mx-auto mb-4 border border-border/20">
          <Package className="h-12 w-12 text-muted-foreground mx-auto" />
        </div>
        <h3 className="text-ios-body font-semibold text-foreground mb-2">Sin gastos registrados</h3>
        <p className="text-ios-caption text-muted-foreground">Cuando tengas gastos, aparecerán aquí organizados por categoría.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* iOS-style Stats Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-4 border border-border/20 flex-1 mr-4">
          <p className="text-ios-caption text-muted-foreground">Total gastado</p>
          <p className="text-ios-title font-bold text-foreground">${totalSpending.toLocaleString()}</p>
        </div>
        <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-4 border border-border/20 flex-1">
          <p className="text-ios-caption text-muted-foreground">Categorías</p>
          <p className="text-ios-title font-bold text-foreground">{data.length}</p>
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
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '1rem',
                  color: 'hsl(var(--foreground))',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  backdropFilter: 'blur(16px)'
                }}
                formatter={(value) => [`$${value.toLocaleString()}`, 'Gasto']}
                labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* iOS-style Center Stats */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-card/80 backdrop-blur-xl rounded-2xl p-4 border border-border/20 shadow-ios-sm">
            <div className="bg-primary/10 rounded-xl p-2 w-fit mx-auto mb-2 border border-primary/20">
              <DollarSign className="h-6 w-6 text-primary mx-auto" />
            </div>
            <p className="text-ios-title font-bold text-foreground">${totalSpending.toLocaleString()}</p>
            <p className="text-ios-caption text-muted-foreground">Total</p>
          </div>
        </div>
      </div>

      {/* Legend with icons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.name} className="flex items-center justify-between p-4 bg-card/60 backdrop-blur-sm rounded-2xl border border-border/20 hover:bg-card/80 transition-ios hover:scale-[1.02] hover:shadow-ios-md">
              <div className="flex items-center space-x-3">
                <div 
                  className="p-2.5 rounded-xl border backdrop-blur-sm" 
                  style={{ backgroundColor: `${item.color}15`, borderColor: `${item.color}30` }}
                >
                  <Icon className="h-4 w-4" style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-ios-body font-medium text-foreground">{item.name}</p>
                  <p className="text-ios-caption text-muted-foreground">{item.percentage}%</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-ios-body font-semibold text-foreground">${item.value.toLocaleString()}</p>
                <div className="flex items-center justify-end space-x-1.5">
                  <div 
                    className="w-2 h-2 rounded-full shadow-sm" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-ios-caption text-muted-foreground">{item.percentage}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* iOS-style Summary Stats */}
      <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/20">
        <div className="text-center bg-primary/5 backdrop-blur-sm rounded-2xl p-3 border border-primary/10">
          <p className="text-ios-body font-bold text-primary">{data.length}</p>
          <p className="text-ios-caption text-muted-foreground">Categorías activas</p>
        </div>
        <div className="text-center bg-neutral-500/5 dark:bg-neutral-400/5 backdrop-blur-sm rounded-2xl p-3 border border-neutral-500/10 dark:border-neutral-400/10">
          <p className="text-ios-body font-bold text-neutral-600 dark:text-neutral-400">${data.length > 0 ? (totalSpending / data.length).toLocaleString() : '0'}</p>
          <p className="text-ios-caption text-muted-foreground">Promedio por categoría</p>
        </div>
      </div>
    </div>
  );
}

export const SpendingChart = memo(SpendingChartComponent);
